import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Issue } from "../models/issue";
import { getIssues } from "../services/issueService";
import StatusChip from "../components/StatusChip";
import CategoryBadge from "../components/CategoryBadge";

type Filter = "all" | Issue["status"];

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export default function DashboardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

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
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

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

  const filteredIssues = useMemo(() => {
    const q = normalize(query);

    return issues.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (q.length === 0) return true;

      const hay = normalize([i.id, i.category, i.description, i.address ?? ""].join(" | "));
      return hay.includes(q);
    });
  }, [issues, filter, query]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Header */}
      <div className="card card-pad">
        <div className="h1">Reports</div>
        <div className="muted" style={{ marginTop: 6 }}>
          Review citizen submissions and update status.
        </div>
      </div>

      {/* Filters + Search */}
      <div className="card card-pad" style={{ display: "grid", gap: 12 }}>
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
          {loading ? "Loading..." : `Showing ${filteredIssues.length} of ${issues.length} reports`}
        </div>

        {error && (
          <div style={{ padding: 10, borderRadius: 12, border: "1px solid #ef4444", color: "#ef4444", fontWeight: 700 }}>
            {error}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th className="th">Photo</th>
              <th className="th">ID</th>
              <th className="th">Category</th>
              <th className="th">Status</th>
              <th className="th">Address</th>
            </tr>
          </thead>

          <tbody>
            {filteredIssues.map((issue) => {
              const photo = issue.photoUrl ?? issue.photoPath ?? null;

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
                    <StatusChip status={issue.status} />
                  </td>

                  <td className="td">{issue.address ?? "—"}</td>
                </tr>
              );
            })}

            {!loading && filteredIssues.length === 0 && (
              <tr>
                <td className="td muted" colSpan={5} style={{ padding: 16 }}>
                  No reports match your filters/search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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