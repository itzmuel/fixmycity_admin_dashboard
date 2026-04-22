/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ISSUE_PHOTO_BUCKET?: string;
  readonly VITE_CATEGORY_FUNCTION_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
