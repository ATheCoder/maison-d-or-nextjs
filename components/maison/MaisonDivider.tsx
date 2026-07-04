import type { CSSProperties } from 'react';

/**
 * MaisonDivider — ─── M ─── in gold-light. Used between sections.
 */
export default function MaisonDivider({ style = {} }: { style?: CSSProperties }) {
  return (
    <div className="mdo-divider" style={{ ...style }}>
      <span>M</span>
    </div>
  );
}
