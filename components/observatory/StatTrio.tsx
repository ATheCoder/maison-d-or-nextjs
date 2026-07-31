import { durationNumeral, editionsNumeral, streakNumeral, type Numeral } from '@/lib/observatory/format';
import { WEEK_DAYS } from '@/lib/observatory/constants';
import styles from './observatory.module.css';

function Stat({ numeral, label }: { numeral: Numeral; label: string }) {
  return (
    <div>
      <div className={styles.num}>
        {numeral.main}
        {numeral.sub ? <span className={styles.numSub}>{numeral.sub}</span> : null}
      </div>
      <div className={styles.numlab}>{label}</div>
    </div>
  );
}

/**
 * The three figures under the masthead.
 *
 * None of them is a score. Time is stated, never rated — there is no target to
 * hit, no colour that means "low", and no comparison to last week or to a
 * sibling (spec §6.2, §6.3). The labels are deliberately descriptive
 * ("with the paper this week"), not evaluative.
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
  return (
    <div className={styles.trio}>
      <Stat numeral={durationNumeral(totalMs)} label="with the paper this week" />
      <Stat numeral={editionsNumeral(editionsOpened, WEEK_DAYS)} label="editions opened" />
      {/* "editions in a row", never "days in a row" — see streakNumeral. */}
      <Stat numeral={streakNumeral(streak)} label="editions in a row" />
    </div>
  );
}
