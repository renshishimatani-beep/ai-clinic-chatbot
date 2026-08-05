import { supabase } from "@/lib/supabase";
import type { FAQ } from "@/types";

export async function fetchFaqsBySlug(slug: string): Promise<{ data: FAQ[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from("faqs")
    .select(`
      id, category, question, answer, keywords, action_type, action_label,
      action_url, is_published, sort_order, updated_at,
      clinics!inner(slug, is_active)
    `)
    .eq("clinics.slug", slug)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) return { data: null, error: error.message };
  if (!data) return { data: [], error: null };
  return { data: data.map(rowToFaq), error: null };
}

export async function fetchFaqsByClinicId(clinicId: string): Promise<{ data: FAQ[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: null };
  const { data, error } = await supabase
    .from("faqs")
    .select(`
      id, category, question, answer, keywords, action_type, action_label,
      action_url, is_published, sort_order, updated_at
    `)
    .eq("clinic_id", clinicId)
    .order("sort_order", { ascending: true });
  if (error) return { data: null, error: error.message };
  if (!data) return { data: [], error: null };
  return { data: data.map(rowToFaq), error: null };
}

export async function upsertFaqs(clinicId: string, faqs: FAQ[]): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabaseが設定されていません" };
  const rows = faqs.map((f, i) => faqToRow(clinicId, f, i));
  const { error } = await supabase.from("faqs").upsert(rows, { onConflict: "id" });
  if (error) return { error: error.message };
  return { error: null };
}

export async function replaceFaqs(clinicId: string, faqs: FAQ[]): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabaseが設定されていません" };

  const { error: delError } = await supabase.from("faqs").delete().eq("clinic_id", clinicId);
  if (delError) return { error: delError.message };

  if (faqs.length === 0) return { error: null };

  const rows = faqs.map((f, i) => ({
    ...faqToRow(clinicId, f, i),
    id: f.id,
  }));
  const { error: insError } = await supabase.from("faqs").insert(rows);
  if (insError) return { error: insError.message };
  return { error: null };
}

function rowToFaq(row: Record<string, unknown>): FAQ {
  return {
    id: (row.id as string) || "",
    category: (row.category as string) || "",
    question: (row.question as string) || "",
    answer: (row.answer as string) || "",
    keywords: (row.keywords as string[]) || [],
    actionType: (row.action_type as FAQ["actionType"]) || "none",
    actionLabel: (row.action_label as string) || undefined,
    actionUrl: (row.action_url as string) || undefined,
    isPublished: (row.is_published as boolean) ?? true,
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
  };
}

function faqToRow(clinicId: string, f: FAQ, sortOrder: number): Record<string, unknown> {
  return {
    clinic_id: clinicId,
    category: f.category,
    question: f.question,
    answer: f.answer,
    keywords: f.keywords,
    action_type: f.actionType,
    action_label: f.actionLabel || null,
    action_url: f.actionUrl || null,
    is_published: f.isPublished,
    sort_order: f.sortOrder ?? sortOrder,
    updated_at: new Date().toISOString(),
  };
}
