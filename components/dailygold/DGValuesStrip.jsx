'use client';
/**
 * Daily Gold Values Strip
 * Bottom values bar: Wonder · Wisdom · Kindness · Courage · Connection
 * Purely decorative litany, hidden from assistive tech.
 */
import { Fragment } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';

const VALUES = ['Wonder', 'Wisdom', 'Kindness', 'Courage', 'Connection'];

export default function DGValuesStrip() {
  const { theme } = useTheme();

  return (
    <div style={{
      padding: '2rem clamp(1.5rem, 5vw, 4rem)',
      background: `linear-gradient(to bottom, ${theme.bgPrimary}, ${theme.bgSoft})`,
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
              fontFamily: theme.fontHeadline,
              fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)',
              fontWeight: 400,
              color: theme.accentGold,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              {value}
            </span>
            {i < VALUES.length - 1 && (
              <span style={{
                width: 40,
                height: 1,
                background: `linear-gradient(to right, transparent, ${theme.accentGold}40, transparent)`,
              }} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
