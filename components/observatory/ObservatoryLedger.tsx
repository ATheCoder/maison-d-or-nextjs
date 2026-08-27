import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Rule } from '@/components/ds';
import { getObservatory, getObservatoryIndex } from '@/app/(dg)/parent-observatory/actions';
import { Masthead } from './Masthead';
import { MastheadSkeleton, LedgerBodySkeleton } from './ObservatorySkeletons';
import { ObservatoryInvite } from './ObservatoryInvite';
import { EmptyNote } from './EmptyNote';
import { StatTrio } from './StatTrio';
import { WeekCard } from './WeekCard';
import { CuriosityCard } from './CuriosityCard';
import { BookshelfCard } from './BookshelfCard';
import { RhythmCard } from './RhythmCard';
import { MilestonesCard } from './MilestonesCard';
import { StartersCard } from './StartersCard';
import { EditionRecapCard } from './EditionRecapCard';
import styles from './observatory.module.css';

/**
 * One child's observatory, laid out as "The Ledger", streamed in two stages.
 *
 * The frame renders immediately; inside it, two Suspense islands resolve in
 * the order their data is cheap: the masthead (one indexed read for the child
 * pills and the week line) lands first, showing every child while the ledger
 * below is still ghosts; the body (the heavy analytics read) fills in second
 * and takes the last skeleton with it. The route-level loading.tsx shows the
 * same two fragments as these fallbacks, so first visit reads as one frame
 * filling in rather than pages replacing each other.
 *
 * Called without a childId — the index at /parent-observatory — it is the
 * first child's observatory: rendered inline, NOT a redirect. The old
 * redirect hop remounted the loading boundary and made a rail press flash
 * two skeletons back to back; this is the fix. The [childId] routes remain
 * the canonical, linkable form the pills and recap chips navigate to.
 *
 * Every element is a server component. The only interactions are navigations
 * — the child pills and the edition-day chips are links, and the curiosity
 * expansion is a native <details> — so no client bundle, no state and no
 * effects are involved in a surface whose entire job is to render numbers
 * that were already computed on the server.
 *
 * No ThemeProvider of its own — and, since 2026-08-27, no palette of its own
 * either. The room is built from the semantic tokens, so it re-scopes with
 * whatever [data-theme] the (dg) shell puts around it: all seven themes are
 * correct here with no props and no data-surface. That replaces the original
 * "the grown-ups' room paints its own chrome, light only", which could not
 * follow a guardian who reads on navy.
 */
export function ObservatoryLedger({ childId, edition }: { childId?: string; edition?: string }) {
  // One promise, shared by both stages — the pills and the "first child"
  // fallback must come from the same read, or a profile created mid-render
  // could seat the switcher and the ledger at two different tables.
  const index = getObservatoryIndex();

  return (
    <div className={styles.obs}>
      <div className={styles.shell}>
        <Suspense fallback={<MastheadSkeleton />}>
          <MastheadStage index={index} activeChildId={childId} />
        </Suspense>

        <Rule className={styles.mastheadRule} />

        <Suspense fallback={<LedgerBodySkeleton />}>
          <LedgerBody index={index} childId={childId} edition={edition} />
        </Suspense>
      </div>
    </div>
  );
}

type IndexPromise = ReturnType<typeof getObservatoryIndex>;

/** Stage one: the pills and the week line, up as soon as the fast read lands. */
async function MastheadStage({ index, activeChildId }: { index: IndexPromise; activeChildId?: string }) {
  const { children, weekLabel } = await index;
  return (
    <Masthead
      profiles={children}
      activeChildId={activeChildId ?? children[0]?.id}
      // The zero-children masthead carries no week line (ObservatoryInvite
      // precedent): a week label over an empty house reads as data about it.
      weekLabel={children.length > 0 ? weekLabel : undefined}
    />
  );
}

/** Stage two: everything below the rule, behind the heavy per-child read. */
async function LedgerBody({
  index,
  childId,
  edition,
}: {
  index: IndexPromise;
  childId?: string;
  edition?: string;
}) {
  let target = childId;
  if (!target) {
    const { children } = await index;
    if (children.length === 0) return <ObservatoryInvite />;
    target = children[0].id;
  }

  const data = await getObservatory(target, edition);
  if (!data) {
    // A foreign, deleted or nonsense id — or a database that could not answer.
    // A named child collapses to the index, which tells an attacker nothing
    // and puts a guardian who mistyped a URL back on their own first child.
    // The index itself has nowhere safer to bounce to (bouncing to itself
    // would loop), so it says honestly that the ledger could not be opened.
    if (childId) redirect('/parent-observatory');
    return <EmptyNote>The observatory could not be opened just now. Refresh to try again.</EmptyNote>;
  }

  const name = data.child.displayName;

  return (
    <>
      <StatTrio
        totalMs={data.week.totalMs}
        editionsOpened={data.week.editionsOpened}
        streak={data.week.streak}
      />

      <div className={styles.grid}>
        <div className={styles.column}>
          <WeekCard bars={data.week.bars} sections={data.week.sections} />
          <CuriosityCard sections={data.themes.sections} topContent={data.themes.topContent} />
          <BookshelfCard books={data.bookshelf} childName={name} />
        </div>

        <div className={styles.column}>
          <RhythmCard rhythm={data.rhythm} />
          <MilestonesCard milestones={data.milestones} />
          <StartersCard starters={data.starters} />
        </div>
      </div>

      <EditionRecapCard childId={data.child.id} childName={name} recap={data.recap} />
    </>
  );
}
