import { MastheadSkeleton, LedgerBodySkeleton } from '@/components/observatory/ObservatorySkeletons';
import styles from '@/components/observatory/observatory.module.css';

/**
 * Suspense fallback for the observatory — the index and
 * /parent-observatory/[childId] alike, sitting under the group-wide
 * app/(dg)/loading.tsx and taking precedence for this segment.
 *
 * This is the whole-page state: the same two fragments ObservatoryLedger uses
 * as its per-stage fallbacks, stacked. When the page shell arrives it swaps
 * this for the identical frame (ObservatorySkeletons is the single source of
 * both), then the masthead pills pop in as the fast read lands, then the body
 * — so the skeleton never flashes or reflows between stages; it only fills in.
 *
 * The one loading announcement lives inside LedgerBodySkeleton, which is
 * visible in every state this file can be seen in — no live region here, or a
 * screen reader would hear the same sentence twice.
 */
export default function Loading() {
  return (
    <div className={styles.obs}>
      <div className={styles.shell} style={{ animation: 'mdoSkelFade 0.3s ease-out' }}>
        <MastheadSkeleton />
        <hr className={`${styles.hairline} ${styles.mastheadRule}`} />
        <LedgerBodySkeleton />
      </div>
    </div>
  );
}
