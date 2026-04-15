export type IssueStatus = "submitted" | "in_progress" | "resolved";
export type IssuePriority = "low" | "medium" | "high";

export interface Issue {
  id: string;
  reporter_id?: string;      // optional for now (admin dashboard may not need it)
  category: string;
  description: string;
  status: IssueStatus;
  priority?: IssuePriority;   // Default: derived from category, can be overridden

  // Supabase returns created_at, but we can map it to createdAt in service
  createdAt: string;
  updatedAt?: string;         // Track when status/priority changed

  address?: string;
  latitude?: number;
  longitude?: number;

  // ✅ Standard field in the app
  photoUrl?: string;

  // ✅ optional: keep legacy field so older UI doesn’t break
  photoPath?: string;
}