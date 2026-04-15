import { useMemo } from "react";
import type { Issue } from "../models/issue";
import { MapPin, Wrench, CheckCircle, Clock } from "lucide-react";
import "./AnalyticsCards.css";

interface AnalyticsCardsProps {
  issues: Issue[];
  timeframe?: "today" | "week" | "month" | "all";
}

interface StatsData {
  total: number;
  inProgress: number;
  resolved: number;
  avgFixTime: string;
}

function getTimeframeStart(timeframe: string): Date {
  const now = new Date();
  const start = new Date(now);

  switch (timeframe) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "all":
    default:
      start.setFullYear(2000); // far past
  }

  return start;
}

export default function AnalyticsCards({
  issues,
  timeframe = "all",
}: AnalyticsCardsProps) {
  const stats = useMemo(() => {
    const cutoffDate = getTimeframeStart(timeframe);

    const filtered = issues.filter((i) => new Date(i.createdAt) >= cutoffDate);

    const total = filtered.length;
    const inProgress = filtered.filter((i) => i.status === "in_progress").length;
    const resolved = filtered.filter((i) => i.status === "resolved").length;

    // Calculate average fix time (days to resolve from submission)
    const fixTimes: number[] = [];
    filtered.forEach((issue) => {
      if (issue.status === "resolved" && issue.updatedAt) {
        const created = new Date(issue.createdAt).getTime();
        const updated = new Date(issue.updatedAt).getTime();
        const days = (updated - created) / (1000 * 60 * 60 * 24);
        fixTimes.push(days);
      }
    });

    const avgFixTime =
      fixTimes.length > 0
        ? (fixTimes.reduce((a, b) => a + b, 0) / fixTimes.length).toFixed(1)
        : "—";

    return {
      total,
      inProgress,
      resolved,
      avgFixTime: `${avgFixTime} days`,
    } as StatsData;
  }, [issues, timeframe]);

  const resolutionRate = stats.total > 0
    ? ((stats.resolved / stats.total) * 100).toFixed(1)
    : "0";

  return (
    <div className="analytics-cards">
      <div className="card card-total">
        <div className="card-header">
          <MapPin className="card-icon" />
          <span className="card-label">Total Reports</span>
        </div>
        <div className="card-value">{stats.total}</div>
        <div className="card-subtext">in {timeframe}</div>
      </div>

      <div className="card card-in-progress">
        <div className="card-header">
          <Wrench className="card-icon" />
          <span className="card-label">In Progress</span>
        </div>
        <div className="card-value">{stats.inProgress}</div>
        <div className="card-subtext">
          {stats.total > 0
            ? ((stats.inProgress / stats.total) * 100).toFixed(0)
            : "0"}
          % of reports
        </div>
      </div>

      <div className="card card-resolved">
        <div className="card-header">
          <CheckCircle className="card-icon" />
          <span className="card-label">Resolved</span>
        </div>
        <div className="card-value">{stats.resolved}</div>
        <div className="card-subtext">{resolutionRate}% resolution rate</div>
      </div>

      <div className="card card-time">
        <div className="card-header">
          <Clock className="card-icon" />
          <span className="card-label">Avg Fix Time</span>
        </div>
        <div className="card-value">{stats.avgFixTime}</div>
        <div className="card-subtext">to resolution</div>
      </div>
    </div>
  );
}
