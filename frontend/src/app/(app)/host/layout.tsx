import { requireArea } from '@/lib/session';

/** Guards /host/** — host or admin only; guests → /403, unauthenticated → /login. */
export default async function HostLayout({ children }: { children: React.ReactNode }) {
  await requireArea('host');
  return <>{children}</>;
}
