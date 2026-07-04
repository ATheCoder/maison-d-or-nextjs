import type { CSSProperties } from 'react';

/**
 * MMonogram — the gold M seal SVG, used throughout all pages.
 */
export default function MMonogram({
  size = 60,
  style = {},
}: {
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={style}>
      <circle cx="40" cy="40" r="38" stroke="var(--gold)" strokeWidth="1" opacity="0.6" />
      <circle cx="40" cy="40" r="32" stroke="var(--gold-light)" strokeWidth="0.5" opacity="0.4" />
      <text
        x="40"
        y="52"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontSize="36"
        fontWeight="300"
        fill="var(--gold)"
        letterSpacing="2"
      >
        M
      </text>
    </svg>
  );
}
