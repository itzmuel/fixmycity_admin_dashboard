export const ISSUE_PHOTO_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const ISSUE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function isAllowedIssuePhotoMimeType(mimeType: string): boolean {
  return ISSUE_PHOTO_ALLOWED_MIME_TYPES.includes(
    mimeType.toLowerCase() as (typeof ISSUE_PHOTO_ALLOWED_MIME_TYPES)[number]
  );
}

export function validateIssuePhotoPayload(file: { type: string; size: number }): { valid: boolean; message?: string } {
  if (!isAllowedIssuePhotoMimeType(file.type)) {
    return {
      valid: false,
      message: "Unsupported file type. Allowed: JPG, PNG, WEBP.",
    };
  }

  if (file.size > ISSUE_PHOTO_MAX_BYTES) {
    return {
      valid: false,
      message: "File is too large. Maximum size is 5MB.",
    };
  }

  return { valid: true };
}
