import type { Issue, IssueStatus } from "../models/issue";
import { ensureAdminSession } from "./adminAuthService";
import { supabase } from "./supabaseClient";

const DEFAULT_ISSUE_PHOTO_BUCKET = import.meta.env.VITE_ISSUE_PHOTO_BUCKET ?? "issue-photos";
const LEGACY_ISSUE_PHOTO_BUCKET = "issue-photo";
const STORAGE_PUBLIC_PREFIX = "storage/v1/object/public/";

function getSupabaseOrThrow() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
  }

  return supabase;
}

function buildServiceError(action: string, cause: unknown): Error {
  const rawMessage = cause instanceof Error ? cause.message : String(cause ?? "");
  const message = rawMessage.toLowerCase();

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("socket")
  ) {
    return new Error("Cannot reach Supabase. Check internet connection and API settings.");
  }

  if (
    message.includes("allowlist") ||
    message.includes("permission") ||
    message.includes("not authorized") ||
    message.includes("row-level security") ||
    message.includes("rls") ||
    message.includes("jwt")
  ) {
    return new Error("Admin access denied. Sign in with an allowlisted admin account.");
  }

  if (rawMessage.trim().length > 0) {
    return new Error(rawMessage);
  }

  return new Error(`Failed to ${action}.`);
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

type ResolvedIssuePhoto = {
  photoPath?: string;
  photoUrl?: string;
};

function isAbsoluteUrl(value: string): boolean {
  return /^(https?:\/\/|data:|blob:)/i.test(value);
}

function parseStoragePublicPath(value: string): { bucket?: string; path?: string } {
  const normalized = value.replace(/^\/+/, "");
  if (!normalized.startsWith(STORAGE_PUBLIC_PREFIX)) return {};

  const suffix = normalized.slice(STORAGE_PUBLIC_PREFIX.length);
  const [bucket, ...pathParts] = suffix.split("/");
  const path = pathParts.join("/");

  if (!bucket || !path) return {};

  return { bucket, path };
}

function parsePhotoReference(value: string): { bucket?: string; path?: string } {
  const normalized = value.replace(/^\/+/, "");

  const fromStoragePublicPath = parseStoragePublicPath(normalized);
  if (fromStoragePublicPath.path) return fromStoragePublicPath;

  for (const bucket of [DEFAULT_ISSUE_PHOTO_BUCKET, LEGACY_ISSUE_PHOTO_BUCKET]) {
    const prefix = `${bucket}/`;
    if (normalized.startsWith(prefix)) {
      return {
        bucket,
        path: normalized.slice(prefix.length),
      };
    }
  }

  return { path: normalized };
}

function getPublicPhotoUrl(path: string, bucketHint?: string): string | undefined {
  if (!path || !supabase) return undefined;

  const bucket = bucketHint ?? DEFAULT_ISSUE_PHOTO_BUCKET;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl || undefined;
}

function resolveIssuePhoto(photo: string | null): ResolvedIssuePhoto {
  if (!photo) return {};

  const trimmed = photo.trim();
  if (!trimmed) return {};

  if (isAbsoluteUrl(trimmed)) {
    return {
      photoPath: trimmed,
      photoUrl: trimmed,
    };
  }

  const { bucket, path } = parsePhotoReference(trimmed);
  if (!path) return {};

  return {
    photoPath: path,
    photoUrl: getPublicPhotoUrl(path, bucket),
  };
}

function mapRowToIssue(r: SupabaseIssueRow): Issue {
  const resolvedPhoto = resolveIssuePhoto(r.photo_url);

  return {
    id: r.id,
    category: r.category,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    address: r.address ?? undefined,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    photoPath: resolvedPhoto.photoPath,
    photoUrl: resolvedPhoto.photoUrl,
  };
}

const ISSUE_SELECT =
  "id, category, description, status, created_at, address, latitude, longitude, photo_url";

export async function getIssues(): Promise<Issue[]> {
  const client = getSupabaseOrThrow();

  try {
    await ensureAdminSession();

    const { data, error } = await client
      .from("issues")
      .select(ISSUE_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase getIssues error:", error);
      throw new Error(error.message);
    }

    return (data ?? []).map((r) => mapRowToIssue(r as SupabaseIssueRow));
  } catch (error) {
    throw buildServiceError("load issues", error);
  }
}

export async function getIssueById(id: string): Promise<Issue | undefined> {
  const client = getSupabaseOrThrow();

  try {
    await ensureAdminSession();

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
  } catch (error) {
    throw buildServiceError("load issue details", error);
  }
}

export async function updateIssueStatus(
  id: string,
  status: IssueStatus
): Promise<Issue | undefined> {
  const client = getSupabaseOrThrow();

  try {
    await ensureAdminSession();

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
  } catch (error) {
    throw buildServiceError("update issue status", error);
  }
}