// Supabase Edge Function: notification-dispatch
// Pulls pending notification_events and dispatches email/push payloads.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DISPATCH_SHARED_SECRET = Deno.env.get("DISPATCH_SHARED_SECRET") ?? "";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "no-reply@fixmycity.local";

const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type NotificationEventRow = {
  id: number;
  issue_id: string;
  event_type: string;
  actor_user_id: string | null;
  payload: Record<string, unknown>;
};

async function sendStatusEmail(issueId: string, payload: Record<string, unknown>): Promise<void> {
  const recipient = typeof payload.recipientEmail === "string" ? payload.recipientEmail : null;
  if (!recipient || !RESEND_API_KEY) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: recipient,
      subject: `FixMyCity issue ${issueId} updated`,
      html: `<p>Your issue <b>${issueId}</b> status is now <b>${String(payload.status ?? "updated")}</b>.</p>`,
    }),
  });
}

async function sendPush(payload: Record<string, unknown>): Promise<void> {
  const token = typeof payload.fcmToken === "string" ? payload.fcmToken : null;
  if (!token || !FCM_SERVER_KEY) return;

  await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Authorization": `key=${FCM_SERVER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title: "FixMyCity update",
        body: `Issue status changed to ${String(payload.status ?? "updated")}`,
      },
      data: payload,
    }),
  });
}

Deno.serve(async (request) => {
  const requestSecret = request.headers.get("x-dispatch-secret") ?? "";
  if (!DISPATCH_SHARED_SECRET || requestSecret !== DISPATCH_SHARED_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { data, error } = await supabase
    .from("notification_events")
    .select("id, issue_id, event_type, actor_user_id, payload")
    .eq("status", "pending")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const pendingEvents = (data ?? []) as NotificationEventRow[];

  for (const event of pendingEvents) {
    try {
      if (event.event_type === "status_changed") {
        await sendStatusEmail(event.issue_id, event.payload ?? {});
        await sendPush(event.payload ?? {});
      }

      const { error: updateError } = await supabase
        .from("notification_events")
        .update({
          status: "sent",
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      if (updateError) {
        throw updateError;
      }
    } catch (dispatchError) {
      await supabase
        .from("notification_events")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          payload: {
            ...(event.payload ?? {}),
            dispatchError: dispatchError instanceof Error ? dispatchError.message : String(dispatchError),
          },
        })
        .eq("id", event.id);
    }
  }

  return new Response(JSON.stringify({ processed: pendingEvents.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
