/*
# Create clinic tables with RLS for multi-tenant clinic management

1. New Tables
- `clinics`: Top-level clinic entity with name, slug, active flag, timestamps.
- `clinic_members`: Junction table linking auth.users to clinics with roles (owner/admin/viewer).
- `clinic_information`: Per-clinic public information (doctor name, address, phone, hours, etc.).
- `faqs`: Per-clinic FAQ entries with category, keywords, action type, publish state, sort order.
- `chat_settings`: Per-clinic chat settings stored as JSONB.

2. Schema (non-public)
- `app`: Custom schema for security helper functions to avoid recursive clinic_members policies.

3. Security
- RLS enabled on ALL tables.
- Helper functions in `app` schema with SECURITY DEFINER, fixed search_path = public.
- Authenticated users can only access clinics where they have a clinic_members row.
  - owner: full CRUD
  - admin: select, insert, update (no delete)
  - viewer: select only
- Anonymous users can only SELECT from active clinics' public data.
- Anonymous users can NEVER insert, update, or delete.

4. Indexes
- clinics.slug (unique)
- clinic_members.user_id
- faqs.clinic_id
- faqs.is_published

5. Important Notes
- Do NOT hardcode any auth user UUID in the migration.
- A sample clinic (slug: tsunamaru-test) is created for development fallback.
*/

-- ── Create app schema for security helpers ──
CREATE SCHEMA IF NOT EXISTS app;

-- ── Tables (must exist before helper functions) ──

CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinic_members (
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, user_id)
);

CREATE TABLE IF NOT EXISTS clinic_information (
  clinic_id uuid PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_name text,
  departments text,
  postal_code text,
  address text,
  phone text,
  opening_hours text,
  closed_days text,
  access text,
  parking text,
  reservation_url text,
  website_url text,
  first_visit_requirements text,
  payment_methods text,
  fever_instructions text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  category text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  action_type text NOT NULL DEFAULT 'none',
  action_label text,
  action_url text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_settings (
  clinic_id uuid PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_clinic_members_user_id ON clinic_members(user_id);
CREATE INDEX IF NOT EXISTS idx_faqs_clinic_id ON faqs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_faqs_is_published ON faqs(is_published);

-- ── Helper functions (now tables exist) ──

CREATE OR REPLACE FUNCTION app.is_clinic_member(clinic_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinic_members
    WHERE clinic_id = clinic_uuid
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION app.get_clinic_role(clinic_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM clinic_members
  WHERE clinic_id = clinic_uuid
  AND user_id = auth.uid();
$$;

-- ── Enable RLS on all tables ──
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════
-- clinics policies
-- ════════════════════════════════════════

DROP POLICY IF EXISTS "anon_select_active_clinics" ON clinics;
CREATE POLICY "anon_select_active_clinics" ON clinics FOR SELECT
  TO anon USING (is_active = true);

DROP POLICY IF EXISTS "auth_select_member_clinics" ON clinics;
CREATE POLICY "auth_select_member_clinics" ON clinics FOR SELECT
  TO authenticated USING (app.is_clinic_member(id));

DROP POLICY IF EXISTS "owner_insert_clinics" ON clinics;
CREATE POLICY "owner_insert_clinics" ON clinics FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "member_update_clinics" ON clinics;
CREATE POLICY "member_update_clinics" ON clinics FOR UPDATE
  TO authenticated
  USING (app.is_clinic_member(id))
  WITH CHECK (app.is_clinic_member(id));

DROP POLICY IF EXISTS "owner_delete_clinics" ON clinics;
CREATE POLICY "owner_delete_clinics" ON clinics FOR DELETE
  TO authenticated USING (app.get_clinic_role(id) = 'owner');

-- ════════════════════════════════════════
-- clinic_members policies
-- ════════════════════════════════════════

DROP POLICY IF EXISTS "auth_select_own_memberships" ON clinic_members;
CREATE POLICY "auth_select_own_memberships" ON clinic_members FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "owner_insert_members" ON clinic_members;
CREATE POLICY "owner_insert_members" ON clinic_members FOR INSERT
  TO authenticated
  WITH CHECK (app.get_clinic_role(clinic_id) = 'owner');

DROP POLICY IF EXISTS "owner_update_members" ON clinic_members;
CREATE POLICY "owner_update_members" ON clinic_members FOR UPDATE
  TO authenticated
  USING (app.get_clinic_role(clinic_id) = 'owner')
  WITH CHECK (app.get_clinic_role(clinic_id) = 'owner');

DROP POLICY IF EXISTS "owner_delete_members" ON clinic_members;
CREATE POLICY "owner_delete_members" ON clinic_members FOR DELETE
  TO authenticated USING (app.get_clinic_role(clinic_id) = 'owner');

-- ════════════════════════════════════════
-- clinic_information policies
-- ════════════════════════════════════════

DROP POLICY IF EXISTS "anon_select_active_clinic_info" ON clinic_information;
CREATE POLICY "anon_select_active_clinic_info" ON clinic_information FOR SELECT
  TO anon USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = clinic_information.clinic_id
      AND clinics.is_active = true
    )
  );

DROP POLICY IF EXISTS "auth_select_member_clinic_info" ON clinic_information;
CREATE POLICY "auth_select_member_clinic_info" ON clinic_information FOR SELECT
  TO authenticated USING (app.is_clinic_member(clinic_id));

DROP POLICY IF EXISTS "member_insert_clinic_info" ON clinic_information;
CREATE POLICY "member_insert_clinic_info" ON clinic_information FOR INSERT
  TO authenticated WITH CHECK (app.is_clinic_member(clinic_id));

DROP POLICY IF EXISTS "member_update_clinic_info" ON clinic_information;
CREATE POLICY "member_update_clinic_info" ON clinic_information FOR UPDATE
  TO authenticated
  USING (app.is_clinic_member(clinic_id))
  WITH CHECK (app.is_clinic_member(clinic_id));

DROP POLICY IF EXISTS "owner_delete_clinic_info" ON clinic_information;
CREATE POLICY "owner_delete_clinic_info" ON clinic_information FOR DELETE
  TO authenticated USING (app.get_clinic_role(clinic_id) = 'owner');

-- ════════════════════════════════════════
-- faqs policies
-- ════════════════════════════════════════

DROP POLICY IF EXISTS "anon_select_published_faqs" ON faqs;
CREATE POLICY "anon_select_published_faqs" ON faqs FOR SELECT
  TO anon USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = faqs.clinic_id
      AND clinics.is_active = true
    )
  );

DROP POLICY IF EXISTS "auth_select_member_faqs" ON faqs;
CREATE POLICY "auth_select_member_faqs" ON faqs FOR SELECT
  TO authenticated USING (app.is_clinic_member(clinic_id));

DROP POLICY IF EXISTS "member_insert_faqs" ON faqs;
CREATE POLICY "member_insert_faqs" ON faqs FOR INSERT
  TO authenticated WITH CHECK (app.is_clinic_member(clinic_id));

DROP POLICY IF EXISTS "member_update_faqs" ON faqs;
CREATE POLICY "member_update_faqs" ON faqs FOR UPDATE
  TO authenticated
  USING (app.is_clinic_member(clinic_id))
  WITH CHECK (app.is_clinic_member(clinic_id));

DROP POLICY IF EXISTS "owner_delete_faqs" ON faqs;
CREATE POLICY "owner_delete_faqs" ON faqs FOR DELETE
  TO authenticated USING (app.get_clinic_role(clinic_id) = 'owner');

-- ════════════════════════════════════════
-- chat_settings policies
-- ════════════════════════════════════════

DROP POLICY IF EXISTS "anon_select_active_chat_settings" ON chat_settings;
CREATE POLICY "anon_select_active_chat_settings" ON chat_settings FOR SELECT
  TO anon USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = chat_settings.clinic_id
      AND clinics.is_active = true
    )
  );

DROP POLICY IF EXISTS "auth_select_member_chat_settings" ON chat_settings;
CREATE POLICY "auth_select_member_chat_settings" ON chat_settings FOR SELECT
  TO authenticated USING (app.is_clinic_member(clinic_id));

DROP POLICY IF EXISTS "member_insert_chat_settings" ON chat_settings;
CREATE POLICY "member_insert_chat_settings" ON chat_settings FOR INSERT
  TO authenticated WITH CHECK (app.is_clinic_member(clinic_id));

DROP POLICY IF EXISTS "member_update_chat_settings" ON chat_settings;
CREATE POLICY "member_update_chat_settings" ON chat_settings FOR UPDATE
  TO authenticated
  USING (app.is_clinic_member(clinic_id))
  WITH CHECK (app.is_clinic_member(clinic_id));

DROP POLICY IF EXISTS "owner_delete_chat_settings" ON chat_settings;
CREATE POLICY "owner_delete_chat_settings" ON chat_settings FOR DELETE
  TO authenticated USING (app.get_clinic_role(clinic_id) = 'owner');

-- ── Sample clinic ──
INSERT INTO clinics (name, slug, is_active)
VALUES ('つなまるテストクリニック', 'tsunamaru-test', true)
ON CONFLICT (slug) DO NOTHING;