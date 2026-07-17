'use server';
/**
 * Profile switching — the Netflix-style picker's server side (auth-plan §4).
 *
 * The invariants live here: active_child_profile_id only ever changes on the
 * session row server-side, after the target profile's PIN is verified (when
 * set) or the guardian override credential is. The client never asserts a
 * profile id into the session, so a forged request cannot bypass a PIN.
 */
import { and, eq } from 'drizzle-orm';
import { verifyPassword } from 'better-auth/crypto';
import { db } from '@/src/db';
import { childProfile, session as sessionTable } from '@/src/db/schema';
import { requireGuardian } from '@/lib/dal';
import { verifyGuardianCredential } from '@/lib/guardian-credential';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000; // 5 minutes

export type PickerProfile = {
  id: string;
  displayName: string;
  avatar: string;
  hasPin: boolean;
};

export type EnterResult =
  | { ok: true }
  | { ok: false; needPin?: boolean; locked?: boolean; error: string };

/** The tiles the picker shows: names and avatars only (auth-plan §4). */
export async function getProfilesForPicker(): Promise<{ userName: string; inChildMode: boolean; profiles: PickerProfile[] }> {
  const session = await requireGuardian();
  const familyId = session.user.familyId;
  const rows = familyId
    ? await db.select().from(childProfile)
        .where(eq(childProfile.familyId, familyId)).orderBy(childProfile.createdAt)
    : [];
  return {
    userName: session.user.name,
    inChildMode: !!session.session.activeChildProfileId,
    profiles: rows.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      avatar: c.avatar,
      hasPin: c.pinHash != null,
    })),
  };
}

async function setActiveProfile(sessionId: string, profileId: string | null) {
  await db.update(sessionTable)
    .set({ activeChildProfileId: profileId, updatedAt: new Date() })
    .where(eq(sessionTable.id, sessionId));
}

/**
 * Enter a child profile. PIN-protected profiles demand the PIN, with a
 * lockout after repeated failures — attempts are counted in the DB, so
 * retrying across sessions or devices doesn't reset the meter.
 */
export async function enterChildProfile(profileId: string, pin?: string): Promise<EnterResult> {
  const session = await requireGuardian();
  const familyId = session.user.familyId;
  if (!familyId) return { ok: false, error: 'No family on this account.' };

  const rows = await db.select().from(childProfile)
    .where(and(eq(childProfile.id, String(profileId)), eq(childProfile.familyId, familyId)))
    .limit(1);
  const profile = rows[0];
  if (!profile) return { ok: false, error: 'That profile does not exist.' };

  if (profile.pinHash) {
    if (profile.pinLockedUntil && profile.pinLockedUntil > new Date()) {
      const minutes = Math.max(1, Math.ceil((profile.pinLockedUntil.getTime() - Date.now()) / 60000));
      return { ok: false, locked: true, error: `Too many tries. Ask a parent, or wait ${minutes} min.` };
    }
    if (typeof pin !== 'string' || pin === '') {
      return { ok: false, needPin: true, error: 'This profile has a PIN.' };
    }
    const valid = /^\d{4}$/.test(pin) && (await verifyPassword({ hash: profile.pinHash, password: pin }));
    if (!valid) {
      const attempts = profile.pinAttempts + 1;
      const lock = attempts >= MAX_ATTEMPTS;
      await db.update(childProfile)
        .set({
          pinAttempts: lock ? 0 : attempts,
          pinLockedUntil: lock ? new Date(Date.now() + LOCK_MS) : null,
          updatedAt: new Date(),
        })
        .where(eq(childProfile.id, profile.id));
      return lock
        ? { ok: false, locked: true, error: 'Too many tries. Ask a parent, or wait 5 min.' }
        : { ok: false, needPin: true, error: `That PIN isn't right. ${MAX_ATTEMPTS - attempts} tries left.` };
    }
    await db.update(childProfile)
      .set({ pinAttempts: 0, pinLockedUntil: null, updatedAt: new Date() })
      .where(eq(childProfile.id, profile.id));
  }

  await setActiveProfile(session.session.id, profile.id);
  return { ok: true };
}

/**
 * Guardian override (auth-plan §4): the guardian PIN or password unlocks any
 * child profile — for young children, forgotten PINs, and parents viewing a
 * child's experience. Also clears the profile's lockout.
 */
export async function enterChildProfileAsGuardian(profileId: string, credential: string): Promise<EnterResult> {
  const session = await requireGuardian();
  const familyId = session.user.familyId;
  if (!familyId) return { ok: false, error: 'No family on this account.' };
  if (!(await verifyGuardianCredential(session.user.id, credential))) {
    return { ok: false, error: 'That PIN or password is incorrect.' };
  }
  const rows = await db.select({ id: childProfile.id }).from(childProfile)
    .where(and(eq(childProfile.id, String(profileId)), eq(childProfile.familyId, familyId)))
    .limit(1);
  if (!rows[0]) return { ok: false, error: 'That profile does not exist.' };
  await db.update(childProfile)
    .set({ pinAttempts: 0, pinLockedUntil: null, updatedAt: new Date() })
    .where(eq(childProfile.id, rows[0].id));
  await setActiveProfile(session.session.id, rows[0].id);
  return { ok: true };
}

/** Leaving child mode for the picker is always free (auth-plan §4). */
export async function exitChildProfile(): Promise<{ ok: boolean }> {
  const session = await requireGuardian();
  await setActiveProfile(session.session.id, null);
  return { ok: true };
}

/**
 * The grown-up gate: verify the guardian PIN or password, then drop child
 * mode so parent surfaces (requireFamily) open. The gate page redirects on
 * success.
 */
export async function passGrownUpGate(credential: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireGuardian();
  if (!(await verifyGuardianCredential(session.user.id, credential))) {
    return { ok: false, error: 'That PIN or password is incorrect.' };
  }
  await setActiveProfile(session.session.id, null);
  return { ok: true };
}
