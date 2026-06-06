import { requireArea } from '@/lib/session';

/** Guards /admin/** — admin only; others → /403, unauthenticated → /login. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireArea('admin');
  return <>{children}</>;
}
