'use client';
/**
 * FlagSealCelebration
 * type='new'    → full spin-in celebration overlay (2.5s)
 * type='repeat' → quiet +1 pulse (1.5s)
 */
import { useEffect, useState } from 'react';
import FlagSealMedallion from './FlagSealMedallion';

export default function FlagSealCelebration({ countryCode, countryName, type = 'new', onDone }) {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 40);
    const t2 = setTimeout(() => setPhase('exit'), type === 'new' ? 2400 : 1200);
    const t3 = setTimeout(() => onDone?.(), type === 'new' ? 2900 : 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const visible = phase === 'show';

  if (type === 'repeat') {
    return (
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 9999,
        transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.5})`,
        opacity: visible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        pointerEvents: 'none',
      }}>
        <div style={{ position: 'relative' }}>
          <FlagSealMedallion countryCode={countryCode} countryName={countryName} size="md" earned />
          <div style={{
            position: 'absolute', top: -8, right: -8,
            background: '#D4AF37', color: '#fff',
            borderRadius: '50%', width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>+1</div>
        </div>
        <span style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: '1rem', color: '#C9A96E', fontStyle: 'italic',
        }}>
          {countryName}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      {/* Radial glow backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.2) 0%, transparent 60%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }} />

      {/* Seal + text */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        transform: phase === 'enter' ? 'scale(0.08) rotate(-200deg)'
                 : phase === 'show'  ? 'scale(1) rotate(0deg)'
                 : 'scale(0.85) rotate(5deg)',
        opacity: visible ? 1 : 0,
        transition: phase === 'enter'
          ? 'transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease'
          : 'transform 0.4s ease, opacity 0.45s ease',
      }}>
        {/* Glowing ring */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: -16, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.45) 0%, transparent 70%)',
            animation: visible ? 'flagGlow 1.4s ease-in-out infinite alternate' : 'none',
          }} />
          <FlagSealMedallion countryCode={countryCode} countryName={countryName} size="lg" earned />
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 'clamp(1.2rem, 4vw, 1.7rem)',
            fontWeight: 700, color: '#D4AF37', margin: '0 0 6px',
            textShadow: '0 0 24px rgba(212,175,55,0.6)',
          }}>
            You earned {countryName}!
          </p>
          <p style={{
            fontFamily: 'Lato, sans-serif', fontSize: '0.72rem',
            color: 'rgba(92,74,42,0.65)', margin: 0,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            ✦ Flag Seal Collected ✦
          </p>
        </div>
      </div>

      <style>{`
        @keyframes flagGlow {
          from { transform: scale(0.88); opacity: 0.55; }
          to   { transform: scale(1.12); opacity: 1; }
        }
      `}</style>
    </div>
  );
}