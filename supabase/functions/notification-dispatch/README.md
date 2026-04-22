# notification-dispatch Edge Function

Processes pending rows from public.notification_events and dispatches email/push notifications.

## Required secrets

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- DISPATCH_SHARED_SECRET

## Optional provider secrets

- RESEND_API_KEY
- RESEND_FROM_EMAIL
- FCM_SERVER_KEY

## Deploy

```bash
supabase functions deploy notification-dispatch
```

## Invoke

```bash
curl -X POST \
  "https://<project-ref>.functions.supabase.co/notification-dispatch" \
  -H "x-dispatch-secret: <DISPATCH_SHARED_SECRET>"
```

## Scheduling

Use a cron scheduler (Supabase Scheduled Functions, GitHub Actions, or cloud scheduler) to call this endpoint every 1-5 minutes.
