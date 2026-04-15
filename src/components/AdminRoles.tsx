import { useState } from "react";
import { Users, Shield } from "lucide-react";
import "./AdminRoles.css";

export type AdminRole = "super_admin" | "field_worker" | "viewer";

interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  createdAt: Date;
}

interface AdminRolesProps {
  currentUserRole?: AdminRole;
}

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: [
    "View all issues",
    "Edit issues",
    "Change status",
    "Set priority",
    "Manage users",
    "Export data",
    "View analytics",
  ],
  field_worker: [
    "View assigned issues",
    "Update status",
    "Add photos/notes",
    "View limited analytics",
  ],
  viewer: ["View issues", "View analytics", "Export reports"],
};

export default function AdminRoles({
  currentUserRole = "super_admin",
}: AdminRolesProps) {
  const [users, setUsers] = useState<AdminUser[]>([
    {
      id: "1",
      email: "admin@fixmycity.ca",
      role: "super_admin",
      createdAt: new Date("2026-01-01"),
    },
    {
      id: "2",
      email: "field1@fixmycity.ca",
      role: "field_worker",
      createdAt: new Date("2026-02-01"),
    },
    {
      id: "3",
      email: "viewer@fixmycity.ca",
      role: "viewer",
      createdAt: new Date("2026-03-01"),
    },
  ]);

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<AdminRole>("field_worker");

  const handleAddUser = () => {
    if (!newUserEmail) return;

    const newUser: AdminUser = {
      id: String(users.length + 1),
      email: newUserEmail,
      role: newUserRole,
      createdAt: new Date(),
    };

    setUsers([...users, newUser]);
    setNewUserEmail("");
    setShowAddUser(false);
  };

  const handleChangeRole = (id: string, newRole: AdminRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    );
  };

  const handleRemoveUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const canManageUsers = currentUserRole === "super_admin";

  return (
    <div className="admin-roles">
      <div className="roles-header">
        <h3>
          <Shield size={20} /> Admin Roles & Permissions
        </h3>
        <p className="current-role">Your role: {currentUserRole}</p>
      </div>

      {/* Roles Info */}
      <div className="roles-info">
        <h4>Role Permissions</h4>
        <div className="roles-grid">
          {(["super_admin", "field_worker", "viewer"] as AdminRole[]).map((role) => (
            <div key={role} className="role-card">
              <h5>{role.replace(/_/g, " ").toUpperCase()}</h5>
              <ul>
                {ROLE_PERMISSIONS[role].map((perm) => (
                  <li key={perm}>✓ {perm}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Users Management */}
      {canManageUsers && (
        <div className="users-management">
          <div className="management-header">
            <h4>
              <Users size={18} /> Manage Users
            </h4>
            <button
              className="add-btn"
              onClick={() => setShowAddUser(!showAddUser)}
            >
              + Add User
            </button>
          </div>

          {showAddUser && (
            <div className="add-user-form">
              <input
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as AdminRole)}
              >
                <option value="field_worker">Field Worker</option>
                <option value="viewer">Viewer</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <button onClick={handleAddUser} className="confirm-btn">
                Add
              </button>
              <button
                onClick={() => setShowAddUser(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="users-list">
            {users.map((user) => (
              <div key={user.id} className="user-item">
                <div className="user-info">
                  <div className="user-email">{user.email}</div>
                  <div className="user-created">
                    Added: {user.createdAt.toLocaleDateString()}
                  </div>
                </div>
                <div className="user-actions">
                  {canManageUsers && user.id !== "1" && (
                    <>
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleChangeRole(user.id, e.target.value as AdminRole)
                        }
                        className="role-select"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="field_worker">Field Worker</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="remove-btn"
                      >
                        Remove
                      </button>
                    </>
                  )}
                  {user.id === "1" && (
                    <span className="owner-badge">Owner</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
