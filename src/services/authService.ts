import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

export type AuthSession = {
  session: Session | null;
  user: User | null;
};

export async function getCurrentSession(): Promise<AuthSession> {
  if (!supabase) return { session: null, user: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) return { session: null, user: null };
  return { session: data.session, user: data.session?.user ?? null };
}

export async function signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabaseが設定されていません" };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function onAuthChange(callback: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
