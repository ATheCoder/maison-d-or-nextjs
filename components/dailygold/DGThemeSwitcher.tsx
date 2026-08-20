'use client';
/**
 * DGThemeSwitcher — the reader's palette picker, in two coats.
 *
 * `rail` is the one the design draws (`06-gallery-themes.html`, `.ink`): seven
 * swatches laid out in a row at the foot of the navigation rail, all of them
 * visible, no toggle to press first. Because it hangs in the rail it reaches
 * every destination the rail does — before this the picker existed on the
 * edition alone, so a reader in the Treasury could not change their ground at
 * all.
 *
 * `float` is the fixed bottom-right puck this file used to be, kept for the
 * one width the rail does not survive: below 768px there is no rail, so the
 * puck is mounted (hidden on wider screens) by DGPageShell. It expands on
 * press because seven 44px targets in a row do not fit a phone.
 *
 * Lifted out of DGHero when the masthead became the gallery's entrance. It was
 * never part of the masthead: it is chrome that happened to be declared there,
 * and a picker nested inside a painting is a picker that disappears the day
 * the painting changes shape.
 *
 * Each swatch carries `data-theme={key}`, so `var(--theme-swatch)` resolves
 * inside that key's own scope — the CSS block that defines a theme is the only
 * place its picker colour lives, and a theme added to globals.css + THEME_KEYS
 * shows up here already coloured.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ds';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';
import { THEME_KEYS, THEME_NAMES } from '@/lib/theme-keys';

/* The selected swatch's ring. Two layers, because the design's ring stands
   2px clear of the dot: a transparent spread opens the gap, the coloured one
   draws in it. A real `outline` would read as a focus ring — the page already
   paints one of those on :focus-visible, and two rings in the same place say
   two different things. */
const ON_RING = '0 0 0 2px transparent, 0 0 0 3.5px color-mix(in srgb, var(--accent) 60%, transparent)';

export default function DGThemeSwitcher({ variant = 'float' }: { variant?: 'float' | 'rail' }) {
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

  /* The rail coat. The 12px dot is the mockup's; the 24px box around it is
     not — a swatch is a control, and WCAG 2.2 asks a control for 24px. The
     folded rail (≤1023px) turns this row into a column and shrinks the box;
     that lives with the rest of the tier in NAV_SHELL_CSS. */
  if (variant === 'rail') {
    return (
      <div className="dg-ink" role="group" aria-label="Reading colour">
        {THEME_KEYS.map((key) => (
          <Button
            key={key}
            variant="bare"
            className="dg-ink-swatch"
            onClick={() => switchTheme(key)}
            aria-label={`Switch to ${THEME_NAMES[key]} theme`}
            aria-pressed={themeKey === key}
            title={THEME_NAMES[key]}
          >
            <span aria-hidden="true" data-theme={key} style={{
              display: 'block',
              borderRadius: '50%',
              background: 'var(--theme-swatch)',
              opacity: themeKey === key ? 1 : 0.85,
              boxShadow: themeKey === key ? ON_RING : 'none',
            }} />
          </Button>
        ))}
      </div>
    );
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
            <Button
              key={key}
              variant="bare"
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
            </Button>
          ))}
        </div>
      )}
      {/* Toggle button — 44px tap target with a 28px swatch inside */}
      <Button
        variant="bare"
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
      </Button>
    </div>
  );
}
