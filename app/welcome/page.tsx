import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/src/db';
import { childProfile, user } from '@/src/db/schema';
import { requireFamily } from '@/lib/dal';
import WelcomeWizard from '@/components/welcome/WelcomeWizard';

export const metadata = { title: 'Welcome — Maison d\'Oré' };

/**
 * First run. A guardian with no readers yet has nothing to do anywhere else in
 * the app, so /profiles sends them here and this page sends them back the
 * moment a reader exists — the rule is structural (does the family have a
 * child?) rather than a "seen the wizard" flag, so an abandoned setup heals
 * itself on the next visit and a finished one can never re-open.
 *
 * Authorization is this page's own, via the DAL, not proxy.ts: requireFamily
 * also routes a session that is somehow in child mode through the grown-up gate
 * first, and returns it here afterwards.
 */
export default async function WelcomePage() {
  const { session, family: fam } = await requireFamily('/welcome');

  const [children, guardians] = await Promise.all([
    db.select({ id: childProfile.id }).from(childProfile)
      .where(eq(childProfile.familyId, fam.id)).limit(1),
    db.select({ id: user.id }).from(user).where(eq(user.familyId, fam.id)),
  ]);

  // The other half of the self-healing rule.
  if (children[0]) redirect('/profiles');

  return (
    <WelcomeWizard
      guardianName={session.user.name}
      familyName={fam.name}
      timezone={fam.timezone}
      /**
       * An invited co-parent arrives into a household that already has a name
       * and a timezone someone else chose deliberately; asking them to confirm
       * it would invite them to overwrite it. Decided server-side — the client
       * is told which steps it has, not asked.
       */
      askFamilyStep={guardians.length <= 1}
    />
  );
}
