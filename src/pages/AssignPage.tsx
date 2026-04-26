import { useState } from "react";
import { Check, Save } from "lucide-react";
import AdminRoles from "../components/AdminRoles";
import { theme } from "../theme";

export default function AssignPage() {
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  const [notifyOnHighPriority, setNotifyOnHighPriority] = useState(true);
  const [defaultAssigneeRole, setDefaultAssigneeRole] = useState("field_worker");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card card-pad">
        <div className="h1">Assign</div>
        <div className="muted" style={{ marginTop: 6 }}>
          Manage admin roles and assignment settings from one place.
        </div>
      </div>

      <AdminRoles currentUserRole="super_admin" />

      <div className="card card-pad" style={{ display: "grid", gap: 16 }}>
        <div className="h2">Settings</div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-heading)",
            fontSize: 14,
            color: theme.colors.text,
            cursor: "pointer",
            padding: "12px 16px",
            borderRadius: 14,
            background: autoAssignEnabled ? theme.colors.primaryLight : "transparent",
            border: `1px solid ${autoAssignEnabled ? theme.colors.primary : theme.colors.border}`,
            transition: "all 0.2s ease",
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: autoAssignEnabled ? theme.colors.primary : theme.colors.border,
              color: "#fff",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
          >
            {autoAssignEnabled && <Check size={14} />}
          </span>
          <input
            type="checkbox"
            checked={autoAssignEnabled}
            onChange={(e) => setAutoAssignEnabled(e.target.checked)}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          />
          Enable auto-assignment for new issues
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-heading)",
            fontSize: 14,
            color: theme.colors.text,
            cursor: "pointer",
            padding: "12px 16px",
            borderRadius: 14,
            background: notifyOnHighPriority ? theme.colors.primaryLight : "transparent",
            border: `1px solid ${notifyOnHighPriority ? theme.colors.primary : theme.colors.border}`,
            transition: "all 0.2s ease",
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: notifyOnHighPriority ? theme.colors.primary : theme.colors.border,
              color: "#fff",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
          >
            {notifyOnHighPriority && <Check size={14} />}
          </span>
          <input
            type="checkbox"
            checked={notifyOnHighPriority}
            onChange={(e) => setNotifyOnHighPriority(e.target.checked)}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          />
          Notify admins instantly for high-priority reports
        </label>

        <label style={{ display: "grid", gap: 6, fontFamily: "var(--font-heading)", fontSize: 14, color: theme.colors.text }}>
          Default assignee role
          <select
            value={defaultAssigneeRole}
            onChange={(e) => setDefaultAssigneeRole(e.target.value)}
            style={{
              maxWidth: 260,
              width: "100%",
              padding: "10px 14px",
              borderRadius: 14,
              border: `1px solid ${theme.colors.border}`,
              outline: "none",
              background: theme.colors.card,
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              color: theme.colors.text,
              cursor: "pointer",
              appearance: "auto",
            }}
          >
            <option value="field_worker">Field Worker</option>
            <option value="viewer">Viewer</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </label>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={handleSave}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 999,
              border: "none",
              background: theme.colors.primary,
              color: "#fff",
              fontFamily: "var(--font-heading)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.primaryHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = theme.colors.primary)}
          >
            <Save size={16} />
            Save Settings
          </button>
          {saved && (
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 13, color: theme.colors.primary }}>
              Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
