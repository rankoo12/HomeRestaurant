import Link from 'next/link';
import { Button } from '@/components/atoms';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';

/**
 * FAQ / Support — the help-center page from the pages spec. Static Q&A for
 * guests and hosts; no ticketing system (out of scope for this product).
 */
const GUEST_FAQ = [
  {
    q: 'How do I book a seat?',
    a: 'Open a dinner from Browse, pick your seats, and reserve. Your seats are held for a short window while you pay — if payment fails, you stay on checkout with your details intact and can try another card.',
  },
  {
    q: 'What if the dinner sells out while I’m booking?',
    a: 'Seats are allocated transactionally, so two people can never buy the same chair. If yours is taken mid-checkout, we say so immediately and suggest other dates from the same chef.',
  },
  {
    q: 'When am I charged?',
    a: 'Only when a seat is confirmed. The price you see at checkout — seat subtotal plus the service fee — is exactly what is charged.',
  },
  {
    q: 'Can I cancel a booking?',
    a: 'Yes, from your dashboard before the dinner starts. If the host cancels the event, every confirmed booking is refunded in full automatically.',
  },
  {
    q: 'How do reviews work?',
    a: 'Only guests who paid for and attended a dinner can review it — once, and reviews are never editable after posting. That’s why a chef’s rating means something.',
  },
];

const HOST_FAQ = [
  {
    q: 'How do I become a host?',
    a: 'Apply at Host onboarding: profile, an ID document, and a food-safety declaration. You can draft dinners immediately; publishing opens once an admin approves your application.',
  },
  {
    q: 'Why was my application rejected?',
    a: 'The reviewer’s notes appear on your host dashboard. Fix what they flagged, then edit and resubmit — you re-enter the review queue with your history intact.',
  },
  {
    q: 'When do I get paid?',
    a: 'You earn the full seat price; the platform keeps the guest service fee. Each confirmed booking creates a payout record on your Earnings page, marked paid once the transfer is made.',
  },
  {
    q: 'Can I cancel a dinner?',
    a: 'Yes — but cancelling refunds every confirmed booking in full, so it asks you to confirm first. Unpublishing (no new bookings, existing ones stay) is the gentler tool.',
  },
];

function FaqSection({ title, items }: { title: string; items: Array<{ q: string; a: string }> }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <details key={item.q} className="group rounded-lg border border-line bg-surface p-5">
            <summary className="cursor-pointer list-none font-semibold marker:hidden">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-text-2">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function SupportPage() {
  return (
    <>
      <SiteNav />
      <div className="mx-auto w-full max-w-[820px] px-8 pb-20 pt-14">
        <header className="mb-10 flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-3">
            Support
          </span>
          <h1 className="font-serif text-[38px] leading-tight">How can we help?</h1>
          <p className="text-[15px] text-text-2">
            The short answers to the questions every guest and host asks. For safety concerns,
            start with{' '}
            <Link href="/trust-and-safety" className="text-gold underline-offset-2 hover:underline">
              Trust &amp; Safety
            </Link>
            .
          </p>
        </header>

        <div className="flex flex-col gap-10">
          <FaqSection title="For guests" items={GUEST_FAQ} />
          <FaqSection title="For hosts" items={HOST_FAQ} />
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 rounded-lg border border-line bg-bg-2 p-8 text-center">
          <p className="font-serif text-xl">Still stuck?</p>
          <p className="text-sm text-text-2">
            Browse the dinners while you think it over — most questions answer themselves at the
            table.
          </p>
          <Link href="/events">
            <Button variant="ghost" size="sm">
              Browse dinners
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
