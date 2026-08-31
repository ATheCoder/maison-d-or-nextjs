import { Suspense } from 'react';
import AdminChrome from '@/components/admin/AdminChrome';
import AdminAccount from '@/components/admin/AdminAccount';

/**
 * The admin's shared frame.
 *
 * This used to be a five-line div that set the parchment theme and nothing
 * else, which is why each of the six admin screens had invented its own answer
 * to "where am I and how do I leave" — see the argument in AdminChrome. The
 * theme scope is unchanged; what is new is that the bar above the content is
 * now a layout segment, so Next reuses it across client navigations between
 * admin routes and it never unmounts as you move desk → day → almanac →
 * library → person.
 *
 * The Suspense boundary is load-bearing, not decoration. Reading the session is
 * request-time work, and under Cache Components doing it in a layout outside a
 * boundary is a `blocking-route` error for the whole segment. It wraps only the
 * account, so the navigation paints without waiting on the identity — the split
 * AdminAccount exists to make.
 *
 * The fallback is a fixed-width box rather than nothing: the account cluster
 * sits at the end of a flex row, and letting it arrive from zero width would
 * shove the credit chip sideways the moment the session resolved.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="parchment" className="min-h-dvh bg-surface-page">
      <AdminChrome
        account={
          <Suspense fallback={<span aria-hidden className="inline-block w-[7.5rem]" />}>
            <AdminAccount />
          </Suspense>
        }
      >
        {children}
      </AdminChrome>
    </div>
  );
}
