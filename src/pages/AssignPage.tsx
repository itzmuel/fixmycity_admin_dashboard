import { useState } from "react";
import AdminRoles from "../components/AdminRoles";

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

      <div className="card card-pad" style={{ display: "grid", gap: 14 }}>
        <div className="h2">Settings</div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
          <input
            type="checkbox"
            checked={autoAssignEnabled}
            onChange={(e) => setAutoAssignEnabled(e.target.checked)}
          />
          Enable auto-assignment for new issues
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
          <input
            type="checkbox"
            checked={notifyOnHighPriority}
            onChange={(e) => setNotifyOnHighPriority(e.target.checked)}
          />
          Notify admins instantly for high-priority reports
        </label>

        <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
          Default assignee role
          <select
            className="input"
            value={defaultAssigneeRole}
            onChange={(e) => setDefaultAssigneeRole(e.target.value)}
            style={{ maxWidth: 260 }}
          >
            <option value="field_worker">Field Worker</option>
            <option value="viewer">Viewer</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </label>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save Settings
          </button>
          {saved && <span className="muted">Saved</span>}
        </div>
      </div>
    </div>
  );
}