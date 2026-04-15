import { useMemo } from "react";
import { Lightbulb } from "lucide-react";
import type { Issue } from "../models/issue";
import "./SmartSuggestions.css";

interface SmartSuggestionsProps {
  issues: Issue[];
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  relatedIssues: string[];
  priority: "low" | "medium" | "high";
}

export default function SmartSuggestions({ issues }: SmartSuggestionsProps) {
  const suggestions = useMemo(() => {
    const sug: Suggestion[] = [];

    // Suggestion 1: High frequency issue areas
    const categoryCount = new Map<string, number>();
    const categoryLocations = new Map<string, Set<string>>();

    issues.forEach((issue) => {
      categoryCount.set(issue.category, (categoryCount.get(issue.category) ?? 0) + 1);

      if (issue.address) {
        const addresses = categoryLocations.get(issue.category) ?? new Set();
        addresses.add(issue.address);
        categoryLocations.set(issue.category, addresses);
      }
    });

    categoryCount.forEach((count, category) => {
      if (count >= 5) {
        sug.push({
          id: `freq-${category}`,
          title: `High Frequency: ${category}`,
          description: `${count} reports of ${category} issues. Consider preventive measures or resource allocation.`,
          relatedIssues: issues
            .filter((i) => i.category === category)
            .slice(0, 3)
            .map((i) => i.id),
          priority: count >= 10 ? "high" : "medium",
        });
      }
    });

    // Suggestion 2: Clustered issues (same location, similar category)
    const addressMap = new Map<string, Issue[]>();
    issues.forEach((issue) => {
      if (issue.address) {
        const arr = addressMap.get(issue.address) ?? [];
        arr.push(issue);
        addressMap.set(issue.address, arr);
      }
    });

    addressMap.forEach((issuesAtAddress, address) => {
      if (issuesAtAddress.length >= 3) {
        const categories = new Set(issuesAtAddress.map((i) => i.category));
        if (categories.size === 1) {
          sug.push({
            id: `cluster-${address}`,
            title: `Clustered Issue: ${address}`,
            description: `${issuesAtAddress.length} similar issues at this location. This might be part of a larger infrastructure problem.`,
            relatedIssues: issuesAtAddress.map((i) => i.id),
            priority: "high",
          });
        }
      }
    });

    // Suggestion 3: Overdue resolutions
    const now = Date.now();
    const overdue = issues
      .filter((i) => i.status === "in_progress")
      .filter((i) => {
        const age = now - new Date(i.createdAt).getTime();
        const days = age / (1000 * 60 * 60 * 24);
        return days > 7;
      });

    if (overdue.length > 0) {
      sug.push({
        id: "overdue",
        title: "Overdue Issues",
        description: `${overdue.length} issues have been in progress for more than 7 days. Consider reviewing status updates.`,
        relatedIssues: overdue.map((i) => i.id),
        priority: "high",
      });
    }

    // Suggestion 4: High priority issues
    const highPriority = issues.filter((i) => i.priority === "high");
    if (highPriority.length > 0) {
      sug.push({
        id: "high-priority",
        title: "High Priority Issues",
        description: `${highPriority.length} high-priority issues require immediate attention.`,
        relatedIssues: highPriority.map((i) => i.id),
        priority: "high",
      });
    }

    return sug;
  }, [issues]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="smart-suggestions">
      <h3>
        <Lightbulb size={20} /> Smart Suggestions
      </h3>
      <div className="suggestions-list">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className={`suggestion-card priority-${suggestion.priority}`}>
            <div className="suggestion-header">
              <h4>{suggestion.title}</h4>
              <span className="priority-badge">{suggestion.priority}</span>
            </div>
            <p className="suggestion-description">{suggestion.description}</p>
            <div className="suggestion-footer">
              {suggestion.relatedIssues.length} related issues
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
