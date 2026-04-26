import type { IssueStatus } from "../models/issue";

type Props = { status: IssueStatus };

function getStyle(status: IssueStatus) {
  switch (status) {
    case "submitted":
      return {
        label: "Submitted",
        bg: "var(--color-primary-light)",
        fg: "var(--color-primary)",
        border: "var(--color-primary-light)",
      };
    case "in_progress":
      return {
        label: "In Progress",
        bg: "#D9ECFF",
        fg: "#0B4A8B",
        border: "#D9ECFF",
      };
    case "resolved":
      return {
        label: "Resolved",
        bg: "#DFF7E8",
        fg: "#0B6B2A",
        border: "#DFF7E8",
      };
  }
}

export default function StatusChip({ status }: Props) {
  const s = getStyle(status);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontFamily: "var(--font-heading)",
        fontSize: 12,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}
