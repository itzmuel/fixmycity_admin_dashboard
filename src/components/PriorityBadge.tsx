import type { IssuePriority } from "../models/issue";
import "./PriorityBadge.css";

interface PriorityBadgeProps {
  priority: IssuePriority;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getLabel = () => {
    switch (priority) {
      case "high":
        return "🔴 High";
      case "medium":
        return "🟡 Medium";
      case "low":
        return "🟢 Low";
      default:
        return priority;
    }
  };

  return <span className={`priority-badge priority-${priority}`}>{getLabel()}</span>;
}
