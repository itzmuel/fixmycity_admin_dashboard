import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Issue } from "../models/issue";
import type { IssueStatus, IssuePriority } from "../models/issue";
import type { CategorySuggestion } from "../services/issueService";
import {
  countNearbyIssues,
  getIssueById,
  getIssues,
  subscribeToIssueChanges,
  suggestIssueCategory,
  updateIssueCategory,
  updateIssueStatus,
} from "../services/issueService";
import { theme } from "../theme";
import StatusChip from "../components/StatusChip";
import CategoryBadge from "../components/CategoryBadge";
import PriorityBadge from "../components/PriorityBadge";
import { MapPin, AlertCircle, CheckCircle } from "lucide-react";



function statusButtonClass(active: boolean) {
  return `btn ${active ? "btn-primary" : ""}`;
}

function buildMapBounds(latitude: number, longitude: number, delta = 0.005) {
  return {
    left: longitude - delta,
    right: longitude + delta,
    top: latitude + delta,
    bottom: latitude - delta,
  };
}

function formatSla(issue: Issue): { label: string; color: string; background: string } {
  const createdAtMs = new Date(issue.createdAt).getTime();
  const slaDueAtMs = issue.slaDueAt ? new Date(issue.slaDueAt).getTime() : createdAtMs + 48 * 60 * 60 * 1000;
  const resolvedAtMs = issue.resolvedAt
    ? new Date(issue.resolvedAt).getTime()
    : issue.status === "resolved" && issue.updatedAt
      ? new Date(issue.updatedAt).getTime()
      : null;

  if (resolvedAtMs != null) {
    const withinSla = resolvedAtMs <= slaDueAtMs;
    return {
      label: withinSla ? "Resolved in 48h SLA" : "Resolved after SLA",
      color: withinSla ? "#166534" : "#7f1d1d",
      background: withinSla ? "#dcfce7" : "#fee2e2",
    };
  }

  if (Date.now() > slaDueAtMs) {
    return { label: "Overdue", color: "#7f1d1d", background: "#fee2e2" };
  }

  return { label: "On track", color: "#166534", background: "#dcfce7" };
}

export default function IssueDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<IssuePriority>("medium");
  const [nearbyCount, setNearbyCount] = useState(0);
  const [liveSyncConnected, setLiveSyncConnected] = useState(false);
  const [categorySuggestion, setCategorySuggestion] = useState<CategorySuggestion | null>(null);
  const [applyingSuggestion, setApplyingSuggestion] = useState(false);

  useEffect(() => {
    if (!id) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await getIssueById(id);
        if (!alive) return;
        setIssue(res ?? null);
        if (res) {
          setSelectedPriority(res.priority || "medium");
        }
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load issue details.");
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToIssueChanges((event) => {
      if (event.issueId !== id) return;
      setLiveSyncConnected(true);

      if (event.eventType === "DELETE") {
        setIssue(null);
        return;
      }

      if (event.issue) {
        setIssue(event.issue);
        return;
      }

      void (async () => {
        const latest = await getIssueById(id);
        setIssue(latest ?? null);
      })();
    });

    if (!unsubscribe) {
      setLiveSyncConnected(false);
      return;
    }

    return () => {
      unsubscribe();
      setLiveSyncConnected(false);
    };
  }, [id]);

  useEffect(() => {
    if (!issue?.id) return;

    let alive = true;
    void (async () => {
      try {
        const allIssues = await getIssues();
        if (!alive) return;
        setNearbyCount(countNearbyIssues(allIssues, issue.id, 20));
      } catch {
        if (!alive) return;
        setNearbyCount(0);
      }
    })();

    return () => {
      alive = false;
    };
  }, [issue?.id, issue?.status]);

  useEffect(() => {
    if (!issue?.description) return;

    let alive = true;
    void (async () => {
      try {
        const suggestion = await suggestIssueCategory({
          description: issue.description,
          address: issue.address,
          category: issue.category,
        });

        if (!alive) return;
        setCategorySuggestion(suggestion);
      } catch {
        if (!alive) return;
        setCategorySuggestion(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [issue?.id, issue?.description, issue?.address, issue?.category]);

  const mapsLink = useMemo(() => {
    if (issue?.latitude == null || issue?.longitude == null) return null;
    return `https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`;
  }, [issue]);

  const mapEmbedSrc = useMemo(() => {
    if (issue?.latitude == null || issue?.longitude == null) return null;

    const bounds = buildMapBounds(issue.latitude, issue.longitude);
    const params = new URLSearchParams({
      bbox: `${bounds.left},${bounds.bottom},${bounds.right},${bounds.top}`,
      layer: "mapnik",
      marker: `${issue.latitude},${issue.longitude}`,
    });

    return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
  }, [issue]);

  const photoUrl = useMemo(() => {
    const direct = issue?.photoUrl?.trim();
    if (direct) return direct;

    const path = issue?.photoPath?.trim();
    if (!path) return null;

    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:") || path.startsWith("blob:")) {
      return path;
    }

    return null;
  }, [issue]);

  async function setStatus(next: IssueStatus) {
    if (!id || !issue) return;
    setSaving(true);
    setError(null);

    try {
      const updated = await updateIssueStatus(id, next);
      if (updated) setIssue(updated);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  async function applySuggestedCategory() {
    if (!issue || !categorySuggestion || issue.category === categorySuggestion.category) return;

    setApplyingSuggestion(true);
    setError(null);

    try {
      const updated = await updateIssueCategory(issue.id, categorySuggestion.category);
      if (updated) setIssue(updated);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update category.");
    } finally {
      setApplyingSuggestion(false);
    }
  }

  if (!id) return <div className="card card-pad">Missing issue id.</div>;

  if (loading) return <div className="card card-pad">Loading…</div>;

  if (!issue) {
    return (
      <div className="card card-pad">
        <div className="h2">Issue Details</div>
        <div style={{ marginTop: 12 }}>
          <button className="btn" type="button" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const sla = formatSla(issue);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <button className="btn" type="button" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      {/* Header */}
      <div className="card card-pad">
        <div>
          <div className="h1">Issue Details</div>
          <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="muted" style={{ fontWeight: 900 }}>#{issue.id}</span>
            <StatusChip status={issue.status} />
            {issue.priority && <PriorityBadge priority={issue.priority} />}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 900,
                color: sla.color,
                background: sla.background,
              }}
            >
              {sla.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: liveSyncConnected ? "#166534" : "#92400e" }}>
              {liveSyncConnected ? "Live sync active" : "Live sync unavailable"}
            </span>
          </div>
        </div>
      </div>

      {nearbyCount > 0 && (
        <div
          className="card card-pad"
          style={{ border: "1px solid #f59e0b", background: "#fffbeb", color: "#92400e", fontWeight: 800 }}
        >
          Similar issue already reported nearby: {nearbyCount} report(s) within ~20 meters.
        </div>
      )}

      {categorySuggestion && (
        <div className="card card-pad" style={{ border: "1px solid #c7d2fe", background: "#eef2ff" }}>
          <div className="h2" style={{ marginBottom: 8 }}>AI Category Suggestion</div>
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              Suggested: <b>{categorySuggestion.category}</b>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              Confidence: {Math.round(categorySuggestion.confidence * 100)}% • Source: {categorySuggestion.source}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {categorySuggestion.reason}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={applyingSuggestion || issue.category === categorySuggestion.category}
                onClick={applySuggestedCategory}
              >
                {applyingSuggestion ? "Applying..." : "Apply Suggested Category"}
              </button>
              {issue.category === categorySuggestion.category && (
                <span className="muted" style={{ alignSelf: "center", fontSize: 12, fontWeight: 800 }}>
                  Current category already matches suggestion.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metadata Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div className="card card-pad" style={{ borderLeft: "4px solid #2196f3" }}>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>CATEGORY</div>
          <CategoryBadge category={issue.category} />
        </div>

        <div className="card card-pad" style={{ borderLeft: "4px solid #ff9800" }}>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>SUBMITTED</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {new Date(issue.createdAt).toLocaleDateString()}
          </div>
          <div style={{ fontSize: 12, color: "#999" }}>
            {new Date(issue.createdAt).toLocaleTimeString()}
          </div>
        </div>

        <div className="card card-pad" style={{ borderLeft: "4px solid #4caf50" }}>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>LOCATION</div>
          <div style={{ fontWeight: 600, fontSize: 14, display: "flex", gap: 6, alignItems: "flex-start" }}>
            <MapPin size={18} style={{ marginTop: 2 }} />
            <span>{issue.address || issue.latitude ? `${issue.latitude?.toFixed(4)}, ${issue.longitude?.toFixed(4)}` : "Unknown"}</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="card card-pad">
        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 12,
              border: "1px solid #ef4444",
              color: "#ef4444",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          <div><b>ID:</b> {issue.id}</div>
            <div>
            <b>Category:</b>{" "}
            <span style={{ marginLeft: 8 }}>
                <CategoryBadge category={issue.category} />
            </span>
            </div>
          <div><b>Description:</b> {issue.description}</div>
          <div><b>Address:</b> {issue.address ?? "—"}</div>

          {photoUrl && (
            <div style={{ display: "grid", gap: 8 }}>
              <b>Photo:</b>
              <a href={photoUrl} target="_blank" rel="noreferrer" style={{ width: "fit-content" }}>
                <img
                  src={photoUrl}
                  alt={`Issue ${issue.id}`}
                  style={{ width: "100%", maxWidth: 420, borderRadius: 12, border: `1px solid ${theme.colors.border}` }}
                />
              </a>
              <div className="muted" style={{ fontSize: 12 }}>
                Click image to open full size.
              </div>
            </div>
          )}

          {mapEmbedSrc && mapsLink && (
            <div style={{ display: "grid", gap: 8 }}>
              <b>Map:</b>
              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `1px solid ${theme.colors.border}`,
                  background: "#f3f4f6",
                }}
              >
                <iframe
                  title={`Map for issue ${issue.id}`}
                  src={mapEmbedSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{ width: "100%", height: 260, border: 0, display: "block" }}
                />
              </div>
              <div className="muted" style={{ fontSize: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <span>Pan or zoom in the map preview.</span>
                <a href={mapsLink} target="_blank" rel="noreferrer" style={{ color: theme.colors.primary, fontWeight: 900 }}>
                  Open in Google Maps
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status & Priority Update */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        {/* Status */}
        <div className="card card-pad">
          <div className="h2" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <CheckCircle size={24} />
            Update Status
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Choose the current stage of this issue.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
            <button
              type="button"
              className={statusButtonClass(issue.status === "submitted")}
              disabled={saving}
              onClick={() => setStatus("submitted")}
            >
              Submitted
            </button>

            <button
              type="button"
              className={statusButtonClass(issue.status === "in_progress")}
              disabled={saving}
              onClick={() => setStatus("in_progress")}
            >
              In Progress
            </button>

            <button
              type="button"
              className={statusButtonClass(issue.status === "resolved")}
              disabled={saving}
              onClick={() => setStatus("resolved")}
            >
              Resolved
            </button>

            {saving && <span className="muted">Saving…</span>}
          </div>
        </div>

        {/* Priority */}
        <div className="card card-pad">
          <div className="h2" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <AlertCircle size={24} />
            Set Priority
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Define the priority level for this issue.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
            {(["low", "medium", "high"] as IssuePriority[]).map((priority) => (
              <button
                key={priority}
                type="button"
                className={`btn ${selectedPriority === priority ? "btn-primary" : ""}`}
                onClick={() => setSelectedPriority(priority)}
              >
                <PriorityBadge priority={priority} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card card-pad">
        <div className="h2">Timeline</div>
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontSize: 24 }}>📍</div>
            <div>
              <div style={{ fontWeight: 600 }}>Issue Submitted</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {new Date(issue.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          {issue.status !== "submitted" && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 24 }}>🔧</div>
              <div>
                <div style={{ fontWeight: 600 }}>Work Started</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {issue.updatedAt
                    ? new Date(issue.updatedAt).toLocaleString()
                    : "Update time unavailable"}
                </div>
              </div>
            </div>
          )}

          {issue.status === "resolved" && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 24 }}>✅</div>
              <div>
                <div style={{ fontWeight: 600 }}>Issue Resolved</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {issue.updatedAt
                    ? new Date(issue.updatedAt).toLocaleString()
                    : "Update time unavailable"}
                </div>
              </div>
            </div>
          )}

          {issue.updatedAt && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 24 }}>🕒</div>
              <div>
                <div style={{ fontWeight: 600 }}>Last Updated</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {new Date(issue.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
