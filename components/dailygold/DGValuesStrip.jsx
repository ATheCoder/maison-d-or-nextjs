'use client';
/**
 * Daily Gold Values Strip
 * Bottom values bar: Wonder · Wisdom · Kindness · Courage · Connection
 * Purely decorative litany, hidden from assistive tech.
 */
import { Fragment } from 'react';

const VALUES = ['Wonder', 'Wisdom', 'Kindness', 'Courage', 'Connection'];

export default function DGValuesStrip() {
  return (
    <div style={{
      padding: '2rem clamp(1.5rem, 5vw, 4rem)',
      background: 'linear-gradient(to bottom, var(--surface-page), var(--surface-tint))',
      textAlign: 'center',
    }}>
      {/* One flat flex-wrap row: values and dividers are sibling flex items so
          wrapping distributes space evenly instead of dragging each divider
          along with its value. */}
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem 2rem',
          flexWrap: 'wrap',
        }}
      >
        {VALUES.map((value, i) => (
          <Fragment key={value}>
            <span style={{
              fontFamily: 'var(--face-display)',
              fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)',
              fontWeight: 400,
              color: 'var(--accent-readable)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              {value}
            </span>
            {i < VALUES.length - 1 && (
              <span style={{
                width: 40,
                height: 1,
                background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 25%, transparent), transparent)',
              }} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
