import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { ClinicInfo } from "@/types";

export type Clinic = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export async function fetchMemberClinics(): Promise<{ data: Clinic[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase.from("clinics").select("id, name, slug, is_active");
  if (error) return { data: null, error: error.message };
  return { data: data as Clinic[], error: null };
}

export async function fetchClinicInfoBySlug(slug: string): Promise<{ data: ClinicInfo | null; error: string | null }> {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from("clinic_information")
    .select(`
      doctor_name, departments, address, phone, opening_hours, closed_days,
      access, parking, reservation_url, website_url, first_visit_requirements,
      payment_methods, fever_instructions,
      clinics!inner(slug, is_active)
    `)
    .eq("clinics.slug", slug)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  return { data: rowToClinicInfo(data, slug), error: null };
}

export async function fetchClinicInfoById(clinicId: string): Promise<{ data: ClinicInfo | null; error: string | null }> {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from("clinic_information")
    .select(`
      doctor_name, departments, address, phone, opening_hours, closed_days,
      access, parking, reservation_url, website_url, first_visit_requirements,
      payment_methods, fever_instructions
    `)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  return { data: rowToClinicInfo(data, ""), error: null };
}

export async function upsertClinicInfo(clinicId: string, info: ClinicInfo): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabaseが設定されていません" };
  const row = clinicInfoToRow(info);
  const { error } = await supabase
    .from("clinic_information")
    .upsert({ clinic_id: clinicId, ...row, updated_at: new Date().toISOString() }, { onConflict: "clinic_id" });
  if (error) return { error: error.message };
  return { error: null };
}

export async function fetchClinicIdBySlug(slug: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("clinics")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}

function rowToClinicInfo(row: Record<string, unknown>, slug: string): ClinicInfo {
  const clinics = row.clinics as Record<string, unknown> | undefined;
  return {
    clinicName: (clinics?.name as string) || slug || "",
    doctorName: (row.doctor_name as string) || "",
    departments: (row.departments as string) || "",
    postalCode: "",
    address: (row.address as string) || "",
    phone: (row.phone as string) || "",
    openingHours: (row.opening_hours as string) || "",
    receptionHours: "",
    closedDays: (row.closed_days as string) || "",
    access: (row.access as string) || "",
    parking: (row.parking as string) || "",
    reservationUrl: (row.reservation_url as string) || "",
    websiteUrl: (row.website_url as string) || "",
    firstVisitRequirements: (row.first_visit_requirements as string) || "",
    paymentMethods: (row.payment_methods as string) || "",
    medicalServices: "",
    examinations: "",
    healthCheckups: "",
    vaccinations: "",
    feverInstructions: (row.fever_instructions as string) || "",
  };
}

function clinicInfoToRow(info: ClinicInfo): Record<string, string> {
  return {
    doctor_name: info.doctorName,
    departments: info.departments,
    address: info.address,
    phone: info.phone,
    opening_hours: info.openingHours,
    closed_days: info.closedDays,
    access: info.access,
    parking: info.parking,
    reservation_url: info.reservationUrl,
    website_url: info.websiteUrl,
    first_visit_requirements: info.firstVisitRequirements,
    payment_methods: info.paymentMethods,
    fever_instructions: info.feverInstructions,
  };
}

export { isSupabaseConfigured };
