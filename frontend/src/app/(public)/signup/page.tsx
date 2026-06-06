'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Sign-up page. Posts to the proxy (/api/proxy/auth/register); on success the
 * proxy sets httpOnly cookies and we land on the guest dashboard. Phase-3
 * functional UI; design-system restyle is Phase 4.
 */
export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/proxy/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? 'Sign-up failed');
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
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, marginBottom: 8 }}>Join the table</h1>
      <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>
        Create an account to book dinners with verified home chefs.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={labelStyle}>
          Full name
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            At least 8 characters, with a letter and a number.
          </span>
        </label>

        {error && (
          <p role="alert" style={{ color: 'var(--terra)', fontSize: 13.5 }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{ marginTop: 18, fontSize: 14, color: 'var(--text-2)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--gold)' }}>
          Log in
        </Link>
      </p>
    </section>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 14,
};

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
