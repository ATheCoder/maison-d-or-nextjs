import { Prose } from '@/components/ds';
import type { Milestone } from '@/lib/observatory/derive';
import { EmptyNote } from './EmptyNote';
import { LedgerCard, LedgerCardHead } from './LedgerCard';
import styles from './observatory.module.css';

/**
 * F5 · Milestones.
 *
 * Things to mention at dinner, not metrics. Nothing here is earned by *time* —
 * there is no badge for minutes read, by decision (spec §4 F5): minutes are
 * context everywhere else on this page and are never themselves an achievement.
 *
 * Each entry carries a weekday and nothing finer. "Earned the flag of Portugal
 * · Tuesday" is a celebration; the same line with a clock time would be a log.
 *
 * The two kinds of milestone were gold and sage dots in the mock. The token
 * system has no second accent to spend on a category (see BookshelfCard for the
 * same argument), so they are told apart by a filled mark against a ring —
 * categorical, and correct on every theme.
 */
export function MilestonesCard({ milestones }: { milestones: Milestone[] }) {
  return (
    <LedgerCard variant="tight">
      <LedgerCardHead kick="Milestones" />

      {milestones.length === 0 ? (
        <EmptyNote>Milestones collect here as they happen.</EmptyNote>
      ) : (
        <div className={styles.feed}>
          {milestones.map((item, i) => (
            <div key={`${item.kind}-${item.day}-${i}`} className={styles.mrow}>
              <div
                className={`${styles.mdot} ${item.tone === 'sage' ? styles.mdotRing : ''}`}
                aria-hidden="true"
              />
              <Prose variant="body-ui" tone="primary" measure={false} className={styles.mtext}>
                {item.prefix}
                {item.emphasis ? <em>{item.emphasis}</em> : null}
                {item.when ? (
                  <span className={`type-caption ${styles.mwhen}`}> · {item.when}</span>
                ) : null}
              </Prose>
            </div>
          ))}
        </div>
      )}
    </LedgerCard>
  );
}
