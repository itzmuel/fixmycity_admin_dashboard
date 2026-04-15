import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import Papa from "papaparse";
import type { Issue } from "../models/issue";
import "./ExportButton.css";

interface ExportButtonProps {
  issues: Issue[];
}

export default function ExportButton({ issues }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleExportCSV = () => {
    const data = issues.map((issue) => ({
      ID: issue.id,
      Category: issue.category,
      Status: issue.status,
      Priority: issue.priority || "medium",
      Description: issue.description,
      Address: issue.address || "N/A",
      "Created At": new Date(issue.createdAt).toLocaleString(),
      "Updated At": issue.updatedAt
        ? new Date(issue.updatedAt).toLocaleString()
        : "N/A",
    }));

    const csv = Papa.unparse(data);
    downloadFile(csv, "issues_export.csv", "text/csv");
    setIsOpen(false);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(issues, null, 2);
    downloadFile(json, "issues_export.json", "application/json");
    setIsOpen(false);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="export-dropdown" ref={menuRef}>
      <button
        className="export-btn"
        onClick={() => setIsOpen((current) => !current)}
        title="Download reports"
        type="button"
      >
        <Download size={18} />
        Download
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="export-menu">
          <button className="export-menu-item" type="button" onClick={handleExportCSV}>
            Download as CSV
          </button>
          <button className="export-menu-item" type="button" onClick={handleExportJSON}>
            Download as JSON
          </button>
        </div>
      )}
    </div>
  );
}
