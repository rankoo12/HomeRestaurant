import Link from 'next/link';

/**
 * 403 Forbidden — shown when a user reaches an area their role can't access
 * (e.g. a guest hitting /host or /admin). Functional Phase-3 version; final
 * styling with the other edge states in Phase 8.
 */
export default function ForbiddenPage() {
  return (
    <section
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        padding: '80px 32px',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}
        >
          403
        </span>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 32 }}>You don&apos;t have access</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 15 }}>
          This area is restricted. If you think you should have access, log in with the right account.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
          <Link href="/login" style={linkButton}>
            Log in
          </Link>
          <Link href="/events" style={{ ...linkButton, background: 'transparent', color: 'var(--gold)' }}>
            Browse dinners
          </Link>
        </div>
      </div>
    </section>
  );
}

const linkButton: React.CSSProperties = {
  background: 'var(--gold)',
  color: 'var(--on-gold)',
  borderRadius: 99,
  padding: '10px 18px',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
};
