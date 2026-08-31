import { requireAdmin } from '@/lib/dal';
import SignOutButton from '@/components/auth/SignOutButton';

/**
 * Whose session this is, and the door out — the right-hand end of AdminChrome.
 *
 * Its own component, and its own file, for one structural reason: this is the
 * only part of the bar that reads the session, and under Cache Components a
 * session read in a layout outside <Suspense> raises `blocking-route` for the
 * whole segment. Suspending the WHOLE chrome would have worked and been worse —
 * the nav would then wait on the identity, and the two tabs are the part a
 * reader wants first and the part that needs no identity at all. So the layout
 * suspends exactly this, and the bar paints its navigation immediately.
 *
 * app/(dg)/layout.tsx makes the same split for the same reason, one level
 * coarser (ChromeWithIdentity behind DGChromeFallback); the difference is that
 * the reader's rail genuinely cannot be drawn without knowing the child, and
 * this bar's can.
 *
 * requireAdmin() rather than getSession(): every page below already calls it,
 * it is React-cached so this costs no second query within the request, and it
 * means the bar can never render for someone who should not be seeing it.
 */
export default async function AdminAccount() {
  const session = await requireAdmin();

  return (
    <>
      <span className="type-caption hidden text-secondary sm:inline">
        {session.user.name}
      </span>
      <SignOutButton />
    </>
  );
}
