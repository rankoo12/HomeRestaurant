import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NotFound from '../not-found';
import ErrorPage from '../error';
import { Skeleton } from '@/components/atoms';
import { PayoutLedger } from '../(app)/admin/payout-ledger';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

/** Render assertions per docs/specs/phases/error-and-empty-states.md (kept light). */
describe('Phase 8 edge states', () => {
  it('branded 404 offers quick links to /events and /', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading').textContent).toBe("This table doesn't exist");
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('/events');
    expect(links).toContain('/');
    cleanup();
  });

  it('error boundary renders a friendly retry that calls reset', () => {
    let resets = 0;
    render(<ErrorPage error={new Error('boom')} reset={() => resets++} />);
    expect(screen.getByRole('heading').textContent).toBe('A pan hit the floor');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(resets).toBe(1);
    cleanup();
  });

  it('skeleton renders as a hidden pulse block (no spinner-only screens)', () => {
    const { container } = render(<Skeleton className="h-9 w-64" />);
    const block = container.firstElementChild!;
    expect(block.getAttribute('aria-hidden')).toBe('true');
    expect(block.className).toContain('animate-pulse');
    cleanup();
  });

  it('admin payout queue renders the friendly empty state, never a blank page', () => {
    render(<PayoutLedger payouts={[]} />);
    expect(screen.getByText('Nothing waiting — nice.')).toBeTruthy();
    cleanup();
  });
});
