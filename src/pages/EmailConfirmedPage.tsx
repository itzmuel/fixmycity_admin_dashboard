import { useEffect, useState } from 'react';

const APP_SCHEME = 'fixmycityapp://login-callback/';

export default function EmailConfirmedPage() {
  const [secondsLeft, setSecondsLeft] = useState(3);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    // Attempt to open the mobile app immediately on mount
    window.location.href = APP_SCHEME;
    setRedirectAttempted(true);

    // Countdown for the UI
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenApp = () => {
    window.location.href = APP_SCHEME;
  };

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

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#111' }}>
          Email Confirmed!
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '1.75rem', lineHeight: 1.6 }}>
          Your FixMyCity account is verified.
          {redirectAttempted && (
            <>
              {' '}
              {secondsLeft > 0
                ? `Opening the app in ${secondsLeft}…`
                : 'If the app did not open, tap the button below.'}
            </>
          )}
        </p>

        <button
          onClick={handleOpenApp}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            width: '100%',
            marginBottom: '0.75rem',
          }}
        >
          Open FixMyCity App
        </button>

        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
          You can close this tab if the app is already open.
        </p>
      </div>
    </div>
  );
}
