import { useEffect, useState } from "react";
import { Filter, X } from "lucide-react";
import type { Issue, IssueStatus } from "../models/issue";
import "./AdvancedFilters.css";

interface AdvancedFiltersProps {
  issues: Issue[];
  onFilter: (filtered: Issue[]) => void;
}

export default function AdvancedFilters({
  issues,
  onFilter,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<IssueStatus[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  // Get unique categories from issues
  const categories = Array.from(
    new Set(issues.map((i) => i.category))
  ).sort();

  // Apply filters
  useEffect(() => {
    let filtered = issues;

    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((i) => new Date(i.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((i) => new Date(i.createdAt) <= to);
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((i) => selectedCategories.includes(i.category));
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((i) => selectedStatuses.includes(i.status));
    }

    if (selectedPriorities.length > 0) {
      filtered = filtered.filter((i) =>
        selectedPriorities.includes(i.priority || "medium")
      );
    }

    onFilter(filtered);
  }, [dateFrom, dateTo, selectedCategories, selectedStatuses, selectedPriorities, issues, onFilter]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleStatusToggle = (status: IssueStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handlePriorityToggle = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority]
    );
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
  };

  const totalFilters =
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    selectedCategories.length +
    selectedStatuses.length +
    selectedPriorities.length;

  return (
    <div className="advanced-filters">
      <button
        className="filter-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Filter size={18} />
        Filters {totalFilters > 0 && <span className="filter-count">{totalFilters}</span>}
      </button>

      {isOpen && (
        <div className="filter-panel">
          <div className="filter-header">
            <h4>Advanced Filters</h4>
            <button onClick={() => setIsOpen(false)} className="close-btn">
              <X size={18} />
            </button>
          </div>

          <div className="filter-content">
            {/* Date range */}
            <div className="filter-group">
              <label>Date Range</label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From"
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="filter-group">
              <label>Categories</label>
              <div className="checkbox-group">
                {categories.map((cat) => (
                  <label key={cat} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => handleCategoryToggle(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="filter-group">
              <label>Status</label>
              <div className="checkbox-group">
                {(["submitted", "in_progress", "resolved"] as IssueStatus[]).map((status) => (
                  <label key={status} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status)}
                      onChange={() => handleStatusToggle(status)}
                    />
                    {status.replace("_", " ")}
                  </label>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="filter-group">
              <label>Priority</label>
              <div className="checkbox-group">
                {["low", "medium", "high"].map((priority) => (
                  <label key={priority} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedPriorities.includes(priority)}
                      onChange={() => handlePriorityToggle(priority)}
                    />
                    {priority}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="filter-footer">
            <button onClick={resetFilters} className="reset-btn">
              Reset All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
