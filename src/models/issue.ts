export type IssueStatus = "submitted" | "in_progress" | "resolved";
export type IssuePriority = "low" | "medium" | "high";

export interface Issue {
  id: string;
  reporter_id?: string;
  category: string;
  description: string;
  status: IssueStatus;
  priority?: IssuePriority;

  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  slaDueAt?: string;

  address?: string;
  latitude?: number;
  longitude?: number;

  photoUrl?: string;
  photoPath?: string;
}