'use server';
/**
 * Profile switching — the Netflix-style picker's server side (auth-plan §4).
 *
 * The invariants live here: active_child_profile_id only ever changes on the
 * session row server-side, after the target profile's PIN is verified (when
 * set) or the guardian override credential is. The client never asserts a
 * profile id into the session, so a forged request cannot bypass a PIN.
 */
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { verifyPassword } from 'better-auth/crypto';
import { db } from '@/src/db';
import { analyticsEvent, childProfile, session as sessionTable, user } from '@/src/db/schema';
import { getActiveChild, requireGuardian } from '@/lib/dal';
import { verifyGuardianCredential } from '@/lib/guardian-credential';
import { ageOnDay, MIN_CHILD_AGE } from '@/lib/child-birth-date';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000; // 5 minutes

// The profile carries a full birthday, so this is the child's real age in
// completed years — not the age they turn this year. Reading level and "Age 9"
// next to a name both flip on the birthday itself rather than on 1 January.
// A row whose date somehow won't parse falls back to MIN_CHILD_AGE, the
// gentlest reading level, rather than blocking entry to the profile.
function ageOf(birthDate: string): number {
  return ageOnDay(birthDate) ?? MIN_CHILD_AGE;
}

export type PickerProfile = {
  id: string;
  displayName: string;
  avatar: string;
  age: number;
  hasPin: boolean;
};

/**
 * The active child in the shape the Daily Gold client components consume
 * (`child.id` / `child.name` / `child.age`), or null outside child mode.
 * Identity comes from the session — the page never asks for a profile id.
 */
export type ActiveChildProfile = {
  id: string;
  name: string;
  age: number;
  avatar: string;
};

export async function getActiveChildProfile(): Promise<ActiveChildProfile | null> {
  const child = await getActiveChild();
  if (!child) return null;
  return {
    id: child.id,
    name: child.displayName,
    age: ageOf(child.birthDate),
    avatar: child.avatar,
  };
}

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
      age: ageOf(c.birthDate),
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
 * Note who handed the tablet to whom (analytics-plan §2): `reader_switch` is
 * the one event the server owns outright — it knows both ends of the switch,
 * and a client can't forget to send it. The row belongs to the reader being
 * entered; `content_id` holds the one being left (null on the session's first
 * entry).
 *
 * Analytics must never cost a child their profile: the whole body is
 * swallowed, so a dead database logs and returns rather than breaking the
 * PIN flow.
 */
async function recordReaderSwitch(fromChildId: string | null, toChildId: string): Promise<void> {
  // Re-entering the profile you're already in isn't a switch.
  if (fromChildId === toChildId) return;
  try {
    await db.insert(analyticsEvent)
      .values({
        id: randomUUID(),
        childId: toChildId,
        eventType: 'reader_switch',
        contentId: fromChildId,
        source: 'server',
        occurredAt: new Date(),
        batchId: `server-switch-${randomUUID()}`,
        seq: 0,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error('profiles: reader_switch insert failed', error);
  }
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

  const fromChildId = session.session.activeChildProfileId ?? null;
  await setActiveProfile(session.session.id, profile.id);
  await recordReaderSwitch(fromChildId, profile.id);
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
  const fromChildId = session.session.activeChildProfileId ?? null;
  await setActiveProfile(session.session.id, rows[0].id);
  await recordReaderSwitch(fromChildId, rows[0].id);
  return { ok: true };
}

/** Leaving child mode for the picker is always free (auth-plan §4). */
export async function exitChildProfile(): Promise<{ ok: boolean }> {
  const session = await requireGuardian();
  await setActiveProfile(session.session.id, null);
  return { ok: true };
}

export type GatePassResult =
  | { ok: true; hasPin: boolean }
  | { ok: false; error: string };

/**
 * The grown-up gate: verify the guardian PIN or password, then drop child
 * mode so parent surfaces (requireFamily) open. The gate page redirects on
 * success.
 *
 * `hasPin` reports whether this guardian has a gate PIN at all. It is not an
 * authorization signal — the gate has already been passed by the time it is
 * read — only the answer to "was that a password because there was no
 * shortcut?", which is what lets the gate offer to set one on the way through
 * (onboarding plan WP-D) instead of leaving the guardian to find /family alone.
 * Deliberately part of the *result* and not of the inputs: nothing the client
 * sends decides it.
 */
export async function passGrownUpGate(credential: string): Promise<GatePassResult> {
  const session = await requireGuardian();
  if (!(await verifyGuardianCredential(session.user.id, credential))) {
    return { ok: false, error: 'That PIN or password is incorrect.' };
  }
  await setActiveProfile(session.session.id, null);
  const rows = await db.select({ pinHash: user.pinHash }).from(user)
    .where(eq(user.id, session.user.id)).limit(1);
  return { ok: true, hasPin: rows[0]?.pinHash != null };
}
