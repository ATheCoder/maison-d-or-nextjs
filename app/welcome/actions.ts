'use server';
/**
 * The one action the /welcome wizard owns: finishing.
 *
 * Everything the wizard *writes* on the way through already had a home —
 * renameFamily, setFamilyTimezone, createChildProfile, createInvite — and the
 * wizard calls those directly. What did not exist is the last step: putting the
 * grown-up into the reader they have just made, so the wizard ends inside the
 * paper rather than back at a picker with one tile on it.
 *
 * That step goes through `enterChildProfile` (app/profiles/actions.ts), which
 * is the same verified path the picker uses: it re-reads the profile scoped to
 * the caller's own family and honours a PIN if one is set. `active_child_profile_id`
 * is written in exactly one place in this codebase and this is not it
 * (auth-plan §4).
 *
 * Note there is no profile id parameter. The wizard has just created the
 * family's first reader, so the newest row in the caller's own family *is* that
 * reader — resolving it server-side means no id crosses the wire and a forged
 * POST has nothing to name.
 */
import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/src/db';
import { childProfile } from '@/src/db/schema';
import { requireFamily } from '@/lib/dal';
import { enterChildProfile } from '@/app/profiles/actions';

/**
 * Enters the new reader and lands on today's edition. `welcome=1` is the only
 * thing that travels — the edition reads the reader's name from the session it
 * already resolves, so the banner cannot be summoned for someone else's child
 * by editing the URL.
 *
 * Returns only on failure; success redirects (which throws, hence no value).
 */
export async function finishWelcome(): Promise<{ ok: false; error: string } | void> {
  const { family: fam } = await requireFamily('/welcome');

  const rows = await db
    .select({ id: childProfile.id })
    .from(childProfile)
    .where(eq(childProfile.familyId, fam.id))
    .orderBy(desc(childProfile.createdAt), desc(childProfile.id))
    .limit(1);
  const newest = rows[0];
  if (!newest) return { ok: false, error: 'Add your first reader before finishing.' };

  const entered = await enterChildProfile(newest.id);
  if (!entered.ok) return { ok: false, error: entered.error };

  // Outside any try/catch by construction: redirect() signals by throwing.
  redirect('/daily-gold-edition?welcome=1');
}
