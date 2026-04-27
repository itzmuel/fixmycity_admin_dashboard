import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { IssuePriority } from "../models/issue";
import "./PriorityBadge.css";

interface PriorityBadgeProps {
  priority: IssuePriority;
}

function getPriorityConfig(priority: IssuePriority) {
  switch (priority) {
    case "high":
      return { icon: <AlertTriangle size={14} />, label: "High" };
    case "medium":
      return { icon: <AlertCircle size={14} />, label: "Medium" };
    case "low":
      return { icon: <Info size={14} />, label: "Low" };
  }
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = getPriorityConfig(priority);

  return (
    <span className={`priority-badge priority-${priority}`}>
      {config.icon}
      {config.label}
    </span>
  );
}
