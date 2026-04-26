import { useEffect } from "react";
import { supabase } from "../services/supabaseClient";

export default function EmailConfirmedPage() {
  // Exchange the confirmation token that Supabase appends to this URL
  // (hash fragment for implicit flow, ?code= for PKCE flow).
  // supabase-js v2 processes the URL automatically during getSession().
  useEffect(() => {
    supabase?.auth.getSession();
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fb',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '2.5rem 2rem',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Checkmark icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontFamily: "var(--font-heading)", marginBottom: '0.5rem', color: '#111' }}>
          Email Confirmed!
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '0.5rem', lineHeight: 1.6 }}>
          Your FixMyCity account is verified.
        </p>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
          You can return to the app and sign in.
        </p>
      </div>
    </div>
  );
}
