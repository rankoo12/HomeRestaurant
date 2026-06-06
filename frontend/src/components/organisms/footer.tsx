import Link from 'next/link';
import { Badge, Icon, Logo } from '@/components/atoms';

const COLUMNS: Array<{ heading: string; items: string[] }> = [
  { heading: 'Discover', items: ['Browse dinners', 'Cuisines', 'Cities', 'Gift a seat'] },
  { heading: 'Hosting', items: ['Become a host', 'Host resources', 'Community'] },
  {
    heading: 'Trust & safety',
    items: ['How verification works', 'Food safety', 'Cancellation policy', 'Help center'],
  },
];

export function Footer() {
  return (
    <footer className="mt-[90px] border-t border-line bg-bg-2">
      <div className="mx-auto max-w-[1240px] px-8 pb-10 pt-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex max-w-[280px] flex-col gap-4">
            <Logo size={19} />
            <p className="text-[13.5px] leading-relaxed text-text-2">
              Authentic home-cooked dinners, hosted by verified chefs in their own kitchens. Find a
              seat at someone&apos;s table tonight.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tone="verified">
                <Icon name="shield" size={13} stroke={1.8} /> Verified hosts
              </Badge>
              <Badge tone="gold">
                <Icon name="lock" size={12} stroke={1.8} /> Secure pay
              </Badge>
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-[13px]">
              <div className="text-[11.5px] font-bold uppercase tracking-[0.22em] text-text-3">
                {col.heading}
              </div>
              {col.items.map((item) => (
                <Link key={item} href="/support" className="text-left text-[13.5px] text-text-2 hover:text-text">
                  {item}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="my-[28px] h-px bg-line" />
        <div className="flex flex-col justify-between gap-3 text-[12.5px] text-text-3 sm:flex-row">
          <span>© 2026 Home Restaurant · Inbar Halutzy &amp; Ran Eckstein</span>
          <span className="flex gap-[18px]">
            <Link href="/trust-and-safety">Privacy</Link>
            <Link href="/trust-and-safety">Terms</Link>
            <Link href="/trust-and-safety">Food-safety policy</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
