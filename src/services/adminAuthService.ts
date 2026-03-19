import { hasSupabaseConfig, supabase } from "./supabaseClient";

function getSupabaseOrThrow() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
  }

  return supabase;
}

export async function getCurrentUserId(): Promise<string | null> {
  const client = getSupabaseOrThrow();

  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }

  return data.session?.user.id ?? null;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const client = getSupabaseOrThrow();

  const { data, error } = await client
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function ensureAdminSession(): Promise<string> {
  const client = getSupabaseOrThrow();

  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }

  const userId = data.session?.user.id ?? null;
  if (!userId) {
    throw new Error("You must sign in to continue.");
  }

  const admin = await isUserAdmin(userId);
  if (!admin) {
    await client.auth.signOut();
    throw new Error("This account is not in the admin allowlist.");
  }

  return userId;
}