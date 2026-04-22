# Mobile Integration Notes

This admin workspace does not contain the mobile app upload screen, so upload validation wiring in mobile must be applied in the mobile repository.

## Shared validation rules

Use these rules before uploading issue photos:

- Allowed MIME: image/jpeg, image/jpg, image/png, image/webp
- Max size: 5MB

Equivalent helper exists in this repo at src/services/uploadValidation.ts.

## Example (React Native style)

```ts
function validatePhoto(mimeType: string, size: number) {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(mimeType.toLowerCase())) {
    return { valid: false, message: "Unsupported file type. Allowed: JPG, PNG, WEBP." };
  }
  if (size > 5 * 1024 * 1024) {
    return { valid: false, message: "File is too large. Maximum size is 5MB." };
  }
  return { valid: true };
}
```

## Storage policy compatibility

Migration 20260421_storage_upload_validation.sql enforces this server-side too.
If the mobile uploader does not send matching MIME/size metadata, uploads will be rejected by policy.
