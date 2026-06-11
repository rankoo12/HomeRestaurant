import { redirect } from 'next/navigation';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { getCurrentUser } from '@/lib/session';
import { OnboardingWizard } from './onboarding-wizard';

export const dynamic = 'force-dynamic';

/**
 * Host onboarding — multi-step wizard (chef-onboarding spec §3/§6). Existing
 * hosts are sent to their dashboard; the wizard is for applicants.
 */
export default async function HostOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'host') redirect('/host/dashboard');

  return (
    <>
      <SiteNav links={[{ href: '/events', label: 'Browse' }]} />
      <div className="mx-auto w-full max-w-[720px] px-8 pb-20 pt-10">
        <OnboardingWizard suggestedName={user.fullName} />
      </div>
      <Footer />
    </>
  );
}
