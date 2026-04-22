# categorize-issue Edge Function

Classifies issue reports into standardized categories.

## Input JSON

```json
{
  "description": "Large pothole near intersection",
  "address": "123 Main St",
  "currentCategory": "General"
}
```

## Response JSON

```json
{
  "category": "Pothole",
  "confidence": 0.82,
  "reason": "Detected road surface damage keywords."
}
```

## Environment variables

- OPENAI_API_KEY (optional)
- OPENAI_MODEL (optional, default: gpt-4o-mini)

If OPENAI_API_KEY is not set or AI fails, the function falls back to deterministic keyword logic.

## Deploy

```bash
supabase functions deploy categorize-issue
```
