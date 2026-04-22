import type { Issue, IssueStatus } from "../models/issue";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { ensureAdminSession } from "./adminAuthService";
import { supabase } from "./supabaseClient";
import { validateIssuePhotoPayload } from "./uploadValidation";

const DEFAULT_ISSUE_PHOTO_BUCKET = import.meta.env.VITE_ISSUE_PHOTO_BUCKET ?? "issue-photos";
const LEGACY_ISSUE_PHOTO_BUCKET = "issue-photo";
const STORAGE_PUBLIC_PREFIX = "storage/v1/object/public/";
const AI_CATEGORY_FUNCTION_NAME = import.meta.env.VITE_CATEGORY_FUNCTION_NAME ?? "categorize-issue";

export type CategorySuggestion = {
  category: string;
  confidence: number;
  reason: string;
  source: "edge-function" | "heuristic";
};

export type NotificationEventStatus = "pending" | "sent" | "failed";

export type NotificationEvent = {
  id: number;
  issueId: string;
  eventType: string;
  actorUserId?: string;
  status: NotificationEventStatus;
  payload: Record<string, unknown>;
  createdAt: string;
  processedAt?: string;
};

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
  reporter_id: string | null;
  category: string;
  description: string;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  sla_due_at: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
};

type SupabaseIssueRealtimeRow = Partial<SupabaseIssueRow> & { id: string };

type SupabaseNotificationEventRow = {
  id: number;
  issue_id: string;
  event_type: string;
  actor_user_id: string | null;
  status: NotificationEventStatus;
  payload: Record<string, unknown> | null;
  created_at: string;
  processed_at: string | null;
};

export type IssueChangeEvent = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  issue?: Issue;
  issueId?: string;
};

export type NotificationEventChange = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  event?: NotificationEvent;
  eventId?: number;
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
    reporter_id: r.reporter_id ?? undefined,
    category: r.category,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at ?? undefined,
    slaDueAt: r.sla_due_at ?? undefined,
    address: r.address ?? undefined,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    photoPath: resolvedPhoto.photoPath,
    photoUrl: resolvedPhoto.photoUrl,
  };
}

const ISSUE_SELECT =
  "id, reporter_id, category, description, status, created_at, updated_at, resolved_at, sla_due_at, address, latitude, longitude, photo_url";

function normalizeIssueRealtimeRow(row: SupabaseIssueRealtimeRow): Issue | undefined {
  if (!row.id || !row.category || !row.description || !row.status || !row.created_at || !row.updated_at) {
    return undefined;
  }

  return mapRowToIssue({
    id: row.id,
    reporter_id: row.reporter_id ?? null,
    category: row.category,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    resolved_at: row.resolved_at ?? null,
    sla_due_at: row.sla_due_at ?? null,
    address: row.address ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    photo_url: row.photo_url ?? null,
  });
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceInMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number {
  const earthRadiusMeters = 6371000;
  const deltaLat = degreesToRadians(latitudeB - latitudeA);
  const deltaLon = degreesToRadians(longitudeB - longitudeA);
  const lat1 = degreesToRadians(latitudeA);
  const lat2 = degreesToRadians(latitudeB);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

export function countNearbyIssues(issues: Issue[], targetIssueId: string, radiusMeters = 20): number {
  const target = issues.find((issue) => issue.id === targetIssueId);
  if (!target || target.latitude == null || target.longitude == null) return 0;

  return issues.filter((issue) => {
    if (issue.id === targetIssueId || issue.latitude == null || issue.longitude == null) return false;
    return (
      distanceInMeters(target.latitude as number, target.longitude as number, issue.latitude as number, issue.longitude as number) <=
      radiusMeters
    );
  }).length;
}

async function writeIssueAuditLog(
  issueId: string,
  action: string,
  userId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const client = getSupabaseOrThrow();

  const { error } = await client.from("issue_logs").insert({
    issue_id: issueId,
    action,
    user_id: userId,
    metadata,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function queueStatusNotification(
  issueId: string,
  userId: string,
  status: IssueStatus
): Promise<void> {
  const client = getSupabaseOrThrow();

  const { error } = await client.from("notification_events").insert({
    issue_id: issueId,
    event_type: "status_changed",
    actor_user_id: userId,
    payload: { status },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeToIssueChanges(
  onChange: (event: IssueChangeEvent) => void,
  onConnectionStateChange?: (connected: boolean) => void
): (() => void) | undefined {
  const client = supabase;
  if (!client) return undefined;

  const channel = client
    .channel("issues-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "issues" },
      (payload: RealtimePostgresChangesPayload<SupabaseIssueRealtimeRow>) => {
        const normalizedEventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";

        if (normalizedEventType === "DELETE") {
          const oldRow = payload.old as SupabaseIssueRealtimeRow;
          onChange({ eventType: normalizedEventType, issueId: oldRow.id });
          return;
        }

        const row = payload.new as SupabaseIssueRealtimeRow;
        const issue = normalizeIssueRealtimeRow(row);
        onChange({ eventType: normalizedEventType, issue, issueId: row.id });
      }
    )
    .subscribe((status) => {
      if (!onConnectionStateChange) return;
      onConnectionStateChange(status === "SUBSCRIBED");
    });

  return () => {
    void client.removeChannel(channel);
  };
}

export async function getNotificationEvents(status?: NotificationEventStatus): Promise<NotificationEvent[]> {
  const client = getSupabaseOrThrow();

  try {
    await ensureAdminSession();

    let query = client
      .from("notification_events")
      .select("id, issue_id, event_type, actor_user_id, status, payload, created_at, processed_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapNotificationRow(row as SupabaseNotificationEventRow));
  } catch (error) {
    throw buildServiceError("load notification queue", error);
  }
}

export async function retryNotificationEvent(eventId: number): Promise<void> {
  const client = getSupabaseOrThrow();

  try {
    await ensureAdminSession();

    const { error } = await client
      .from("notification_events")
      .update({
        status: "pending",
        processed_at: null,
      })
      .eq("id", eventId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    throw buildServiceError("retry notification event", error);
  }
}

export function subscribeToNotificationEvents(onChange: (event: NotificationEventChange) => void): (() => void) | undefined {
  const client = supabase;
  if (!client) return undefined;

  const channel = client
    .channel("notification-events-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notification_events" },
      (payload: RealtimePostgresChangesPayload<Partial<SupabaseNotificationEventRow> & { id: number }>) => {
        const normalizedEventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";

        if (normalizedEventType === "DELETE") {
          const deleted = payload.old as { id: number };
          onChange({ eventType: normalizedEventType, eventId: deleted.id });
          return;
        }

        const row = payload.new as Partial<SupabaseNotificationEventRow> & { id: number };
        if (!row.issue_id || !row.event_type || !row.status || !row.created_at) {
          onChange({ eventType: normalizedEventType, eventId: row.id });
          return;
        }

        onChange({
          eventType: normalizedEventType,
          event: mapNotificationRow({
            id: row.id,
            issue_id: row.issue_id,
            event_type: row.event_type,
            actor_user_id: row.actor_user_id ?? null,
            status: row.status,
            payload: row.payload ?? {},
            created_at: row.created_at,
            processed_at: row.processed_at ?? null,
          }),
          eventId: row.id,
        });
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

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
    const adminUserId = await ensureAdminSession();

    const { data: currentIssue, error: currentIssueError } = await client
      .from("issues")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (currentIssueError) {
      throw new Error(currentIssueError.message);
    }

    const previousStatus = (currentIssue?.status as IssueStatus | undefined) ?? "submitted";

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

    try {
      await writeIssueAuditLog(id, "status_changed", adminUserId, {
        previousStatus,
        newStatus: status,
      });
    } catch (logError) {
      console.warn("Issue audit log write failed:", logError);
    }

    try {
      await queueStatusNotification(id, adminUserId, status);
    } catch (notifyError) {
      console.warn("Notification queue insert failed:", notifyError);
    }

    return mapRowToIssue(data);
  } catch (error) {
    throw buildServiceError("update issue status", error);
  }
}

export function validateIssuePhotoUpload(file: File): { valid: boolean; message?: string } {
  return validateIssuePhotoPayload(file);
}

function suggestFromHeuristics(description: string): CategorySuggestion {
  const text = description.toLowerCase();

  if (/pothole|road crack|asphalt|sinkhole|road damage/.test(text)) {
    return { category: "Pothole", confidence: 0.82, reason: "Detected road surface damage keywords.", source: "heuristic" };
  }

  if (/streetlight|traffic light|lamp|light not working|dark street/.test(text)) {
    return { category: "Streetlight", confidence: 0.8, reason: "Detected lighting/visibility keywords.", source: "heuristic" };
  }

  if (/garbage|trash|litter|dumping|waste/.test(text)) {
    return { category: "Garbage", confidence: 0.78, reason: "Detected waste and sanitation keywords.", source: "heuristic" };
  }

  if (/flood|drain|sewer|water leak|overflow/.test(text)) {
    return { category: "Drainage", confidence: 0.79, reason: "Detected water and drainage keywords.", source: "heuristic" };
  }

  if (/graffiti|vandal|spray paint/.test(text)) {
    return { category: "Graffiti", confidence: 0.76, reason: "Detected vandalism-related keywords.", source: "heuristic" };
  }

  if (/sidewalk|curb|walkway|pedestrian/.test(text)) {
    return { category: "Sidewalk", confidence: 0.75, reason: "Detected pedestrian path keywords.", source: "heuristic" };
  }

  return {
    category: "General",
    confidence: 0.6,
    reason: "No strong pattern found; using broad fallback category.",
    source: "heuristic",
  };
}

export async function suggestIssueCategory(issue: Pick<Issue, "description" | "address" | "category">): Promise<CategorySuggestion> {
  const client = supabase;

  if (client) {
    try {
      const { data, error } = await client.functions.invoke(AI_CATEGORY_FUNCTION_NAME, {
        body: {
          description: issue.description,
          address: issue.address ?? "",
          currentCategory: issue.category,
        },
      });

      if (!error && data && typeof data.category === "string") {
        return {
          category: data.category,
          confidence: typeof data.confidence === "number" ? data.confidence : 0.7,
          reason: typeof data.reason === "string" ? data.reason : "AI function classified this issue.",
          source: "edge-function",
        };
      }
    } catch {
      // Fallback to deterministic heuristics when function is unavailable.
    }
  }

  return suggestFromHeuristics(issue.description);
}

export async function updateIssueCategory(id: string, category: string): Promise<Issue | undefined> {
  const client = getSupabaseOrThrow();

  try {
    const adminUserId = await ensureAdminSession();

    const { data: currentIssue, error: currentIssueError } = await client
      .from("issues")
      .select("category")
      .eq("id", id)
      .maybeSingle();

    if (currentIssueError) {
      throw new Error(currentIssueError.message);
    }

    const previousCategory = (currentIssue?.category as string | undefined) ?? "Unknown";

    const { data, error } = await client
      .from("issues")
      .update({ category })
      .eq("id", id)
      .select(ISSUE_SELECT)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return undefined;

    try {
      await writeIssueAuditLog(id, "category_changed", adminUserId, {
        previousCategory,
        newCategory: category,
      });
    } catch (logError) {
      console.warn("Issue audit log write failed:", logError);
    }

    return mapRowToIssue(data);
  } catch (error) {
    throw buildServiceError("update issue category", error);
  }
}

function mapNotificationRow(row: SupabaseNotificationEventRow): NotificationEvent {
  return {
    id: row.id,
    issueId: row.issue_id,
    eventType: row.event_type,
    actorUserId: row.actor_user_id ?? undefined,
    status: row.status,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    processedAt: row.processed_at ?? undefined,
  };
}