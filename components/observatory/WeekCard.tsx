import type { SectionMeter } from '@/app/(dg)/parent-observatory/actions';
import type { WeekBar } from '@/lib/observatory/derive';
import { formatMinutes } from '@/lib/observatory/format';
import { EmptyNote } from './EmptyNote';
import styles from './observatory.module.css';

/**
 * F1 · Exploration summary.
 *
 * The rightmost bar is today, and its minutes are the same number the child's
 * own For Parents card shows — same engaged-time predicate, same family
 * timezone, same rounding (see the cross-reference in
 * app/parent-observatory/actions.ts). If these two ever disagree, one of them
 * is lying and the page has lost its reason to exist.
 */
export function WeekCard({ bars, sections }: { bars: WeekBar[]; sections: SectionMeter[] }) {
  const hasReading = bars.some((bar) => bar.ms > 0);

  return (
    <section className={`${styles.card} ${styles.span2}`}>
      <p className={styles.cardkick}>Exploration summary</p>
      <h2 className={styles.cardtitle}>This week</h2>

      {hasReading ? (
        <>
          <div className={styles.bars}>
            {bars.map((bar) => (
              <div key={bar.day} className={styles.barcol}>
                {/* A quiet day shows no number rather than a "0" it would have to defend. */}
                <span className={styles.barmin}>{bar.ms > 0 ? bar.minutes || '<1' : ''}</span>
                <div className={styles.bartrack}>
                  <div
                    className={`${styles.bar} ${bar.isHighlight ? styles.barHi : ''}`}
                    // Percent of the tallest bar; a non-zero day keeps a visible
                    // sliver so "under a minute" never renders as nothing at all.
                    style={{ height: bar.ms > 0 ? `${Math.max(3, bar.height)}%` : '0%' }}
                  />
                </div>
                <span className={styles.barday}>{bar.label}</span>
              </div>
            ))}
          </div>

          <hr className={`${styles.hairline} ${styles.rule}`} />

          {sections.length > 0 ? (
            <div className={styles.meters}>
              {sections.map((meter) => (
                <div key={meter.section} className={styles.srow}>
                  <span className={styles.sname}>{meter.label}</span>
                  <div className={styles.track}>
                    <div className={styles.fill} style={{ width: `${Math.max(4, meter.share)}%` }} />
                  </div>
                  <span className={styles.smin}>{formatMinutes(meter.ms)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote>No section held attention long enough to measure this week.</EmptyNote>
          )}
        </>
      ) : (
        <EmptyNote>No reading yet this week.</EmptyNote>
      )}
    </section>
  );
}
