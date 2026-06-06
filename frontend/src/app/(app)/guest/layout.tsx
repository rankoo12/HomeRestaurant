import { requireArea } from '@/lib/session';

/** Guards /guest/** — any authenticated user; unauthenticated → /login. */
export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  await requireArea('guest');
  return <>{children}</>;
}
