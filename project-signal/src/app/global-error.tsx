'use client';

/**
 * The last-resort error boundary.
 *
 * Replaces the whole document, so it cannot rely on the application's styles
 * being present. Everything here is inline.
 */
export default function GlobalError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f4f7fb',
          color: '#1b273c',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: '100%',
            background: '#fff',
            border: '1px solid #e4eaf3',
            borderRadius: 14,
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 4px 8px -2px rgba(16,26,44,0.08), 0 16px 32px -8px rgba(16,26,44,0.12)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: '#44536c' }}>
            The application could not recover. Reloading usually resolves it.
          </p>
          {error.digest ? (
            <p style={{ marginTop: 14, fontSize: 12, color: '#5a6b87' }}>
              Reference <code style={{ fontFamily: 'ui-monospace, monospace' }}>{error.digest}</code>
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 26,
              height: 36,
              padding: '0 18px',
              borderRadius: 8,
              border: 'none',
              background: '#2456d6',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
