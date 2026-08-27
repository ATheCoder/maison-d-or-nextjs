import type { CSSProperties, ReactNode } from 'react';
import Eyebrow from './Eyebrow';

/**
 * Stat — a figure and the words that say what it counts.
 *
 * Three rooms had written this: the observatory's trio under the masthead, and
 * the stat tiles on the Daily Gold desk and in the People library — and those
 * last two were the SAME four CSS rules twice, `.dgd .stat .num` and
 * `.lib .stat .num`, byte for byte, down to the 30px and the `.warn` variant.
 * Two identical private copies of a thing is the house's usual signal that the
 * thing wants a name.
 *
 * ── The parts, and why the unit is its own slot ───────────────────────────
 * `figure` is the number. `unit` is what trails it — "of 7", "/ 366", the "m"
 * in "4h 20m" — set a step down and in secondary ink, because it is the
 * denominator or the scale, not the reading. Every call site had already
 * invented this: the observatory carries a `sub` on its numeral type, and both
 * admin tiles wrap theirs in `<span className="muted" style={{fontSize:15}}>`.
 * A slot beats three hand-set spans.
 *
 * `label` is the descriptive line under it, and it is required. A bare number
 * on a page is a riddle; every one of the six real call sites had a label, and
 * the two that also wanted a kicker above get `eyebrow`.
 *
 * ── size ──────────────────────────────────────────────────────────────────
 * The house's usual pair, matching Button's and Field's. `md` is the
 * observatory's reading scale, where three figures ARE the section. `sm` is
 * the admin's, where a tile is one card in a row of three above a working
 * table and a 40px numeral would outshout the table.
 *
 * The label's TYPE moves with the size, and that is deliberate rather than
 * sloppy: at `md` it is the editorial label — uppercase, tracked, the register
 * of a caption under an exhibit — and at `sm` it is a plain caption, because
 * the desk's labels are sentences ("dates a family can open") and sentences do
 * not get set in caps.
 *
 * ── tone ──────────────────────────────────────────────────────────────────
 * `accent` is the admin's `.num.warn`: a figure that is a queue rather than an
 * achievement (uncovered days, days still to fill). It wears
 * accent-readable — the AA tier — because unlike a rule or a fill this is text
 * someone has to read. There is deliberately no `danger` tone: a number is not
 * an error, and the two rooms that wanted to shout used a tinted panel around
 * the tile instead, which is the right place for that.
 */
type StatSize = 'md' | 'sm';
type StatTone = 'primary' | 'accent';

const FIGURE: Record<StatSize, string> = {
  md: 'type-display-section',
  sm: 'type-display-story',
};

const UNIT: Record<StatSize, string> = {
  md: 'type-display-story',
  sm: 'type-body-ui',
};

const LABEL: Record<StatSize, string> = {
  md: 'type-label-editorial text-secondary',
  sm: 'type-caption',
};

const TONE: Record<StatTone, string> = {
  primary: 'text-primary',
  accent: 'text-accent-readable',
};

export default function Stat({
  figure,
  unit,
  label,
  eyebrow,
  eyebrowTone = 'accent',
  size = 'md',
  tone = 'primary',
  className = '',
  style,
}: {
  figure: ReactNode;
  /** The denominator or the scale — "of 7", "/ 366", the "m" in "4h 20m". */
  unit?: ReactNode;
  label: ReactNode;
  eyebrow?: ReactNode;
  eyebrowTone?: 'accent' | 'secondary';
  size?: StatSize;
  tone?: StatTone;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      {eyebrow != null && (
        <Eyebrow rule={false} tone={eyebrowTone} className="mb-1">
          {eyebrow}
        </Eyebrow>
      )}
      {/* leading-none so a row of figures sits on one baseline wherever the
          fluid display token happens to land at this width. */}
      <div className={`${FIGURE[size]} ${TONE[tone]} leading-none`}>
        {figure}
        {unit != null && <span className={`${UNIT[size]} text-secondary`}> {unit}</span>}
      </div>
      <div className={`${LABEL[size]} mt-1.5`}>{label}</div>
    </div>
  );
}
