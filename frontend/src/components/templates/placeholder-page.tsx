/**
 * Temporary Phase-1 placeholder. Every spec route renders one of these so the
 * full route map is navigable before real screens land. Replaced phase by phase.
 */
export function PlaceholderPage({ title, route }: { title: string; route: string }) {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}
        >
          {route}
        </span>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--text)' }}>{title}</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>This screen is being built next.</p>
      </div>
    </section>
  );
}
