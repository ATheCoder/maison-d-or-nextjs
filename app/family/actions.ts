'use server';
/**
 * Family management actions (auth-plan phase 2). Server actions are open
 * endpoints, so every one starts from the session via the DAL and scopes all
 * reads/writes to the caller's own family — invite ids, emails, and tokens
 * from the client are never trusted beyond lookup keys.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, ne } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/src/db';
import { family, familyInvite, user } from '@/src/db/schema';
import { getSession, requireFamily } from '@/lib/dal';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

async function inviteUrl(token: string) {
  const origin = (await headers()).get('origin') || process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  return `${origin}/invite/${token}`;
}

export type FamilyOverview = {
  id: string;
  name: string;
  members: { id: string; name: string; email: string; isSelf: boolean }[];
  invites: { id: string; email: string; expiresAt: string }[];
};

/** Everything the /family page shows, scoped to the caller's family. */
export async function getFamilyOverview(): Promise<FamilyOverview> {
  const { session, family: fam } = await requireFamily();
  const [members, invites] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email })
      .from(user).where(eq(user.familyId, fam.id)).orderBy(user.createdAt),
    db.select({ id: familyInvite.id, email: familyInvite.email, expiresAt: familyInvite.expiresAt })
      .from(familyInvite).where(eq(familyInvite.familyId, fam.id)).orderBy(familyInvite.createdAt),
  ]);
  return {
    id: fam.id,
    name: fam.name,
    members: members.map((m) => ({ ...m, isSelf: m.id === session.user.id })),
    invites: invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() })),
  };
}

export async function renameFamily(name: string): Promise<{ ok: boolean; error?: string }> {
  const { family: fam } = await requireFamily();
  const trimmed = typeof name === 'string' ? name.trim().slice(0, 80) : '';
  if (trimmed.length < 2) return { ok: false, error: 'Please give the family a name.' };
  await db.update(family).set({ name: trimmed, updatedAt: new Date() }).where(eq(family.id, fam.id));
  return { ok: true };
}

/**
 * Create (or rotate) an invite for a co-guardian. Returns the invite URL —
 * the only moment the raw token exists, so the UI shows it for copying.
 * Actual email delivery needs a mail provider; until one is wired up the
 * guardian shares the link themselves.
 */
export async function createInvite(email: string): Promise<{ ok: true; url: string; email: string } | { ok: false; error: string }> {
  const { session, family: fam } = await requireFamily();
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) return { ok: false, error: 'Please enter a valid email address.' };
  if (normalized === session.user.email.toLowerCase()) return { ok: false, error: 'That is your own email.' };

  const existingMember = await db.select({ id: user.id }).from(user)
    .where(and(eq(user.email, normalized), eq(user.familyId, fam.id))).limit(1);
  if (existingMember[0]) return { ok: false, error: 'That person is already in the family.' };

  const token = randomBytes(24).toString('base64url');
  const values = {
    tokenHash: hashToken(token),
    invitedBy: session.user.id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  };
  // One live invite per (family, email): re-inviting rotates token + expiry.
  await db.insert(familyInvite)
    .values({ id: randomUUID(), familyId: fam.id, email: normalized, ...values })
    .onConflictDoUpdate({ target: [familyInvite.familyId, familyInvite.email], set: values });

  return { ok: true, url: await inviteUrl(token), email: normalized };
}

export async function revokeInvite(inviteId: string): Promise<{ ok: boolean }> {
  const { family: fam } = await requireFamily();
  // Scoped delete — an id from another family silently does nothing.
  await db.delete(familyInvite)
    .where(and(eq(familyInvite.id, String(inviteId)), eq(familyInvite.familyId, fam.id)));
  return { ok: true };
}

/** Look up an invite by raw token for the /invite/[token] landing page. */
export async function getInviteByToken(token: string) {
  if (typeof token !== 'string' || !token) return null;
  const rows = await db
    .select({
      id: familyInvite.id,
      email: familyInvite.email,
      expiresAt: familyInvite.expiresAt,
      familyId: familyInvite.familyId,
      familyName: family.name,
    })
    .from(familyInvite)
    .innerJoin(family, eq(family.id, familyInvite.familyId))
    .where(eq(familyInvite.tokenHash, hashToken(token)))
    .limit(1);
  const invite = rows[0];
  if (!invite || invite.expiresAt < new Date()) return null;
  return { email: invite.email, familyName: invite.familyName, expired: false };
}

/**
 * Accept an invite: moves the caller into the inviting family. Bound to the
 * invite's email address, and only for guardians who aren't already in a
 * family with other members (v1: one family per guardian). The fresh
 * auto-created family from the invitee's signup is deleted once vacated.
 */
export async function acceptInvite(token: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  if (session.user.role !== 'guardian') return { ok: false, error: 'Only parent or guardian accounts can join a family.' };

  const rows = await db.select().from(familyInvite)
    .where(eq(familyInvite.tokenHash, hashToken(String(token)))).limit(1);
  const invite = rows[0];
  if (!invite || invite.expiresAt < new Date()) return { ok: false, error: 'This invite link is invalid or has expired.' };
  if (invite.email !== session.user.email.toLowerCase()) {
    return { ok: false, error: `This invite was sent to ${invite.email}. Log in with that account to accept it.` };
  }

  const currentFamilyId = session.user.familyId ?? null;
  if (currentFamilyId === invite.familyId) {
    await db.delete(familyInvite).where(eq(familyInvite.id, invite.id));
    return { ok: true };
  }
  if (currentFamilyId) {
    const others = await db.select({ id: user.id }).from(user)
      .where(and(eq(user.familyId, currentFamilyId), ne(user.id, session.user.id))).limit(1);
    // TODO(phase 3): also block when the current family has child profiles.
    if (others[0]) return { ok: false, error: 'You already belong to a family with other members.' };
  }

  await db.transaction(async (tx) => {
    await tx.update(user).set({ familyId: invite.familyId, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));
    await tx.delete(familyInvite).where(eq(familyInvite.id, invite.id));
    if (currentFamilyId) {
      const remaining = await tx.select({ id: user.id }).from(user)
        .where(eq(user.familyId, currentFamilyId)).limit(1);
      if (!remaining[0]) await tx.delete(family).where(eq(family.id, currentFamilyId));
    }
  });
  return { ok: true };
}

/** Form-action wrapper for the invite landing page's Join button. */
export async function acceptInviteAndGoToFamily(token: string): Promise<{ ok: boolean; error?: string }> {
  const result = await acceptInvite(token);
  if (result.ok) redirect('/family');
  return result;
}
