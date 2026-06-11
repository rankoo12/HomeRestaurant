import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import { ApiError, authedGetJson, type HostEventDto } from '@/lib/api';
import { HOST_LINKS } from '../../../host-nav';
import { EventForm } from '../../event-form';

export const dynamic = 'force-dynamic';

/** Event builder — edit mode, reusing the create form (events spec §6). */
export default async function EventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');

  let event: HostEventDto;
  try {
    event = (await authedGetJson<{ event: HostEventDto }>(`/api/host/events/${id}`, token)).event;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }

  return (
    <>
      <SiteNav links={HOST_LINKS} />
      <div className="mx-auto w-full max-w-[820px] px-8 pb-20 pt-10">
        <header className="mb-7 flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] leading-tight">Edit dinner</h1>
          <p className="text-sm text-text-2">{event.title}</p>
        </header>
        <EventForm event={event} />
      </div>
      <Footer />
    </>
  );
}
