import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isUserAdmin } from "../services/adminAuthService";
import { hasSupabaseConfig, supabase } from "../services/supabaseClient";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!hasSupabaseConfig || !supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
      return;
    }

    setCreating(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.session) {
        const userId = data.user?.id;

        if (!userId) {
          await supabase.auth.signOut();
          setMessage("Account created, but we could not validate admin access yet. Ask a super admin to add you to public.admins, then sign in.");
          return;
        }

        const admin = await isUserAdmin(userId);
        if (!admin) {
          await supabase.auth.signOut();
          setMessage(`Account created. Ask a super admin to add this user_id to public.admins: ${userId}`);
          return;
        }

        navigate("/dashboard");
        return;
      }

      setMessage("Account created. Verify your email if prompted, then ask a super admin to add your user_id to public.admins before logging in.");
    } catch (signUpError) {
      setError(signUpError instanceof Error ? signUpError.message : "Failed to create account.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="card card-pad auth-panel" onSubmit={onSubmit}>
        <div>
          <div className="h1">Sign Up</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Create an admin account.
          </div>
        </div>

        <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
          Full Name
          <input
            className="input"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Jane Doe"
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
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

        <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
          Password
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </label>

        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={creating}>
          {creating ? "Creating account..." : "Create Account"}
        </button>

        {message && <div className="card card-pad">{message}</div>}

        {error && <div className="card card-pad">{error}</div>}

        <div className="muted" style={{ textAlign: "center" }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </form>
    </div>
  );
}
