import type { ElementType, ReactNode } from 'react';
import { Card, Eyebrow, Heading } from '@/components/ds';
import styles from './observatory.module.css';

/**
 * A card on the Ledger: the ds `Card` primitive at this page's padding.
 *
 * Ground, hairline, corner and shadow are all the primitive's — `raised` over
 * `--surface-raised`, the §1.2 fine border, `--radius-lg` (16px, the nearest
 * step to the mock's 14) and `--shadow-card`. The only thing this adds is the
 * editorial padding, which is wider than any of Card's four steps and belongs
 * to the mock rather than to the house.
 *
 * It exists so the seven cards and the six skeleton ghosts cannot drift: before
 * the migration each `<section className={styles.card}>` was one hand-assembled
 * ground/border/radius/shadow quadruple, which is exactly how a dozen DGCards
 * ended up with three different border alphas. A composite built FROM a
 * primitive, not a copy of one.
 */
export function LedgerCard({
  as = 'section' as ElementType,
  variant = 'default',
  className = '',
  children,
  ...rest
}: {
  as?: ElementType;
  /** `tight` is the right column's narrower padding; `wide` is the recap's. */
  variant?: 'default' | 'tight' | 'wide';
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  // `.card` always carries the ground rules and the default padding; the two
  // variants are padding overrides layered on top, in that source order.
  const pad = variant === 'tight' ? styles.cardTight : variant === 'wide' ? styles.cardWide : '';
  return (
    <Card
      as={as}
      tone="raised"
      radius="lg"
      padding="none"
      elevation="card"
      className={`${styles.card} ${pad} ${className}`}
      {...rest}
    >
      {children}
    </Card>
  );
}

/** The card's kicker and title, in the two type tokens they land on. */
export function LedgerCardHead({ kick, title }: { kick: string; title?: ReactNode }) {
  return (
    <>
      <Eyebrow rule={false} className={styles.cardkick}>
        {kick}
      </Eyebrow>
      {title != null ? (
        <Heading level={2} variant="story" className={styles.cardtitle}>
          {title}
        </Heading>
      ) : null}
    </>
  );
}
