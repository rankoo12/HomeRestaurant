'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Login page. Posts to the proxy (/api/proxy/auth/login), which sets httpOnly
 * cookies. On success, redirects to the guest dashboard. Phase-3 functional UI;
 * the design-system restyle lands in Phase 4.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? 'Login failed');
        return;
      }
      router.push('/guest/dashboard');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={{ maxWidth: 380, margin: '80px auto', padding: '0 24px' }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, marginBottom: 8 }}>Welcome back</h1>
      <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>Log in to your Home Restaurant account.</p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>

        {error && (
          <p role="alert" style={{ color: 'var(--terra)', fontSize: 13.5 }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p style={{ marginTop: 18, fontSize: 14, color: 'var(--text-2)' }}>
        New here?{' '}
        <Link href="/signup" style={{ color: 'var(--gold)' }}>
          Create an account
        </Link>
      </p>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)',
  padding: '10px 12px',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 15,
};

const buttonStyle: React.CSSProperties = {
  marginTop: 6,
  background: 'var(--gold)',
  color: 'var(--on-gold)',
  border: 0,
  borderRadius: 99,
  padding: '12px 18px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};
