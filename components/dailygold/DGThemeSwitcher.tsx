'use client';
/**
 * DGThemeSwitcher — the compact theme picker that floats at the reader's
 * bottom-right corner on the edition.
 *
 * Lifted out of DGHero when the masthead became the gallery's entrance. It was
 * never part of the masthead: it is fixed-position chrome that happened to be
 * declared there, and a picker nested inside a painting is a picker that
 * disappears the day the painting changes shape.
 *
 * Each swatch carries `data-theme={key}`, so `var(--theme-swatch)` resolves
 * inside that key's own scope — the CSS block that defines a theme is the only
 * place its picker colour lives, and a theme added to globals.css + THEME_KEYS
 * shows up here already coloured.
 */
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';
import { THEME_KEYS, THEME_NAMES } from '@/lib/theme-keys';

export default function DGThemeSwitcher() {
  const pathname = usePathname();
  const { themeKey, switchTheme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  // Hide on storybook pages
  if ((pathname || '').includes('storybook')) {
    return null;
  }

  return (
    <div ref={ref} style={{
      position: 'fixed',
      bottom: 'calc(1rem + var(--dg-tabbar-h, 0px))',
      right: '1rem',
      zIndex: 1000,
    }}>
      {expanded && (
        <div style={{
          position: 'absolute',
          bottom: '52px',
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '0.25rem',
          background: 'var(--surface-raised)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-fine)',
          boxShadow: 'var(--shadow-raised)',
        }}>
          {THEME_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => { switchTheme(key); setExpanded(false); }}
              aria-label={`Switch to ${THEME_NAMES[key]} theme`}
              aria-pressed={themeKey === key}
              title={THEME_NAMES[key]}
              style={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span aria-hidden="true" data-theme={key} style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'var(--theme-swatch)',
                opacity: themeKey === key ? 1 : 0.85,
                boxShadow: themeKey === key ? '0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent)' : 'none',
              }} />
            </button>
          ))}
        </div>
      )}
      {/* Toggle button — 44px tap target with a 28px swatch inside */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-label={expanded ? 'Close theme picker' : 'Open theme picker'}
        aria-expanded={expanded}
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span aria-hidden="true" data-theme={themeKey} style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--theme-swatch)',
          border: '1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          boxShadow: 'var(--shadow-card)',
          display: 'block',
        }} />
      </button>
    </div>
  );
}
