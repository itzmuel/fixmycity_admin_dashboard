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
    }, setLiveSyncConnected);

    if (!unsubscribe) {
      setLiveSyncConnected(false);
      return;
    }

    return () => {
      unsubscribe();
      setLiveSyncConnected(false);
    };
  }, [refreshIssues]);

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
    <div className="grid gap-3">
      {/* Header with Notifications */}
      <div
        className="flex justify-between items-center flex-wrap gap-3 rounded-[20px] bg-white p-5 relative overflow-hidden"
        style={{ border: "1px solid var(--color-border-light)", boxShadow: "var(--shadow-card-soft)" }}
      >
        <div>
          <div>
            <h1 className="text-[22px] text-[var(--color-text-main)] m-0" style={{ fontFamily: "var(--font-heading)" }}>
              City Reports Dashboard
            </h1>
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)] mt-2">
            Review active reports, manage operations, and open issue details.
          </p>
          <span
            className="inline-flex items-center gap-1.5 mt-2 text-xs rounded-full px-3 py-1"
            style={{
              color: liveSyncConnected ? "#166534" : "#92400e",
              background: liveSyncConnected ? "#dcfce7" : "#fef3c7",
            }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: liveSyncConnected ? "#16a34a" : "#d97706" }}
            />
            {liveSyncConnected ? "Live sync connected" : "Live sync unavailable"}
          </span>
        </div>
        <NotificationsPanel issues={issues} realtimeNotifications={realtimeNotifications} />
      </div>

      {duplicateAlert && (
        <div
          className="flex justify-between items-center gap-3 rounded-[20px] p-5 font-extrabold text-sm"
          style={{
            border: "1px solid #f59e0b",
            background: "#fffbeb",
            color: "#92400e",
          }}
        >
          <span>{duplicateAlert}</span>
          <button
            type="button"
            onClick={() => setDuplicateAlert(null)}
            className="rounded-full px-4 py-2 text-xs font-extrabold cursor-pointer transition-all duration-200 hover:opacity-80"
            style={{
              background: "var(--color-primary)",
              color: "#fff",
              border: "none",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Map View */}
      <MapView issues={issues} onIssueClick={(issue) => navigate(`/issues/${issue.id}`)} />

      {/* Filters + Search + Download */}
      <div
        className="grid gap-3 rounded-[20px] bg-white p-5"
        style={{ border: "1px solid var(--color-border-light)", boxShadow: "var(--shadow-card-soft)" }}
      >
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div className="text-xs font-medium text-[var(--color-text-muted)]" style={{ fontFamily: "var(--font-heading)" }}>
            {filteredIssues.length} issues found
          </div>

          <div className="ml-auto flex gap-2.5 items-center">
            <AdvancedFilters issues={issues} onFilter={setFilteredIssuesFromAdvanced} />
            <ExportButton issues={filteredIssues} />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="rounded-full px-4 py-2 text-sm font-extrabold cursor-pointer transition-all duration-200 border border-[var(--color-border-light)]"
            style={{
              background: filter === "all" ? "var(--color-primary)" : "#fff",
              color: filter === "all" ? "#fff" : "var(--color-text-secondary)",
            }}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter("submitted")}
            className="rounded-full px-4 py-2 text-sm font-extrabold cursor-pointer transition-all duration-200 border border-[var(--color-border-light)]"
            style={{
              background: filter === "submitted" ? "var(--color-primary)" : "#fff",
              color: filter === "submitted" ? "#fff" : "var(--color-text-secondary)",
            }}
          >
            Submitted ({counts.submitted})
          </button>
          <button
            type="button"
            onClick={() => setFilter("in_progress")}
            className="rounded-full px-4 py-2 text-sm font-extrabold cursor-pointer transition-all duration-200 border border-[var(--color-border-light)]"
            style={{
              background: filter === "in_progress" ? "var(--color-primary)" : "#fff",
              color: filter === "in_progress" ? "#fff" : "var(--color-text-secondary)",
            }}
          >
            In Progress ({counts.inProgress})
          </button>
          <button
            type="button"
            onClick={() => setFilter("resolved")}
            className="rounded-full px-4 py-2 text-sm font-extrabold cursor-pointer transition-all duration-200 border border-[var(--color-border-light)]"
            style={{
              background: filter === "resolved" ? "var(--color-primary)" : "#fff",
              color: filter === "resolved" ? "#fff" : "var(--color-text-secondary)",
            }}
          >
            Resolved ({counts.resolved})
          </button>
        </div>

        <div className="flex gap-2.5 items-center flex-wrap">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, category, address, or description..."
            className="w-full max-w-[520px] px-3 py-2.5 rounded-2xl border border-[var(--color-border-light)] outline-none bg-white font-bold text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)]"
          />

          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-full px-4 py-2 text-xs font-extrabold cursor-pointer transition-all duration-200 bg-white border border-[var(--color-border-light)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]"
            >
              Clear
            </button>
          )}
        </div>

        <div className="text-sm font-semibold text-[var(--color-text-secondary)]">
          {loading ? "Loading..." : `Showing ${pageStart}-${pageEnd} of ${filteredIssues.length} filtered reports (${issues.length} total)`}
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-red-400 text-red-500 font-bold text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Issues Table */}
      <div
        className="overflow-hidden rounded-[20px] bg-white"
        style={{ border: "1px solid var(--color-border-light)", boxShadow: "var(--shadow-card-soft)" }}
      >
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
                  <td className="td">
                    {photo ? (
                      <img
                        src={photo}
                        alt="Issue"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(photo);
                        }}
                        className="w-[50px] h-[50px] object-cover rounded-xl cursor-pointer block border border-[var(--color-border-light)]"
                      />
                    ) : (
                      <span className="text-[var(--color-text-muted)] font-bold">—</span>
                    )}
                  </td>

                  <td className="td text-[var(--color-text-main)]" style={{ fontFamily: "var(--font-heading)", fontSize: 12 }}>
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
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold"
                          style={{ color: sla.color, background: sla.background, fontFamily: "var(--font-heading)" }}
                        >
                          {sla.label}
                        </span>
                      );
                    })()}
                  </td>

                  <td className="td" style={{ fontFamily: "var(--font-heading)" }}>
                    {duplicateCounts.get(issue.id) && (duplicateCounts.get(issue.id) as number) > 0 ? (
                      <span className="text-amber-700">
                        {duplicateCounts.get(issue.id)} nearby
                      </span>
                    ) : (
                      <span className="text-emerald-700">Low</span>
                    )}
                  </td>

                  <td className="td text-[var(--color-text-secondary)]">{issue.address ?? "—"}</td>
                </tr>
              );
            })}

            {!loading && filteredIssues.length === 0 && (
              <tr>
                <td className="td text-[var(--color-text-muted)] font-semibold" colSpan={8} style={{ padding: 16 }}>
                  No reports match your filters/search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredIssues.length > 0 && (
        <div
          className="flex justify-between items-center gap-3 flex-wrap rounded-[20px] bg-white p-5"
          style={{ border: "1px solid var(--color-border-light)", boxShadow: "var(--shadow-card-soft)" }}
        >
          <div className="text-sm font-semibold text-[var(--color-text-secondary)]">
            Page {page} of {totalPages}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-full px-5 py-2.5 text-sm font-extrabold cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--color-border-light)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-full px-5 py-2.5 text-sm font-extrabold cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--color-border-light)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]"
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
          className="fixed inset-0 flex items-center justify-center p-5 z-[999]"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-[20px] p-5 bg-white max-w-[900px] w-full max-h-[90vh] overflow-auto"
            style={{ border: "1px solid var(--color-border-light)", boxShadow: "var(--shadow-float)" }}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="font-medium text-lg text-[var(--color-text-main)]" style={{ fontFamily: "var(--font-heading)" }}>Photo Preview</div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="rounded-full px-4 py-2 text-xs font-extrabold cursor-pointer transition-all duration-200 border border-[var(--color-border-light)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]"
              >
                Close
              </button>
            </div>

            <img
              src={previewImage}
              alt="Full Preview"
              className="max-w-full rounded-xl border border-[var(--color-border-light)] block"
            />

            <div className="mt-2.5 text-xs font-bold text-[var(--color-text-muted)]">
              Tip: Press <b>Esc</b> to close.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
