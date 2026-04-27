import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import type { Issue } from "../models/issue";
import { getIssues } from "../services/issueService";
import NotificationsPanel from "../components/NotificationsPanel";
import { theme } from "../theme";

const AnalyticsCards = lazy(() => import("../components/AnalyticsCards"));
const ChartsPanel = lazy(() => import("../components/ChartsPanel"));
const SmartSuggestions = lazy(() => import("../components/SmartSuggestions"));

function getMostCommonIssueType(issues: Issue[]) {
  const counts = new Map<string, number>();

  for (const issue of issues) {
    counts.set(issue.category, (counts.get(issue.category) ?? 0) + 1);
  }

  let winner = "None";
  let maxCount = 0;

  for (const [category, count] of counts.entries()) {
    if (count > maxCount) {
      winner = category;
      maxCount = count;
    }
  }

  return winner;
}

export default function AnalyticsPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getIssues();
        if (!alive) return;

        setIssues(data);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load analytics.");
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

  const analyticsSummary = useMemo(() => {
    const total = issues.length;
    const resolved = issues.filter((issue) => issue.status === "resolved").length;
    const mostCommonIssueType = getMostCommonIssueType(issues);
    const resolutionRate = total === 0 ? 0 : Math.round((resolved / total) * 100);

    return {
      total,
      mostCommonIssueType,
      resolutionRate,
    };
  }, [issues]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        className="card card-pad"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <div className="h1">Analytics</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Trend monitoring, issue breakdowns, and operational signals.
          </div>
        </div>
        <NotificationsPanel issues={issues} />
      </div>

      {error && (
        <div className="rounded-xl p-3 border border-red-400 text-red-500 text-sm" style={{ fontFamily: "var(--font-heading)" }}>
          {error}
        </div>
      )}

      <div
        className="card card-pad"
        style={{ display: "grid", gap: 10, background: theme.colors.primaryLight, border: "none" }}
      >
        <div className="h2">Snapshot</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div
            className="text-sm"
            style={{ color: theme.colors.textSecondary, fontFamily: "var(--font-heading)" }}
          >
            Total reports: <strong style={{ color: theme.colors.text }}>{analyticsSummary.total}</strong>
          </div>
          <div
            className="text-sm"
            style={{ color: theme.colors.textSecondary, fontFamily: "var(--font-heading)" }}
          >
            Most common type: <strong style={{ color: theme.colors.text }}>{analyticsSummary.mostCommonIssueType}</strong>
          </div>
          <div
            className="text-sm"
            style={{ color: theme.colors.textSecondary, fontFamily: "var(--font-heading)" }}
          >
            Resolution rate: <strong style={{ color: theme.colors.text }}>{analyticsSummary.resolutionRate}%</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card card-pad">Loading analytics...</div>
      ) : (
        <Suspense fallback={<div className="card card-pad">Loading analytics widgets...</div>}>
          <AnalyticsCards issues={issues} timeframe="all" />
          <SmartSuggestions issues={issues} />
          <ChartsPanel issues={issues} />
        </Suspense>
      )}
    </div>
  );
}
