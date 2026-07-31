import styles from './observatory.module.css';

/**
 * The shared honest-empty line (spec §3).
 *
 * Absence is shown as absence. No module ever falls back to a zero, a dash in a
 * chart or a sample row — a placeholder here would be indistinguishable from a
 * real reading of the child's week, which is the one thing this surface cannot
 * afford to be.
 */
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}
