import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUserId, isUserAdmin } from "../services/adminAuthService";
import { hasSupabaseConfig, supabase } from "../services/supabaseClient";

type AccessState = "checking" | "allowed" | "unauthenticated" | "forbidden" | "misconfigured" | "error";

type RequireAdminAuthProps = {
  children: ReactNode;
};

export default function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!hasSupabaseConfig || !supabase) {
        if (!alive) return;
        setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
        setAccessState("misconfigured");
        return;
      }

      try {
        const userId = await getCurrentUserId();
        if (!alive) return;

        if (!userId) {
          setAccessState("unauthenticated");
          return;
        }

        const admin = await isUserAdmin(userId);
        if (!alive) return;

        if (!admin) {
          await supabase.auth.signOut();
          if (!alive) return;
          setAccessState("forbidden");
          return;
        }

        setAccessState("allowed");
      } catch (authError) {
        if (!alive) return;
        setError(authError instanceof Error ? authError.message : "Failed to verify admin access.");
        setAccessState("error");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (accessState === "checking") {
    return <div className="card card-pad">Checking admin access...</div>;
  }

  if (accessState === "misconfigured" || accessState === "error") {
    return <div className="card card-pad">{error ?? "Unable to verify access."}</div>;
  }

  if (accessState === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (accessState === "forbidden") {
    return <Navigate to="/login" replace state={{ authError: "This account is not in the admin allowlist." }} />;
  }

  return <>{children}</>;
}