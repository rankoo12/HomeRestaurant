/**
 * Authenticated shell — wraps guest / host / admin routes. Will host the shared
 * Nav + Footer + role-aware chrome (Phase 4) and route guards (Phase 3).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>;
}
