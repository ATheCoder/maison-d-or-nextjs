/**
 * Data-access layer — the authorization boundary (docs/auth-plan.md §5).
 *
 * Every page and server action that needs auth calls one of these itself.
 * Never rely on proxy.ts (optimistic redirects only) or a layout (does not
 * re-run on client navigation) for access control.
 */
import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { auth, type Session } from '@/lib/auth';
import { db } from '@/src/db';
import { family, childProfile, type FamilyRow, type ChildProfileRow } from '@/src/db/schema';

/** The current session (or null), read once per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({ headers: await headers() });
});

/** Any logged-in account; redirects to /login otherwise. */
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

/** An admin account; non-admins land on the app root. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (session.user.role !== 'admin') redirect('/');
  return session;
}

/** A guardian account; admins have no family, so they land on /admin. */
export async function requireGuardian(): Promise<Session> {
  const session = await requireUser();
  if (session.user.role !== 'guardian') redirect('/admin');
  return session;
}

/**
 * A guardian plus their family row, for parent-area surfaces. A session in
 * child mode is sent through the grown-up gate first (auth-plan §4) — the
 * gate clears child mode after verifying the guardian PIN or password.
 * The signup hook guarantees every guardian has a family; a missing row
 * would mean tampered data, so it fails closed to /login.
 *
 * `next` is where the gate returns the guardian afterwards. It defaults to the
 * family room, which is where every caller predating the parent observatory
 * wanted to land. The observatory passes its own URL because for *it* the hop
 * through the gate is the normal path, not an edge case — the button that
 * starts it lives on the child's own page (spec §2), and dropping the parent on
 * /family instead would read as the link having failed.
 */
export async function requireFamily(next: string = '/family'): Promise<{ session: Session; family: FamilyRow }> {
  const session = await requireGuardian();
  // Same-origin only, mirroring the gate's own sanitisation (app/gate/page.tsx).
  const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
    ? next
    : '/family';
  if (session.session.activeChildProfileId) redirect(`/gate?next=${encodeURIComponent(safeNext)}`);
  const familyId = session.user.familyId;
  const rows = familyId
    ? await db.select().from(family).where(eq(family.id, familyId)).limit(1)
    : [];
  if (!rows[0]) redirect('/login');
  return { session, family: rows[0] };
}

/**
 * The session's active child profile, verified to belong to the session
 * user's family — or null when there is no session, no child mode, or the
 * profile no longer belongs to that family.
 *
 * The read half of child mode, with no redirect: for surfaces that render for
 * signed-out visitors and simply show nothing child-specific. A null is an
 * absent child, never an authorization pass — anything that *requires* a
 * child must use requireChildContext().
 */
export const getActiveChild = cache(async (): Promise<ChildProfileRow | null> => {
  const session = await getSession();
  const profileId = session?.session.activeChildProfileId;
  const familyId = session?.user.familyId;
  if (!profileId || !familyId) return null;
  const rows = await db
    .select()
    .from(childProfile)
    .where(and(eq(childProfile.id, profileId), eq(childProfile.familyId, familyId)))
    .limit(1);
  return rows[0] ?? null;
});

/**
 * Child mode: the session's active child profile, verified to belong to the
 * session user's family. This is the only way child identity ever reaches
 * child-scoped reads/writes — the client never asserts a profile id
 * (auth-plan §1).
 */
export async function requireChildContext(): Promise<{ session: Session; child: ChildProfileRow }> {
  const session = await requireGuardian();
  const child = await getActiveChild();
  if (!child) redirect('/profiles');
  return { session, child };
}
