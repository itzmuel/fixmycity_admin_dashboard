import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate("/dashboard");
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

        <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
          Create Account
        </button>

        <div className="muted" style={{ textAlign: "center" }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </form>
    </div>
  );
}
