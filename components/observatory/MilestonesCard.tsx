import type { Milestone } from '@/lib/observatory/derive';
import { EmptyNote } from './EmptyNote';
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
 */
export function MilestonesCard({ milestones }: { milestones: Milestone[] }) {
  return (
    <section className={`${styles.card} ${styles.cardTight}`}>
      <p className={styles.cardkick}>Milestones</p>

      {milestones.length === 0 ? (
        <EmptyNote>Milestones collect here as they happen.</EmptyNote>
      ) : (
        <div className={styles.feed}>
          {milestones.map((item, i) => (
            <div key={`${item.kind}-${item.day}-${i}`} className={styles.mrow}>
              <div
                className={`${styles.mdot} ${item.tone === 'sage' ? styles.mdotSage : ''}`}
                aria-hidden="true"
              />
              <p className={styles.mtext}>
                {item.prefix}
                {item.emphasis ? <em>{item.emphasis}</em> : null}
                {item.when ? <span className={styles.mwhen}> · {item.when}</span> : null}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
