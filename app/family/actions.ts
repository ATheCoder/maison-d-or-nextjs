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
import { hashPassword } from 'better-auth/crypto';
import { db } from '@/src/db';
import { family, familyInvite, user, childProfile } from '@/src/db/schema';
import { getSession, requireFamily } from '@/lib/dal';
import { verifyGuardianCredential } from '@/lib/guardian-credential';
import { isAvatarKey } from '@/lib/avatars';

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
  children: { id: string; displayName: string; birthYear: number; avatar: string; hasPin: boolean }[];
  guardianHasPin: boolean;
};

/** Everything the /family page shows, scoped to the caller's family. */
export async function getFamilyOverview(): Promise<FamilyOverview> {
  const { session, family: fam } = await requireFamily();
  const [members, invites, children, selfRows] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email })
      .from(user).where(eq(user.familyId, fam.id)).orderBy(user.createdAt),
    db.select({ id: familyInvite.id, email: familyInvite.email, expiresAt: familyInvite.expiresAt })
      .from(familyInvite).where(eq(familyInvite.familyId, fam.id)).orderBy(familyInvite.createdAt),
    db.select().from(childProfile).where(eq(childProfile.familyId, fam.id)).orderBy(childProfile.createdAt),
    db.select({ pinHash: user.pinHash }).from(user).where(eq(user.id, session.user.id)).limit(1),
  ]);
  return {
    id: fam.id,
    name: fam.name,
    members: members.map((m) => ({ ...m, isSelf: m.id === session.user.id })),
    invites: invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() })),
    children: children.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      birthYear: c.birthYear,
      avatar: c.avatar,
      hasPin: c.pinHash != null,
    })),
    guardianHasPin: selfRows[0]?.pinHash != null,
  };
}

// ── Child profiles (auth-plan phase 3) ───────────────────────────────────────

const MIN_AGE = 5;
const MAX_AGE = 17;
const validPin = (pin: unknown): pin is string => typeof pin === 'string' && /^\d{4}$/.test(pin);

function validateChildInput(displayName: unknown, birthYear: unknown, avatar: unknown):
  | { ok: true; displayName: string; birthYear: number; avatar: string }
  | { ok: false; error: string } {
  const name = typeof displayName === 'string' ? displayName.trim().slice(0, 40) : '';
  if (name.length < 1) return { ok: false, error: 'Please give the profile a name.' };
  const year = Number(birthYear);
  const age = new Date().getFullYear() - year;
  if (!Number.isInteger(year) || age < MIN_AGE || age > MAX_AGE) {
    return { ok: false, error: `Children are ${MIN_AGE}–${MAX_AGE} years old.` };
  }
  if (!isAvatarKey(avatar)) return { ok: false, error: 'Please pick an avatar.' };
  return { ok: true, displayName: name, birthYear: year, avatar };
}

export async function createChildProfile(input: { displayName: string; birthYear: number; avatar: string }):
  Promise<{ ok: boolean; error?: string }> {
  const { family: fam } = await requireFamily();
  const v = validateChildInput(input?.displayName, input?.birthYear, input?.avatar);
  if (!v.ok) return v;
  await db.insert(childProfile).values({
    id: randomUUID(),
    familyId: fam.id,
    displayName: v.displayName,
    birthYear: v.birthYear,
    avatar: v.avatar,
  });
  return { ok: true };
}

export async function updateChildProfile(profileId: string, input: { displayName: string; birthYear: number; avatar: string }):
  Promise<{ ok: boolean; error?: string }> {
  const { family: fam } = await requireFamily();
  const v = validateChildInput(input?.displayName, input?.birthYear, input?.avatar);
  if (!v.ok) return v;
  await db.update(childProfile)
    .set({ displayName: v.displayName, birthYear: v.birthYear, avatar: v.avatar, updatedAt: new Date() })
    .where(and(eq(childProfile.id, String(profileId)), eq(childProfile.familyId, fam.id)));
  return { ok: true };
}

export async function deleteChildProfile(profileId: string): Promise<{ ok: boolean }> {
  const { family: fam } = await requireFamily();
  // Scoped delete; sessions pointing here go to null via ON DELETE SET NULL.
  await db.delete(childProfile)
    .where(and(eq(childProfile.id, String(profileId)), eq(childProfile.familyId, fam.id)));
  return { ok: true };
}

/** Set or change a child's PIN; also clears any lockout. */
export async function setChildPin(profileId: string, pin: string): Promise<{ ok: boolean; error?: string }> {
  const { family: fam } = await requireFamily();
  if (!validPin(pin)) return { ok: false, error: 'The PIN must be exactly 4 digits.' };
  const pinHash = await hashPassword(pin);
  await db.update(childProfile)
    .set({ pinHash, pinAttempts: 0, pinLockedUntil: null, updatedAt: new Date() })
    .where(and(eq(childProfile.id, String(profileId)), eq(childProfile.familyId, fam.id)));
  return { ok: true };
}

export async function removeChildPin(profileId: string): Promise<{ ok: boolean }> {
  const { family: fam } = await requireFamily();
  await db.update(childProfile)
    .set({ pinHash: null, pinAttempts: 0, pinLockedUntil: null, updatedAt: new Date() })
    .where(and(eq(childProfile.id, String(profileId)), eq(childProfile.familyId, fam.id)));
  return { ok: true };
}

// ── Guardian PIN (grown-up gate credential) ──────────────────────────────────

/** Set or change the guardian's own gate PIN; requires their password. */
export async function setGuardianPin(pin: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const { session } = await requireFamily();
  if (!validPin(pin)) return { ok: false, error: 'The PIN must be exactly 4 digits.' };
  if (typeof password !== 'string' || !(await verifyGuardianCredential(session.user.id, password)) || /^\d{4}$/.test(password)) {
    return { ok: false, error: 'Your password is incorrect.' };
  }
  const pinHash = await hashPassword(pin);
  await db.update(user).set({ pinHash, updatedAt: new Date() }).where(eq(user.id, session.user.id));
  return { ok: true };
}

export async function removeGuardianPin(password: string): Promise<{ ok: boolean; error?: string }> {
  const { session } = await requireFamily();
  if (typeof password !== 'string' || /^\d{4}$/.test(password) || !(await verifyGuardianCredential(session.user.id, password))) {
    return { ok: false, error: 'Your password is incorrect.' };
  }
  await db.update(user).set({ pinHash: null, updatedAt: new Date() }).where(eq(user.id, session.user.id));
  return { ok: true };
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
    const [others, children] = await Promise.all([
      db.select({ id: user.id }).from(user)
        .where(and(eq(user.familyId, currentFamilyId), ne(user.id, session.user.id))).limit(1),
      db.select({ id: childProfile.id }).from(childProfile)
        .where(eq(childProfile.familyId, currentFamilyId)).limit(1),
    ]);
    if (others[0] || children[0]) {
      return { ok: false, error: 'You already belong to a family with other members or child profiles.' };
    }
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
