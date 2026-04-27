import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { isUserAdmin } from "../services/adminAuthService";
import { hasSupabaseConfig, supabase } from "../services/supabaseClient";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { authError?: string } | null;
    if (state?.authError) {
      setError(state.authError);
    }
  }, [location.state]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!hasSupabaseConfig || !supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
      return;
    }

    setSigningIn(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        await supabase.auth.signOut();
        setError("Sign-in succeeded but no user session was returned. Please try again.");
        return;
      }

      const admin = await isUserAdmin(userId);
      if (!admin) {
        await supabase.auth.signOut();
        setError("This account is not in the admin allowlist.");
        return;
      }

      navigate("/dashboard");
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Failed to sign in.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="card card-pad auth-panel" onSubmit={onSubmit}>
        <div>
          <div className="h1">Login</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Enter your email and password to sign in.
          </div>
        </div>

        <label style={{ display: "grid", gap: 6, fontFamily: "var(--font-heading)" }}>
          Email
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@fixmycity.ca"
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6, fontFamily: "var(--font-heading)" }}>
          Password
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            minLength={8}
            required
          />
        </label>

        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={signingIn}>
          {signingIn ? "Signing in..." : "Sign In"}
        </button>

        {error && <div className="card card-pad">{error}</div>}

        <div className="muted" style={{ textAlign: "center" }}>
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </div>
      </form>
    </div>
  );
}
