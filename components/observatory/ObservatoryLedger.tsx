import type { ObservatoryData } from '@/app/(dg)/parent-observatory/actions';
import { Masthead } from './Masthead';
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
 * One child's observatory, laid out as "The Ledger".
 *
 * Every element on this page is a server component. The only interactions are
 * navigations — the child pills and the edition-day chips are links, and the
 * curiosity expansion is a native <details> — so no client bundle, no state and
 * no effects are involved in a surface whose entire job is to render numbers
 * that were already computed on the server.
 *
 * No ThemeProvider either: this is the grown-ups' room, not the child's paper,
 * and it follows the /family and /gate precedent of painting its own chrome.
 */
export function ObservatoryLedger({ data }: { data: ObservatoryData }) {
  const name = data.child.displayName;

  return (
    <div className={styles.obs}>
      <div className={styles.shell}>
        <Masthead profiles={data.children} activeChildId={data.child.id} weekLabel={data.weekLabel} />

        <hr className={`${styles.hairline} ${styles.mastheadRule}`} />

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
      </div>
    </div>
  );
}
