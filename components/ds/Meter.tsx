import type { CSSProperties } from 'react';

/**
 * Meter — a horizontal proportion bar: a track with a fill across some of it.
 *
 * It arrived after being hand-rolled six times in three files: the
 * observatory's section shares, curiosity shares and bookshelf attention, the
 * person editor's generation and illustration progress, and the almanac's
 * coverage. All six were 5px tall. None of them agreed on anything else — two
 * different ink-tinted troughs (`rgba(36,26,12,.1)` and `rgba(92,74,42,.1)`),
 * a flat gold fill and two different gold gradients, and three different
 * radii. That is the shape of a primitive that should have existed.
 *
 * ── The one decision this component is really about ───────────────────────
 * **A bar that is not progress must not claim to be one.** The observatory's
 * bookshelf bar is a book's share of a child's own reading time, NOT how far
 * through the book they are — there is no page count to divide by, and the
 * card carries a paragraph saying so. A screen reader that announced it as
 * "62 percent complete" would be inventing the very fact the card refuses to
 * invent.
 *
 * So a Meter is DECORATION by default: aria-hidden, no role, no value. Pass a
 * `label` and only then does it become a real `role="progressbar"` with
 * aria-valuenow — because a label is the caller stating what the number
 * means, which is exactly the claim that makes it announceable. If you cannot
 * write the label, you do not have a progressbar.
 *
 * ── minVisible ────────────────────────────────────────────────────────────
 * A fill of 0.4% rounds to nothing on screen, so a real reading renders as an
 * empty track — indistinguishable from "no data", which is the one thing the
 * observatory may not say. `minVisible` floors the drawn width so a non-zero
 * value always keeps a sliver. It deliberately does NOT floor a genuine zero:
 * absence stays absent. (The call sites open-coded `Math.max(4, share)`,
 * which floored zero too — a difference that never showed only because zeroes
 * never reached those bars.)
 *
 * The height is fixed at 5px and there is no size prop: all six call sites
 * were already 5px, and a second height should have to be argued for.
 *
 * ── Width: w-full, deliberately not flex-1 ────────────────────────────────
 * Inside a flex row (a section meter between its name and its figure) `w-full`
 * plus the default `flex: 0 1 auto` shrinks the track to exactly the space
 * left over — the empty div's min-content is 0, so there is no floor to fight.
 * Given a width by the caller (the bookshelf's 220px rail under a title) it
 * takes that instead. `flex-1` would look tidier and break the second case:
 * it sets flex-basis to 0 and a `width` cannot override a basis, so every
 * bookshelf bar would stretch the row. Leave this alone.
 */
type MeterTone = 'accent' | 'faint';

const FILL: Record<MeterTone, string> = {
  accent: 'var(--accent)',
  /* A reading that has receded — the shelf's "set aside". Not --danger: a book
     someone put down is not an error, and the card's wording is built on that. */
  faint: 'var(--text-faint)',
};

export default function Meter({
  value,
  tone = 'accent',
  minVisible = 0,
  label,
  className = '',
  style,
}: {
  /** 0–100. Values outside the range are clamped rather than overflowing the track. */
  value: number;
  tone?: MeterTone;
  /** Floor, in percent, for the drawn width of a NON-ZERO value. */
  minVisible?: number;
  /** What the number means. Its presence is what makes this a progressbar. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const drawn = clamped > 0 ? Math.max(minVisible, clamped) : 0;
  const announced = label != null;

  return (
    <div
      className={`h-[5px] w-full overflow-hidden rounded-full bg-meter-track ${className}`}
      style={style}
      {...(announced
        ? {
            role: 'progressbar',
            'aria-label': label,
            'aria-valuenow': Math.round(clamped),
            'aria-valuemin': 0,
            'aria-valuemax': 100,
          }
        : { 'aria-hidden': true })}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${drawn}%`, background: FILL[tone] }}
      />
    </div>
  );
}
