import type { Starter } from '@/lib/observatory/derive';
import styles from './observatory.module.css';

/**
 * F7 · Family conversation starters.
 *
 * Template-rendered from the same rows as F3 and F4 — zero LLM, by decision
 * (spec §4 F7). Every line is reconstructible from something a parent could be
 * shown anyway, which is what makes it honest rather than generated.
 *
 * The module returns null when nothing can be generated: an empty state here
 * would be a card admitting it has nothing to say, and inventing a generic
 * prompt ("ask about her day") would be exactly the fabrication the rest of
 * this surface refuses.
 */
export function StartersCard({ starters }: { starters: Starter[] }) {
  if (starters.length === 0) return null;

  return (
    <section className={`${styles.card} ${styles.cardTight} ${styles.span2}`}>
      <p className={styles.cardkick}>Family conversation starters</p>
      <div className={styles.notes}>
        {starters.map((starter) => (
          <div key={starter.text} className={styles.note}>
            <p className={styles.notetext}>{starter.text}</p>
            <p className={styles.notewhy}>{starter.why}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
