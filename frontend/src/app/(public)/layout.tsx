/**
 * Public shell — wraps unauthenticated pages (/, /login, /signup, etc).
 * Nav/Footer arrive with the design system (Phase 4).
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>;
}
