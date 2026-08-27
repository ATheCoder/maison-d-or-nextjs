import type { CSSProperties } from 'react';

/**
 * MMonogram — the gold M seal, used on the landing page and in its footer.
 *
 * Speaks §1 semantic tokens rather than the legacy --gold/--gold-light pair
 * it was drawn against, for the reason every primitive does: --accent is
 * re-scoped by whatever [data-surface] the seal is standing in, so the same
 * SVG is warm gold on parchment, gold-bright on the espresso and navy
 * interludes and the family tone inside an atmosphere — with nothing passed
 * in. The inner ring is derived from the same token instead of naming a
 * second colour, so the two rings cannot drift apart.
 *
 * The M itself is set in the house display face (§2 --face-display) via
 * `style`, not the SVG `font-family` attribute: the old value named Cormorant
 * Garamond, which this app has never loaded, so the seal has always been
 * rendering in the browser's default serif.
 */
export default function MMonogram({
  size = 60,
  style = {},
}: {
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={style} aria-hidden>
      <circle cx="40" cy="40" r="38" stroke="var(--accent)" strokeWidth="1" opacity="0.6" />
      <circle
        cx="40"
        cy="40"
        r="32"
        stroke="color-mix(in srgb, var(--accent) 55%, transparent)"
        strokeWidth="0.5"
        opacity="0.7"
      />
      <text
        x="40"
        y="52"
        textAnchor="middle"
        fontSize="36"
        fontWeight="300"
        fill="var(--accent)"
        letterSpacing="2"
        style={{ fontFamily: 'var(--face-display)' }}
      >
        M
      </text>
    </svg>
  );
}
