'use client';
/**
 * Daily Gold Values Strip
 * Bottom values bar: Wonder · Wisdom · Kindness · Courage · Connection
 */
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        flexWrap: 'wrap',
      }}>
        {VALUES.map((value, i) => (
          <div key={value} style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
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
              <div style={{
                width: 40,
                height: 1,
                background: `linear-gradient(to right, transparent, ${theme.accentGold}40, transparent)`,
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}