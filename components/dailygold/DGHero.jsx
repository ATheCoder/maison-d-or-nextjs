'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';

const C = {
  gold: '#C8A96B',
  goldLight: '#D4BF8A',
  goldDark: '#A8884A',
  mocha: '#3A2D24',
  sage: '#7F8F7C',
};

function FloatingParticle({ style }) {
  return (
    <div style={{
      position: 'absolute',
      width: 4, height: 4,
      borderRadius: '50%',
      background: C.gold,
      opacity: 0.3,
      animation: 'dgFloat 12s ease-in-out infinite',
      filter: 'blur(1px)',
      ...style,
    }} />
  );
}

function ThemeSwitcherSmall() {
  const pathname = usePathname();
  const { theme, currentTheme, switchTheme, allThemes } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const ref = useRef(null);

  const themeColors = {
    lightAiry: '#E8D5B0',
    coastalBlue: '#8AAEC8',
    sageEarth: '#8FA88A',
    blushGold: '#D4A898',
    nightMode: '#2A3540',
  };

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setExpanded(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  // Hide on storybook pages
  if ((pathname || '').includes('storybook')) {
    return null;
  }

  return (
    <div ref={ref} style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 1000 }}>
      {/* Popover with five color circles in vertical column */}
      {expanded && (
        <div style={{
          position: 'absolute',
          bottom: '36px',
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          padding: '0.45rem',
          background: theme.bgCard,
          borderRadius: 8,
          border: `1px solid ${theme.accentGold}20`,
          boxShadow: '0 3px 14px rgba(44,36,22,0.12)',
        }}>
          {Object.entries(allThemes).map(([key]) => (
            <button
              key={key}
              onClick={() => { switchTheme(key); setExpanded(false); }}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: 'none',
                background: themeColors[key] || '#ccc',
                cursor: 'pointer',
                opacity: currentTheme === key ? 1 : 0.85,
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          ))}
        </div>
      )}
      {/* Single circular button 28px x 28px */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: themeColors[currentTheme] || '#E8D5B0',
          border: '1.5px solid rgba(201,169,107,0.3)',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      />
    </div>
  );
}

export default function DGHero({ dateStr, heroImageUrl }) {
  const { theme } = useTheme();
  const [imgUrl, setImgUrl] = useState(heroImageUrl || null);

  // Sync when parent resolves the prop asynchronously
  useEffect(() => {
    if (heroImageUrl) setImgUrl(heroImageUrl);
  }, [heroImageUrl]);

  const particles = Array.from({ length: 15 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 12}s`,
    animationDuration: `${10 + Math.random() * 8}s`,
    width: `${2 + Math.random() * 4}px`,
    height: `${2 + Math.random() * 4}px`,
    opacity: 0.15 + Math.random() * 0.3,
  }));

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
      padding: '2rem 2rem 2.5rem',
      textAlign: 'center',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Lato:wght@300;400;700&display=swap');
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
      <div style={{
        position: 'absolute', inset: 0,
        overflow: 'hidden',
        borderRadius: 0,
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
        {/* Warm cream gradient wash — keeps title readable over the painting */}
        <div style={{
          position: 'absolute', inset: 0,
          background: imgUrl
            ? `linear-gradient(180deg, rgba(243,233,216,0.75) 0%, rgba(243,233,216,0.25) 35%, rgba(243,233,216,0.75) 100%)`
            : `linear-gradient(160deg, rgba(243,233,216,0.6) 0%, rgba(240,228,208,0.3) 40%, rgba(243,233,216,0.6) 100%)`,
        }} />
      </div>

      {/* Soft breathing glow orb */}
      <div style={{
        position: 'absolute',
        top: '25%', left: '50%',
        transform: 'translateX(-50%)',
        width: 500, height: 350,
        borderRadius: '50%',
        background: `radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 70%)`,
        animation: 'dgGlow 8s ease-in-out infinite',
        pointerEvents: 'none',
        filter: 'blur(20px)',
      }} />

      {/* Floating golden particles (dust in sunlight) */}
      {particles.map((p, i) => <FloatingParticle key={i} style={p} />)}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 720 }}>
        {/* Date stamp - clearly readable */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
          marginBottom: '1.25rem',
          padding: '0.6rem 1.6rem',
          background: `${theme.bgCard}60`,
          backdropFilter: 'blur(8px)',
          border: `1px solid ${theme.accentGold}40`,
          borderRadius: 40,
          animation: 'dgReveal 1s ease-out 0.2s both',
          boxShadow: theme.shadowSoft,
        }}>
           <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold }} />
           <span style={{
             fontFamily: theme.fontBody,
             fontSize: '0.85rem',
             fontWeight: 400,
             letterSpacing: '0.18em',
             textTransform: 'uppercase',
             color: C.mocha,
           }}>
            {dateStr}
           </span>
        </div>

        {/* Main title - luminous gold gradient */}
        <h1 style={{
          fontFamily: theme.fontHeadline,
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 700,
          margin: '0 0 0.75rem',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          animation: 'dgReveal 1.1s ease-out 0.4s both',
          background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 50%, ${C.goldDark} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: '0 2px 20px rgba(212,175,55,0.3)',
        }}>
          Daily Gold
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: theme.fontBody,
          fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)',
          fontWeight: 300,
          color: theme.textBody,
          margin: '0 auto 1.25rem',
          maxWidth: 480,
          lineHeight: 1.6,
          animation: 'dgReveal 1.2s ease-out 0.6s both',
        }}>
          A daily collection of wonder, wisdom and beautiful things happening in our world.
        </p>

        {/* Quote */}
        <p style={{
          fontFamily: theme.fontHeadline,
          fontStyle: 'italic',
          fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)',
          color: theme.textMuted,
          margin: 0,
          lineHeight: 1.7,
          animation: 'dgReveal 1.3s ease-out 0.8s both',
        }}>
          "Every day holds a little gold. Let's go discover it together."
        </p>

        {/* Scroll indicator - compact */}
        <div style={{
          marginTop: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          animation: 'dgReveal 1.4s ease-out 1.2s both',
          justifyContent: 'center',
        }}>
          <div style={{ height: 1, width: 32, background: `${theme.accentGold}40` }} />
          <span style={{ fontFamily: theme.fontBody, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: `${theme.accentGold}80` }}>
            Begin exploring
          </span>
          <div style={{ height: 1, width: 32, background: `${theme.accentGold}40` }} />
        </div>
      </div>

      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
        background: `linear-gradient(to bottom, transparent, rgba(243,233,216,0.5))`,
        pointerEvents: 'none',
      }} />

      {/* Compact theme switcher */}
      <ThemeSwitcherSmall />
    </div>
  );
}