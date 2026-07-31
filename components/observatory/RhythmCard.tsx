import type { ObservatoryData } from '@/app/parent-observatory/actions';
import { RHYTHM_BANDS } from '@/lib/observatory/constants';
import { EmptyNote } from './EmptyNote';
import styles from './observatory.module.css';

const LEVEL = ['', '', styles.bandL2, styles.bandL3];

/**
 * F2 · Reading rhythm.
 *
 * A pattern, explicitly not a meter: no target, no goal, no nudge to read more
 * (spec §6.3). The bands are shares of the month, so a quiet month and a busy
 * one with the same shape look identical — the card answers *when*, never *how
 * much*. Hours never appear; the coarsest honest grain is a named part of the
 * day (§6.4).
 */
export function RhythmCard({ rhythm }: { rhythm: ObservatoryData['rhythm'] }) {
  return (
    <section className={styles.card + ' ' + styles.cardTight}>
      <p className={styles.cardkick}>Reading rhythm</p>

      {rhythm ? (
        <>
          <p className={styles.rhythmLine}>{rhythm.sentence}</p>
          <div className={styles.bandGrid}>
            {rhythm.bands.map((band) => (
              <div key={band.key} className={styles.band}>
                <div className={`${styles.bandbar} ${LEVEL[band.level]}`} />
                <span className={styles.bandlab}>{band.label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <EmptyNote>Rhythms appear after a few visits.</EmptyNote>
          <div className={styles.bandGrid} aria-hidden="true">
            {RHYTHM_BANDS.map((band) => (
              <div key={band.key} className={styles.band}>
                <div className={styles.bandbar} />
                <span className={styles.bandlab}>{band.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
