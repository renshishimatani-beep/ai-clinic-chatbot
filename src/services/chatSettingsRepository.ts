import { supabase } from "@/lib/supabase";
import type { ChatSettings } from "@/types";

export async function fetchChatSettingsBySlug(slug: string): Promise<{ data: ChatSettings | null; error: string | null }> {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from("chat_settings")
    .select("settings, clinics!inner(slug, is_active)")
    .eq("clinics.slug", slug)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  return { data: (data.settings as ChatSettings) || null, error: null };
}

export async function fetchChatSettingsById(clinicId: string): Promise<{ data: ChatSettings | null; error: string | null }> {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from("chat_settings")
    .select("settings")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  return { data: (data.settings as ChatSettings) || null, error: null };
}

export async function upsertChatSettings(clinicId: string, settings: ChatSettings): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabaseが設定されていません" };
  const { error } = await supabase
    .from("chat_settings")
    .upsert({ clinic_id: clinicId, settings, updated_at: new Date().toISOString() }, { onConflict: "clinic_id" });
  if (error) return { error: error.message };
  return { error: null };
}
