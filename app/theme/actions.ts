'use server';

/**
 * The reader's theme preference — the write half of a setting that used to live
 * only in React state (docs/auth-plan.md §8).
 *
 * There is deliberately no id parameter. The profile written to is the session's
 * active child, resolved inside lib/dal.ts and verified to belong to the
 * session user's family, which is the same construction the treasury and
 * passport actions use: a forged POST cannot name someone else's child because
 * there is nowhere to name one. Outside child mode there is no profile to write
 * to at all, so the action is a no-op — a grown-up switching themes in /family
 * changes what they see for the visit and nothing in the database.
 *
 * Nothing here throws: a theme switch is cosmetic, and a failed write must never
 * take down the page the child is reading. The status exists for tests and logs;
 * the UI has already moved on.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/src/db';
import { childProfile } from '@/src/db/schema';
import { getActiveChild } from '@/lib/dal';
import { isThemeKey } from '@/lib/theme-keys';

export type SetThemeResult =
  | { status: 'saved' }
  | { status: 'error'; reason: 'no_child' | 'invalid_theme' | 'db_error' };

export async function setThemePreference(themeName: string): Promise<SetThemeResult> {
  // Whitelist before the session read: an unknown key is a bad request whatever
  // the caller's mode, and never reaches the database.
  if (!isThemeKey(themeName)) return { status: 'error', reason: 'invalid_theme' };

  // Non-redirecting: a theme tap outside child mode is nothing to persist, not
  // a navigation.
  const child = await getActiveChild();
  if (!child) return { status: 'error', reason: 'no_child' };

  try {
    await db
      .update(childProfile)
      .set({ themePreference: themeName, updatedAt: new Date() })
      .where(eq(childProfile.id, child.id));
    return { status: 'saved' };
  } catch (error) {
    console.error('theme: preference write failed', error);
    return { status: 'error', reason: 'db_error' };
  }
}
