import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Issue } from "../models/issue";
import { countNearbyIssues, getIssues, subscribeToIssueChanges } from "../services/issueService";
import StatusChip from "../components/StatusChip";
import CategoryBadge from "../components/CategoryBadge";
import PriorityBadge from "../components/PriorityBadge";
import MapView from "../components/MapView";
import NotificationsPanel from "../components/NotificationsPanel";
import AdvancedFilters from "../components/AdvancedFilters";
import ExportButton from "../components/ExportButton";

type Filter = "all" | Issue["status"];
const PAGE_SIZE = 8;
const SLA_TARGET_HOURS = 48;

type RealtimeNotification = {
  id: string;
  type: "new_report" | "status_change" | "high_priority";
  title: string;
  message: string;
  issueId: string;
  timestamp: Date;
  read: boolean;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function formatSlaState(issue: Issue): { label: string; color: string; background: string } {
  const createdAtMs = new Date(issue.createdAt).getTime();
  const slaDueAtMs = issue.slaDueAt ? new Date(issue.slaDueAt).getTime() : createdAtMs + SLA_TARGET_HOURS * 60 * 60 * 1000;
  const resolvedAtMs = issue.resolvedAt ? new Date(issue.resolvedAt).getTime() : issue.status === "resolved" && issue.updatedAt ? new Date(issue.updatedAt).getTime() : null;

  if (resolvedAtMs != null) {
    const withinSla = resolvedAtMs <= slaDueAtMs;
    return {
      label: withinSla ? "Resolved in SLA" : "Resolved late",
      color: withinSla ? "#166534" : "#7f1d1d",
      background: withinSla ? "#dcfce7" : "#fee2e2",
    };
  }

  if (Date.now() > slaDueAtMs) {
    return { label: "Overdue", color: "#7f1d1d", background: "#fee2e2" };
  }

  return { label: "On time", color: "#166534", background: "#dcfce7" };
}

function upsertIssueById(previous: Issue[], incoming: Issue): Issue[] {
  const alreadyExists = previous.some((issue) => issue.id === incoming.id);
  const next = alreadyExists
    ? previous.map((issue) => (issue.id === incoming.id ? incoming : issue))
    : [incoming, ...previous];

  return next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export default function DashboardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [filteredIssuesFromAdvanced, setFilteredIssuesFromAdvanced] = useState<Issue[]>([]);
  const [realtimeNotifications, setRealtimeNotifications] = useState<RealtimeNotification[]>([]);
  const [duplicateAlert, setDuplicateAlert] = useState<string | null>(null);
  const [liveSyncConnected, setLiveSyncConnected] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const refreshIssues = useCallback(async () => {
    const data = await getIssues();
    setIssues(data);
  }, []);

  // Load issues
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getIssues();
        if (!alive) return;

        setIssues(data);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load issues.");
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToIssueChanges((event) => {
      setLiveSyncConnected(true);

      if (event.eventType === "DELETE" && event.issueId) {
        setIssues((previous) => previous.filter((issue) => issue.id !== event.issueId));
        return;
      }

      if (!event.issue) {
        void refreshIssues();
        return;
      }

      const incomingIssue = event.issue;

      setIssues((previous) => {
        const next = upsertIssueById(previous, incomingIssue as Issue);

        if (event.eventType === "INSERT") {
          const nearbyCount = countNearbyIssues(next, incomingIssue.id, 20);
          if (nearbyCount > 0) {
            setDuplicateAlert(`Similar issue already reported nearby (${nearbyCount} within ~20m).`);
          }
        }

        return next;
      });

      const notificationType = event.eventType === "INSERT" ? "new_report" : "status_change";
      const notificationTitle = event.eventType === "INSERT" ? "New report submitted" : "Issue status updated";

      setRealtimeNotifications((previous) => {
        const nextNotification: RealtimeNotification = {
          id: `rt-${event.eventType}-${event.issue?.id}-${Date.now()}`,
          type: notificationType,
          title: notificationTitle,
          message:
            event.eventType === "INSERT"
              ? `${event.issue?.category} reported at ${event.issue?.address || "unknown location"}`
              : `${event.issue?.category} changed to ${event.issue?.status}`,
          issueId: event.issue?.id ?? "unknown",
          timestamp: new Date(),
          read: false,
        };

        return [nextNotification, ...previous].slice(0, 30);
      });
    });

    if (!unsubscribe) {
      setLiveSyncConnected(false);
      return;
    }

    return () => {
      unsubscribe();
      setLiveSyncConnected(false);
    };
  }, [refreshIssues]);

  // Close modal on ESC + lock scroll while open
  useEffect(() => {
    if (!previewImage) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewImage(null);
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [previewImage]);

  const counts = useMemo(() => {
    const submitted = issues.filter((i) => i.status === "submitted").length;
    const inProgress = issues.filter((i) => i.status === "in_progress").length;
    const resolved = issues.filter((i) => i.status === "resolved").length;
    return { submitted, inProgress, resolved, all: issues.length };
  }, [issues]);

  const duplicateCounts = useMemo(() => {
    const countsByIssueId = new Map<string, number>();
    for (const issue of issues) {
      countsByIssueId.set(issue.id, countNearbyIssues(issues, issue.id, 20));
    }
    return countsByIssueId;
  }, [issues]);

  const filteredIssues = useMemo(() => {
    // Use advanced filters if any, otherwise use basic filters
    const baseIssues = filteredIssuesFromAdvanced.length > 0 ? filteredIssuesFromAdvanced : issues;
    
    const q = normalize(query);

    return baseIssues.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (q.length === 0) return true;

      const hay = normalize([i.id, i.category, i.description, i.address ?? ""].join(" | "));
      return hay.includes(q);
    });
  }, [issues, filter, query, filteredIssuesFromAdvanced]);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedIssues = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredIssues.slice(start, start + PAGE_SIZE);
  }, [filteredIssues, page]);

  const pageStart = filteredIssues.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = filteredIssues.length === 0 ? 0 : Math.min(page * PAGE_SIZE, filteredIssues.length);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Header with Notifications */}
      <div className="card card-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="h1">City Reports Dashboard</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Review active reports, manage operations, and open issue details.
          </div>
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: liveSyncConnected ? "#166534" : "#92400e" }}>
            {liveSyncConnected ? "Live sync connected" : "Live sync unavailable"}
          </div>
        </div>
        <NotificationsPanel issues={issues} realtimeNotifications={realtimeNotifications} />
      </div>

      {duplicateAlert && (
        <div
          className="card card-pad"
          style={{ border: "1px solid #f59e0b", background: "#fffbeb", color: "#92400e", fontWeight: 800, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
        >
          <span>{duplicateAlert}</span>
          <button type="button" className="btn" onClick={() => setDuplicateAlert(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Map View - GAME CHANGER */}
      <MapView issues={issues} onIssueClick={(issue) => navigate(`/issues/${issue.id}`)} />

      {/* Filters + Search + Download */}
      <div className="card card-pad" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#999" }}>
            {filteredIssues.length} issues found
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <AdvancedFilters issues={issues} onFilter={setFilteredIssuesFromAdvanced} />
            <ExportButton issues={filteredIssues} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className={`pill ${filter === "all" ? "pill-active" : ""}`} onClick={() => setFilter("all")}>
            All ({counts.all})
          </button>

          <button type="button" className={`pill ${filter === "submitted" ? "pill-active" : ""}`} onClick={() => setFilter("submitted")}>
            Submitted ({counts.submitted})
          </button>

          <button type="button" className={`pill ${filter === "in_progress" ? "pill-active" : ""}`} onClick={() => setFilter("in_progress")}>
            In Progress ({counts.inProgress})
          </button>

          <button type="button" className={`pill ${filter === "resolved" ? "pill-active" : ""}`} onClick={() => setFilter("resolved")}>
            Resolved ({counts.resolved})
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, category, address, or description..."
          />

          {query.trim().length > 0 && (
            <button type="button" className="btn" onClick={() => setQuery("")}>
              Clear
            </button>
          )}
        </div>

        <div className="muted">
          {loading ? "Loading..." : `Showing ${pageStart}-${pageEnd} of ${filteredIssues.length} filtered reports (${issues.length} total)`}
        </div>

        {error && (
          <div style={{ padding: 10, borderRadius: 12, border: "1px solid #ef4444", color: "#ef4444", fontWeight: 700 }}>
            {error}
          </div>
        )}
      </div>

      {/* Issues Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th className="th">Photo</th>
              <th className="th">ID</th>
              <th className="th">Category</th>
              <th className="th">Priority</th>
              <th className="th">Status</th>
              <th className="th">SLA</th>
              <th className="th">Duplicate Risk</th>
              <th className="th">Address</th>
            </tr>
          </thead>

          <tbody>
            {paginatedIssues.map((issue) => {
              const photo = issue.photoUrl ?? null;

              return (
                <tr
                  key={issue.id}
                  className="row"
                  tabIndex={0}
                  role="button"
                  onClick={() => navigate(`/issues/${issue.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/issues/${issue.id}`);
                    }
                  }}
                >
                  {/* PHOTO COLUMN */}
                  <td className="td">
                    {photo ? (
                      <img
                        src={photo}
                        alt="Issue"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(photo);
                        }}
                        style={{
                          width: 50,
                          height: 50,
                          objectFit: "cover",
                          borderRadius: 12,
                          cursor: "pointer",
                          border: "1px solid #e5e7eb",
                          display: "block",
                        }}
                      />
                    ) : (
                      <span style={{ color: "#9ca3af", fontWeight: 700 }}>—</span>
                    )}
                  </td>

                  <td className="td" style={{ fontWeight: 900 }}>
                    {issue.id}
                  </td>

                  <td className="td">
                    <CategoryBadge category={issue.category} />
                  </td>

                  <td className="td">
                    {issue.priority && <PriorityBadge priority={issue.priority} />}
                  </td>

                  <td className="td">
                    <StatusChip status={issue.status} />
                  </td>

                  <td className="td">
                    {(() => {
                      const sla = formatSlaState(issue);
                      return (
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
                      );
                    })()}
                  </td>

                  <td className="td" style={{ fontWeight: 800 }}>
                    {duplicateCounts.get(issue.id) && (duplicateCounts.get(issue.id) as number) > 0 ? (
                      <span style={{ color: "#b45309" }}>
                        {duplicateCounts.get(issue.id)} nearby
                      </span>
                    ) : (
                      <span style={{ color: "#166534" }}>Low</span>
                    )}
                  </td>

                  <td className="td">{issue.address ?? "—"}</td>
                </tr>
              );
            })}

            {!loading && filteredIssues.length === 0 && (
              <tr>
                <td className="td muted" colSpan={8} style={{ padding: 16 }}>
                  No reports match your filters/search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredIssues.length > 0 && (
        <div className="card card-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="muted">
            Page {page} of {totalPages}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </button>

            <button
              type="button"
              className="btn"
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              borderRadius: 16,
              padding: 16,
              maxWidth: 900,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 900 }}>Photo Preview</div>
              <button type="button" className="btn" onClick={() => setPreviewImage(null)}>
                Close
              </button>
            </div>

            <img
              src={previewImage}
              alt="Full Preview"
              style={{
                maxWidth: "100%",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                display: "block",
              }}
            />

            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Tip: Press <b>Esc</b> to close.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
