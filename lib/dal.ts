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
import { eq } from 'drizzle-orm';
import { auth, type Session } from '@/lib/auth';
import { db } from '@/src/db';
import { family, type FamilyRow } from '@/src/db/schema';

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
 * A guardian plus their family row. The signup hook guarantees every
 * guardian has one; a missing row would mean tampered data, so it fails
 * closed to /login.
 */
export async function requireFamily(): Promise<{ session: Session; family: FamilyRow }> {
  const session = await requireGuardian();
  const familyId = session.user.familyId;
  const rows = familyId
    ? await db.select().from(family).where(eq(family.id, familyId)).limit(1)
    : [];
  if (!rows[0]) redirect('/login');
  return { session, family: rows[0] };
}
