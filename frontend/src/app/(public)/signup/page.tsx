'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/atoms';

/**
 * Sign-up page. Posts to the proxy (/api/proxy/auth/register); on success the
 * proxy sets httpOnly cookies and we land on the guest dashboard.
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
        // 429 = rate limited (Phase 8 hardening) — say so in plain words.
        setError(
          res.status === 429
            ? 'Too many attempts — wait a minute and try again.'
            : (data?.error?.message ?? 'Sign-up failed'),
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
      <h1 className="mb-2 font-serif text-[30px]">Join the table</h1>
      <p className="mb-6 text-text-2">
        Create an account to book dinners with verified home chefs.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <Input
          label="Full name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
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
          hint="At least 8 characters, with a letter and a number."
          error={error ?? undefined}
        />
        <Button type="submit" block size="lg" disabled={submitting} className="mt-1.5">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-[18px] text-sm text-text-2">
        Already have an account?{' '}
        <Link href="/login" className="text-gold">
          Log in
        </Link>
      </p>
    </section>
  );
}
