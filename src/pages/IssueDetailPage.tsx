import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Issue } from "../models/issue";
import type { IssueStatus } from "../models/issue";
import { getIssueById, updateIssueStatus } from "../services/issueService";
import { theme } from "../theme";
import StatusChip from "../components/StatusChip";
import CategoryBadge from "../components/CategoryBadge";



function statusButtonClass(active: boolean) {
  return `btn ${active ? "btn-primary" : ""}`;
}

export default function IssueDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const mapsLink = useMemo(() => {
    if (!issue?.latitude || !issue?.longitude) return null;
    return `https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`;
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

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Header */}
      <div className="card card-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="h1">Issue Details</div>
                <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="muted" style={{ fontWeight: 900 }}>{issue.id}</span>
                    <StatusChip status={issue.status} />
                </div>

        </div>

        <button className="btn" type="button" onClick={() => navigate(-1)}>
          ← Back
        </button>
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

          {mapsLink && (
            <div>
              <b>Map:</b>{" "}
              <a href={mapsLink} target="_blank" rel="noreferrer" style={{ color: theme.colors.primary, fontWeight: 900 }}>
                Open in Google Maps
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Status update */}
      <div className="card card-pad">
        <div className="h2">Update Status</div>
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
    </div>
  );
}
