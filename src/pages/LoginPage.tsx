import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { hasSupabaseConfig, supabase } from "../services/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!hasSupabaseConfig || !supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
      return;
    }

    setSending(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setMessage("Magic link sent. Check your email and open the link to sign in.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <form className="card card-pad" style={{ width: "100%", maxWidth: 460, display: "grid", gap: 12 }} onSubmit={onSubmit}>
        <div>
          <div className="h1">Login</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Enter your email to receive a magic sign-in link.
          </div>
        </div>

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

        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={sending}>
          {sending ? "Sending..." : "Send Magic Link"}
        </button>

        {message && <div className="card card-pad">{message}</div>}

        {error && <div className="card card-pad">{error}</div>}

        <div className="muted" style={{ textAlign: "center" }}>
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </div>
      </form>
    </div>
  );
}
