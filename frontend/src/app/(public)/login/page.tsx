'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/atoms';

/**
 * Login page. Posts to the proxy (/api/proxy/auth/login), which sets httpOnly
 * cookies. On success, redirects to the guest dashboard.
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
        // 429 = rate limited (Phase 8 hardening) — say so in plain words.
        setError(
          res.status === 429
            ? 'Too many attempts — wait a minute and try again.'
            : (data?.error?.message ?? 'Login failed'),
        );
        return;
      }
      router.push('/guest/dashboard');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto mt-20 max-w-[380px] px-6">
      <h1 className="mb-2 font-serif text-[30px]">Welcome back</h1>
      <p className="mb-6 text-text-2">Log in to your Home Restaurant account.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit" block size="lg" disabled={submitting} className="mt-1.5">
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-[18px] text-sm text-text-2">
        New here?{' '}
        <Link href="/signup" className="text-gold">
          Create an account
        </Link>
      </p>
    </section>
  );
}
