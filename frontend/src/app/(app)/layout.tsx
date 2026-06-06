/**
 * App shell — wraps the in-app routes. Note: discovery (`/events`, `/chefs`) is
 * PUBLIC per docs/specs/identity/03-rbac.md, so auth is NOT enforced here.
 * Role/auth guards live in the per-area layouts (guest/host/admin). The shared
 * Nav + Footer chrome arrives with the design system (Phase 4).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>;
}
