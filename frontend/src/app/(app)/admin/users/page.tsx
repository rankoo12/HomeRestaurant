import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Avatar, Badge, Button } from '@/components/atoms';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import { getCurrentUser } from '@/lib/session';
import { ApiError, authedGetJson, type AdminUserListDto } from '@/lib/api';
import { ADMIN_LINKS } from '../admin-nav';
import { UserActions } from './user-actions';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

const ROLE_TONE: Record<string, 'verified' | 'soon' | 'gold'> = {
  admin: 'gold',
  host: 'verified',
  guest: 'soon',
};

interface SearchParams {
  q?: string;
  role?: string;
  suspended?: string;
  page?: string;
}

function pageHref(params: SearchParams, page: number): string {
  const next = new URLSearchParams();
  if (params.q) next.set('q', params.q);
  if (params.role) next.set('role', params.role);
  if (params.suspended) next.set('suspended', params.suspended);
  if (page > 1) next.set('page', String(page));
  const qs = next.toString();
  return `/admin/users${qs ? `?${qs}` : ''}`;
}

/** User directory — search/filter/paginate, suspend/unsuspend, role change (admin spec §3–§5). */
export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');
  const viewer = await getCurrentUser();

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.role === 'guest' || params.role === 'host' || params.role === 'admin') {
    query.set('role', params.role);
  }
  if (params.suspended === 'true') query.set('suspended', 'true');
  query.set('limit', String(PAGE_SIZE));
  query.set('offset', String((page - 1) * PAGE_SIZE));

  let data: AdminUserListDto;
  try {
    data = await authedGetJson<AdminUserListDto>(`/api/admin/users?${query.toString()}`, token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }
  const pageCount = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const filters: Array<{ label: string; params: SearchParams }> = [
    { label: 'All', params: { q: params.q } },
    { label: 'Guests', params: { q: params.q, role: 'guest' } },
    { label: 'Hosts', params: { q: params.q, role: 'host' } },
    { label: 'Admins', params: { q: params.q, role: 'admin' } },
    { label: 'Suspended', params: { q: params.q, suspended: 'true' } },
  ];
  const activeFilter = params.suspended === 'true' ? 'Suspended' : (params.role ?? 'All');

  return (
    <>
      <SiteNav links={ADMIN_LINKS} />
      <div className="mx-auto w-full max-w-[1100px] px-8 pb-20 pt-10">
        <div className="flex flex-col gap-7">
          <header className="flex flex-col gap-1.5">
            <h1 className="font-serif text-[34px] leading-tight">Users</h1>
            <p className="text-sm text-text-2">
              Suspension kills sessions and unpublishes a host&apos;s dinners; refunds stay
              deliberate, per-event decisions.
            </p>
          </header>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <form method="GET" action="/admin/users" className="flex items-center gap-2">
              <input
                type="search"
                name="q"
                defaultValue={params.q ?? ''}
                placeholder="Search name or email…"
                className="w-64 rounded-sm border border-line bg-bg-2 px-[15px] py-2.5 text-[14px] focus:border-gold-line focus:bg-surface focus:outline-none"
              />
              {params.role && <input type="hidden" name="role" value={params.role} />}
              {params.suspended && <input type="hidden" name="suspended" value={params.suspended} />}
              <Button size="sm" type="submit" variant="ghost">
                Search
              </Button>
            </form>
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              {filters.map((f) => {
                const active =
                  f.label === 'All'
                    ? activeFilter === 'All'
                    : activeFilter.toLowerCase() === f.label.toLowerCase().replace(/s$/, '') ||
                      activeFilter === f.label;
                return (
                  <Link
                    key={f.label}
                    href={pageHref(f.params, 1)}
                    className={`rounded-full border px-3 py-1.5 ${
                      active
                        ? 'border-gold-line bg-gold-soft text-gold-2'
                        : 'border-line text-text-2 hover:border-line-strong'
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {data.users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-12 text-center">
              <p className="font-serif text-xl">No matching users</p>
              <p className="text-sm text-text-2">Try a different search or filter.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[12px] uppercase tracking-[0.08em] text-text-3">
                    <th className="px-5 py-3.5 font-semibold">User</th>
                    <th className="px-5 py-3.5 font-semibold">Role</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-b border-line last:border-0 ${user.isSuspended ? 'opacity-60' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar seed={user.avatarSeed} name={user.fullName} size={34} />
                          <div className="flex flex-col">
                            <span>{user.fullName}</span>
                            <span className="text-[12px] text-text-3">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={ROLE_TONE[user.role] ?? 'soon'}>{user.role}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {user.isSuspended ? (
                          <Badge tone="soon">suspended</Badge>
                        ) : (
                          <span className="text-text-2">active</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <UserActions user={user} viewerId={viewer?.id ?? ''} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 && (
            <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
              <span className="text-text-3">
                Page {page} of {pageCount} · {data.total} users
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={pageHref(params, page - 1)}>
                    <Button size="sm" variant="ghost">
                      Previous
                    </Button>
                  </Link>
                )}
                {page < pageCount && (
                  <Link href={pageHref(params, page + 1)}>
                    <Button size="sm" variant="ghost">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
