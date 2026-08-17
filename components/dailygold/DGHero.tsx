'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';
import { DGEyebrow } from '@/components/dailygold/DGSectionHeader';
import { THEME_KEYS, THEME_NAMES } from '@/lib/theme-keys';

function FloatingParticle({ style }: { style?: CSSProperties }) {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute',
      width: 4, height: 4,
      borderRadius: '50%',
      background: 'var(--accent)',
      opacity: 0.3,
      animation: 'dgFloat 12s ease-in-out infinite',
      filter: 'blur(1px)',
      ...style,
    }} />
  );
}

function ThemeSwitcherSmall() {
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
      {/* Popover with one colour swatch per theme, in a vertical column.
          Each dot carries data-theme={key}, so var(--theme-swatch) resolves
          inside that key's own scope — the CSS block that defines a theme is
          the only place its picker colour lives, and a theme added to
          globals.css + THEME_KEYS shows up here already coloured. */}
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

// Particle scatter, seeded by index so server and client render identically
// (no hydration mismatch) and render stays pure — no client-only state needed.
const seeded = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// Values are rounded to 2 decimals so the server-serialized CSS string and
// the client's computed value are byte-identical (full-precision floats get
// truncated differently during SSR, tripping hydration warnings).
const r2 = (n: number) => Math.round(n * 100) / 100;
const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  left: `${r2(seeded(i) * 100)}%`,
  top: `${r2(seeded(i + 20) * 100)}%`,
  animationDelay: `${r2(seeded(i + 40) * 12)}s`,
  animationDuration: `${r2(10 + seeded(i + 60) * 8)}s`,
  width: `${r2(2 + seeded(i + 80) * 4)}px`,
  height: `${r2(2 + seeded(i + 80) * 4)}px`,
  opacity: r2(0.15 + seeded(i + 100) * 0.3),
}));

export default function DGHero({
  dateStr,
  heroImageUrl,
}: {
  /** The viewed day, already formatted — the masthead never parses a date. */
  dateStr: string;
  /** `EditionRecord.hero_image_url`; absent days render without art. */
  heroImageUrl?: string | null;
}) {
  // Derived directly: the page never borrows another day's imagery to fill a
  // gap, so when the viewed day has no hero the hero simply has no art.
  const imgUrl = heroImageUrl || null;

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      minHeight: 'unset',
      background: 'transparent',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(1.25rem, 4vw, 2rem) clamp(1rem, 4vw, 2rem) clamp(1.5rem, 5vw, 2.5rem)',
      textAlign: 'center',
    }}>
      <style>{`
        @keyframes dgFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-30px) rotate(180deg); opacity: 0.6; }
        }
        @keyframes dgGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.08); }
        }
        @keyframes dgReveal {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dgKenBurns {
          from { transform: scale(1.0); }
          to { transform: scale(1.08); }
        }
      `}</style>

      {/* Daily oil-painting background with gentle Ken Burns zoom */}
      {/* The whole backdrop — art plus wash — is masked away over the last
          slice of the hero. Without it the wash simply stops at the hero's
          bottom edge at ~60–85% opacity, and since it mutes the page's own
          radial texture that step reads as a hard line where the navigator
          below begins. Fading it to nothing hands off to the page background
          the navigator also starts from. */}
      <div style={{
        position: 'absolute', inset: 0,
        overflow: 'hidden',
        borderRadius: 0,
        maskImage: 'linear-gradient(to bottom, black 78%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 78%, transparent 100%)',
      }}>
        {imgUrl && (
          <img
            src={imgUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              inset: 0,
              opacity: 0.75,
              borderRadius: 0,
              animation: 'dgKenBurns 40s ease-in-out infinite alternate',
              maskImage: 'radial-gradient(ellipse 100% 90% at 50% 50%, black 40%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 100% 90% at 50% 50%, black 40%, transparent 100%)',
            }}
          />
        )}
        {/* Warm wash toward the page background — keeps title readable over the painting */}
        <div style={{
          position: 'absolute', inset: 0,
          background: imgUrl
            ? 'linear-gradient(180deg, color-mix(in srgb, var(--surface-page) 80%, transparent) 0%, color-mix(in srgb, var(--surface-page) 60%, transparent) 50%, color-mix(in srgb, var(--surface-page) 85%, transparent) 100%)'
            : 'linear-gradient(160deg, color-mix(in srgb, var(--surface-page) 60%, transparent) 0%, color-mix(in srgb, var(--surface-tint) 50%, transparent) 40%, color-mix(in srgb, var(--surface-page) 60%, transparent) 100%)',
        }} />
      </div>

      {/* Soft breathing glow orb */}
      <div aria-hidden="true" style={{
        position: 'absolute',
        top: '25%', left: '50%',
        transform: 'translateX(-50%)',
        width: 'clamp(260px, 60vw, 500px)',
        height: 'clamp(180px, 42vw, 350px)',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 70%)',
        animation: 'dgGlow 8s ease-in-out infinite',
        pointerEvents: 'none',
        filter: 'blur(20px)',
      }} />

      {/* Floating golden particles (dust in sunlight) */}
      {PARTICLES.map((p, i) => <FloatingParticle key={i} style={p} />)}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 720 }}>
        {/* Date stamp - clearly readable */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
          marginBottom: '1.25rem',
          padding: '0.6rem 1.6rem',
          background: 'color-mix(in srgb, var(--surface-raised) 38%, transparent)',
          backdropFilter: 'blur(8px)',
          border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
          borderRadius: 40,
          animation: 'dgReveal 1s ease-out 0.2s backwards',
          boxShadow: 'var(--shadow-card)',
        }}>
           <div aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />
           <span className="type-label-editorial" style={{ color: 'var(--text-primary)' }}>
            {dateStr}
           </span>
        </div>

        {/* Main title - luminous gold gradient */}
        <h1 className="type-display-hero" style={{
          margin: '0 0 0.75rem',
          animation: 'dgReveal 1.1s ease-out 0.4s backwards',
          backgroundImage: 'linear-gradient(135deg, var(--palette-gold-bright) 0%, var(--accent) 50%, var(--palette-gold) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: '0 2px 20px color-mix(in srgb, var(--accent) 30%, transparent)',
        }}>
          Daily Gold
        </h1>

        {/* Subtitle */}
        <p className="type-body" style={{
          color: 'var(--text-primary)',
          margin: '0 auto 1.25rem',
          maxWidth: 480,
          animation: 'dgReveal 1.2s ease-out 0.6s backwards',
        }}>
          A daily collection of wonder, wisdom and beautiful things happening in our world.
        </p>

        {/* Quote */}
        <p className="type-quote" style={{
          color: 'var(--text-secondary)',
          margin: 0,
          animation: 'dgReveal 1.3s ease-out 0.8s backwards',
        }}>
          &ldquo;Every day holds a little gold. Let&rsquo;s go discover it together.&rdquo;
        </p>

        {/* Scroll indicator - compact */}
        <div style={{
          marginTop: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          animation: 'dgReveal 1.4s ease-out 1.2s backwards',
          justifyContent: 'center',
        }}>
          <div aria-hidden="true" style={{ height: 1, width: 32, background: 'color-mix(in srgb, var(--accent) 25%, transparent)' }} />
          <DGEyebrow as="span" tracking="wide" color="var(--accent-readable)">
            Begin exploring
          </DGEyebrow>
          <div aria-hidden="true" style={{ height: 1, width: 32, background: 'color-mix(in srgb, var(--accent) 25%, transparent)' }} />
        </div>
      </div>

      {/* Bottom fade — peaks just above the edge and returns to nothing, so it
          settles the hero's lower half without leaving an opacity step for the
          navigator to butt up against. */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
        background: 'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--surface-page) 50%, transparent) 65%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Compact theme switcher */}
      <ThemeSwitcherSmall />
    </div>
  );
}
