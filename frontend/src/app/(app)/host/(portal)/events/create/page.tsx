import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { HOST_LINKS } from '../../host-nav';
import { EventForm } from '../event-form';

export const dynamic = 'force-dynamic';

/** Event builder — create mode (events spec §6). Saves as a draft. */
export default function EventBuilderPage() {
  return (
    <>
      <SiteNav links={HOST_LINKS} />
      <div className="mx-auto w-full max-w-[820px] px-8 pb-20 pt-10">
        <header className="mb-7 flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] leading-tight">New dinner</h1>
          <p className="text-sm text-text-2">
            Saved as a draft — publish when you&apos;re ready (and verified).
          </p>
        </header>
        <EventForm />
      </div>
      <Footer />
    </>
  );
}
