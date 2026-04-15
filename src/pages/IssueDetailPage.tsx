import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Issue } from "../models/issue";
import type { IssueStatus, IssuePriority } from "../models/issue";
import { getIssueById, updateIssueStatus } from "../services/issueService";
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

export default function IssueDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<IssuePriority>("medium");

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
      <div>
        <button className="btn" type="button" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      {/* Header */}
      <div className="card card-pad">
        <div>
          <div className="h1">🔍 Issue Details</div>
          <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="muted" style={{ fontWeight: 900 }}>#{issue.id}</span>
            <StatusChip status={issue.status} />
            {issue.priority && <PriorityBadge priority={issue.priority} />}
          </div>
        </div>
      </div>

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
        <div className="h2">📅 Timeline</div>
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
                  Status changed to In Progress
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
                    : "Recently"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
