import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { theme } from "../theme";
import { LogOut, LayoutDashboard, BarChart3, Bell, UserCheck, Lightbulb, Smile } from "lucide-react";
import logoSvg from "../assets/logo.svg";

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getDisplayName(user: { email?: string | null; user_metadata?: { full_name?: string | null } } | null) {
  const fullName = user?.user_metadata?.full_name?.trim();
  if (fullName) return fullName;

  const email = user?.email?.trim();
  if (!email) return "Admin";

  return email.split("@")[0] || email;
}

export default function AppShell() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [displayName, setDisplayName] = useState("Admin");

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!supabase) return;

      const { data, error } = await supabase.auth.getSession();
      if (!alive || error) return;

      setDisplayName(getDisplayName(data.session?.user ?? null));
    })();

    const {
      data: { subscription },
    } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setDisplayName(getDisplayName(session?.user ?? null));
    }) ?? { data: { subscription: { unsubscribe() {} } } };

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      setLoggingOut(false);
      navigate("/login");
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          padding: 16,
          borderRight: `1px solid ${theme.colors.border}`,
          background: theme.colors.card,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={logoSvg}
            alt="FixMyCity logo"
            style={{
              width: 44,
              height: 44,
              objectFit: "contain",
            }}
          />

          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16, color: theme.colors.text }}>FixMyCity</div>
            <div style={{ color: theme.colors.muted, fontFamily: "var(--font-heading)", fontSize: 12 }}>City Admin</div>
          </div>
        </div>

        <nav style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <div
            className="card card-pad"
            style={{ background: theme.colors.primaryLight }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-heading)", fontSize: 14, color: theme.colors.text }}>
              <Smile size={16} color={theme.colors.primary} />
              {`${getGreeting(new Date().getHours())},`}
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 14, color: theme.colors.text, paddingLeft: 22 }}>
              {displayName}
            </div>
          </div>

          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <NavLink to="/analytics" className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}>
            <BarChart3 size={18} />
            Analytics
          </NavLink>

          <NavLink to="/notifications" className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}>
            <Bell size={18} />
            Notifications
          </NavLink>

          <NavLink to="/assign" className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}>
            <UserCheck size={18} />
            Assign
          </NavLink>
        </nav>

        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <div
            className="card card-pad"
            style={{ background: theme.colors.primaryLight, border: "none" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Lightbulb size={16} color={theme.colors.primary} />
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, color: theme.colors.text }}>Tip</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: theme.colors.textSecondary, fontWeight: 600 }}>
              Click a report to view details and update its status.
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <button
          type="button"
          disabled={loggingOut}
          onClick={handleLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 999,
            fontFamily: "var(--font-heading)",
            fontSize: 14,
            cursor: "pointer",
            opacity: loggingOut ? 0.5 : 1,
            transition: "all 0.2s ease",
          }}
          className="btn-logout"
        >
          <LogOut size={18} />
          {loggingOut ? "Logging out..." : "Log Out"}
        </button>
      </aside>

      <main style={{ padding: 24 }}>
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
