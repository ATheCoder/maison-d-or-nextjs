import { Prose } from '@/components/ds';
import styles from './observatory.module.css';

/**
 * The shared honest-empty line (spec §3).
 *
 * Absence is shown as absence. No module ever falls back to a zero, a dash in a
 * chart or a sample row — a placeholder here would be indistinguishable from a
 * real reading of the child's week, which is the one thing this surface cannot
 * afford to be.
 *
 * Faint ink and italic are what mark it as a note ABOUT the data rather than a
 * reading of it — the one place on this page where a sentence is not a fact.
 */
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <Prose variant="caption" tone="faint" measure={false} className={`italic ${styles.empty}`}>
      {children}
    </Prose>
  );
}
