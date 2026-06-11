import { requireArea } from '@/lib/session';

/**
 * Onboarding sits OUTSIDE the role-gated (portal) group: guests must reach it
 * to become hosts (chef-onboarding spec §6). Any authenticated user may enter;
 * the backend decides who may actually submit.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireArea('guest'); // any authenticated user
  return <>{children}</>;
}
