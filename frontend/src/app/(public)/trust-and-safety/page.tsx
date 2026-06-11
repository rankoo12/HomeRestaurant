import Link from 'next/link';
import { Button, Icon, type IconName } from '@/components/atoms';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';

/**
 * Trust & Safety portal — the informational page from the pages spec: identity
 * verification, hygiene rules, community guidelines, cancellation policies.
 * Static content; the enforced versions of these promises live in the product
 * (KYC queue, publish gate, transactional booking, RBAC).
 */
const PILLARS: Array<{ icon: IconName; h: string; d: string }> = [
  {
    icon: 'shield',
    h: 'Identity verification',
    d: 'Every host submits a government ID and a food-safety declaration before applying. A human admin reviews each application; only approved chefs can publish a dinner or appear in discovery. Look for the "ID verified" and "Food-safety certified" badges on a chef\'s profile.',
  },
  {
    icon: 'flame',
    h: 'Hygiene & kitchen rules',
    d: 'Hosts declare their food-safety practices at onboarding and re-enter review if anything changes. Dinners list every course up front so allergies and dietary needs are visible before you book — your dietary preferences are shared with the host on the guest roster.',
  },
  {
    icon: 'users',
    h: 'Community guidelines',
    d: 'Be a generous guest and an honest host. Reviews can only be written by guests who actually paid for and attended a dinner — one review per table, never editable after posting. Anyone can report a review; a human moderator decides what stays.',
  },
  {
    icon: 'card',
    h: 'Payments & cancellations',
    d: 'Your card is charged only when a seat is confirmed — seats are reserved transactionally, so a dinner can never be oversold. If a host cancels an event, every confirmed booking is refunded in full, automatically. Refunds land on the card you paid with.',
  },
];

export default function TrustSafetyPage() {
  return (
    <>
      <SiteNav />
      <div className="mx-auto w-full max-w-[820px] px-8 pb-20 pt-14">
        <header className="mb-10 flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-3">
            Trust &amp; Safety
          </span>
          <h1 className="font-serif text-[38px] leading-tight">
            You&apos;re eating in a stranger&apos;s home. Here&apos;s why that&apos;s safe.
          </h1>
          <p className="text-[15px] text-text-2">
            Trust isn&apos;t a checkbox here — it&apos;s the product. These are the promises the
            platform makes, and how each one is enforced.
          </p>
        </header>

        <div className="flex flex-col gap-5">
          {PILLARS.map((p) => (
            <section key={p.h} className="flex gap-4 rounded-lg border border-line bg-surface p-6">
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-gold-soft text-gold-2">
                <Icon name={p.icon} size={18} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h2 className="font-serif text-xl">{p.h}</h2>
                <p className="text-sm leading-relaxed text-text-2">{p.d}</p>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 rounded-lg border border-line bg-bg-2 p-8 text-center">
          <p className="font-serif text-xl">Something didn&apos;t feel right?</p>
          <p className="text-sm text-text-2">
            Report a review from any chef or event page, or reach us through support — a human
            reads every report.
          </p>
          <Link href="/support">
            <Button variant="ghost" size="sm">
              Go to support
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
