import { Stat } from '@/components/ds';
import { durationNumeral, editionsNumeral, streakNumeral } from '@/lib/observatory/format';
import { WEEK_DAYS } from '@/lib/observatory/constants';
import styles from './observatory.module.css';

/**
 * The three figures under the masthead.
 *
 * None of them is a score. Time is stated, never rated — there is no target to
 * hit, no colour that means "low", and no comparison to last week or to a
 * sibling (spec §6.2, §6.3). The labels are deliberately descriptive
 * ("with the paper this week"), not evaluative — which is also why every Stat
 * here is `tone="primary"`: the accent tone means "this is a queue", and
 * nothing on this page is a queue a parent is meant to work through.
 *
 * `Numeral`'s main/sub split lines up exactly with Stat's figure/unit, so the
 * formatters need no changing: "6" + "of 7", "4h" + "20m".
 */
export function StatTrio({
  totalMs,
  editionsOpened,
  streak,
}: {
  totalMs: number;
  editionsOpened: number;
  streak: number;
}) {
  const duration = durationNumeral(totalMs);
  const editions = editionsNumeral(editionsOpened, WEEK_DAYS);
  // "editions in a row", never "days in a row" — see streakNumeral.
  const inARow = streakNumeral(streak);

  return (
    <div className={styles.trio}>
      <Stat figure={duration.main} unit={duration.sub} label="with the paper this week" />
      <Stat figure={editions.main} unit={editions.sub} label="editions opened" />
      <Stat figure={inARow.main} unit={inARow.sub} label="editions in a row" />
    </div>
  );
}
