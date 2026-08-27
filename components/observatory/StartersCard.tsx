import { Card } from '@/components/ds';
import type { Starter } from '@/lib/observatory/derive';
import { LedgerCard, LedgerCardHead } from './LedgerCard';
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
 *
 * A starter used to be set in Dancing Script. §2.1 admits no third face — the
 * argument that deleted the Great Vibes flourish from /signup — so it is
 * `type-quote` now, the house's Fraunces Italic, which is what the scale has
 * for a line that is meant to be said out loud.
 */
export function StartersCard({ starters }: { starters: Starter[] }) {
  if (starters.length === 0) return null;

  return (
    <LedgerCard variant="tight" className={styles.span2}>
      <LedgerCardHead kick="Family conversation starters" />
      <div className={styles.notes}>
        {starters.map((starter) => (
          <Card key={starter.text} tone="tint" bordered padding="none" className={styles.note}>
            <p className={`type-quote text-primary ${styles.notetext}`}>{starter.text}</p>
            <p className={`type-caption ${styles.notewhy}`}>{starter.why}</p>
          </Card>
        ))}
      </div>
    </LedgerCard>
  );
}
