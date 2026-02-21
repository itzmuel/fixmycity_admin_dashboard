import type { Issue, IssueStatus } from "../models/issue";
import { supabase } from "./supabaseClient";

function getSupabaseOrThrow() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
  }

  return supabase;
}

type SupabaseIssueRow = {
  id: string;
  category: string;
  description: string;
  status: IssueStatus;
  created_at: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
};

function mapRowToIssue(r: SupabaseIssueRow): Issue {
  return {
    id: r.id,
    category: r.category,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    address: r.address ?? undefined,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    photoPath: r.photo_url ?? undefined,
  };
}

const ISSUE_SELECT =
  "id, category, description, status, created_at, address, latitude, longitude, photo_url";

export async function getIssues(): Promise<Issue[]> {
  const client = getSupabaseOrThrow();

  const { data, error } = await client
    .from("issues")
    .select("id, category, description, status, created_at, address, latitude, longitude, photo_url")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase getIssues error:", error);
    throw new Error(error.message);
  }

  return (data ?? []).map((r) => mapRowToIssue(r as SupabaseIssueRow));
}

export async function getIssueById(id: string): Promise<Issue | undefined> {
  const client = getSupabaseOrThrow();

  const { data, error } = await client
    .from("issues")
    .select(ISSUE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Supabase error:", error);
    throw new Error(error.message);
  }

  if (!data) return undefined;

  return mapRowToIssue(data);
}

export async function updateIssueStatus(
  id: string,
  status: IssueStatus
): Promise<Issue | undefined> {
  const client = getSupabaseOrThrow();

  const { data, error } = await client
    .from("issues")
    .update({ status })
    .eq("id", id)
    .select(ISSUE_SELECT)
    .maybeSingle();

  if (error) {
    console.error("Supabase error:", error);
    throw new Error(error.message);
  }

  if (!data) return undefined;

  return mapRowToIssue(data);
}