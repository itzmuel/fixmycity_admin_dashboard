import { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { theme } from "../theme";

function linkStyle(active: boolean) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 900,
    border: `1px solid ${active ? theme.colors.primary : theme.colors.border}`,
    color: active ? "#fff" : theme.colors.text,
    background: active ? theme.colors.primary : "#F3F4F6",
    boxShadow: active ? "0 10px 20px rgba(37, 99, 235, 0.18)" : "none",
    transition: "background 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
  } as const;
}

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

  const greeting = useMemo(() => `${getGreeting(new Date().getHours())}, ${displayName}`, [displayName]);

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
            src="/fixmycity-web-icon.png"
            alt="FixMyCity logo"
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              objectFit: "cover",
              border: `1px solid ${theme.colors.border}`,
            }}
          />

          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>FixMyCity</div>
            <div style={{ color: theme.colors.muted, fontWeight: 700, fontSize: 12 }}>City Admin</div>
          </div>
        </div>

        <nav style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <div className="card card-pad" style={{ background: "#F9FAFB" }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>{greeting}</div>
          </div>

          <NavLink to="/dashboard" style={({ isActive }) => linkStyle(isActive)}>
            Dashboard
          </NavLink>

          <NavLink to="/analytics" style={({ isActive }) => linkStyle(isActive)}>
            Analytics
          </NavLink>

          <NavLink to="/assign" style={({ isActive }) => linkStyle(isActive)}>
            Assign
          </NavLink>
        </nav>

        <div style={{ marginTop: 16 }} className="card card-pad">
          <div style={{ fontWeight: 900 }}>Tip</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Click a report to view details and update its status.
          </div>
        </div>

        <button type="button" className="btn btn-danger" style={{ marginTop: "auto", width: "100%" }} disabled={loggingOut} onClick={handleLogout}>
          {loggingOut ? "Logging out..." : "Log Out"}
        </button>
      </aside>

      <main style={{ padding: 16 }}>
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
