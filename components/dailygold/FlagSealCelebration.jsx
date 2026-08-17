// @ts-nocheck — untyped .jsx from before checkJs was on; 5 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * FlagSealCelebration
 * type='new'    → full spin-in celebration overlay (2.5s)
 * type='repeat' → quiet +1 pulse (1.5s)
 */
import { useEffect, useRef, useState } from 'react';
import FlagSealMedallion from './FlagSealMedallion';

// Visually hidden but still announced by screen readers.
const VISUALLY_HIDDEN = {
  position: 'absolute', width: 1, height: 1,
  padding: 0, margin: -1, border: 0,
  overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
};

export default function FlagSealCelebration({ countryCode, countryName, type = 'new', onDone }) {
  const [phase, setPhase] = useState('enter');

  // Keep the latest onDone without retriggering the timeline when the parent
  // re-renders with a new callback identity.
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 40);
    const t2 = setTimeout(() => setPhase('exit'), type === 'new' ? 2400 : 1200);
    const t3 = setTimeout(() => onDoneRef.current?.(), type === 'new' ? 2900 : 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [type]);

  const visible = phase === 'show';

  const announcement = type === 'new'
    ? `You earned the ${countryName} flag seal!`
    : `${countryName} flag seal collected again.`;

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
        <span role="status" style={VISUALLY_HIDDEN}>{announcement}</span>
        <div style={{ position: 'relative' }}>
          <FlagSealMedallion countryCode={countryCode} countryName={countryName} size="md" earned />
          <div aria-hidden="true" style={{
            position: 'absolute', top: -8, right: -8,
            background: 'var(--accent)', color: 'var(--palette-ink)',
            borderRadius: '50%', width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--face-sans)', fontSize: 12, fontWeight: 700,
            boxShadow: 'var(--shadow-card)',
          }}>+1</div>
        </div>
        <span aria-hidden="true" className="type-body-ui font-display italic" style={{ color: 'var(--accent-readable)' }}>
          {countryName}
        </span>
      </div>
    );
  }

  return (
    // The full celebration swallows pointer input: a click anywhere skips the
    // animation rather than falling through to whatever sits underneath — an
    // impatient tap during the 3s overlay must not close the modal behind it.
    <div
      onClick={() => onDoneRef.current?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'auto', cursor: 'pointer',
      }}
    >
      <span role="status" style={VISUALLY_HIDDEN}>{announcement}</span>

      {/* Backdrop: the page blurs and darkens behind the seal so the gold
          text never fights the parchment (or a headline that happens to sit
          underneath), with the gold glow layered above the vignette. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: [
          'radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 20%, transparent) 0%, transparent 60%)',
          'radial-gradient(ellipse at center, rgba(24,18,8,0.74) 0%, rgba(24,18,8,0.52) 45%, rgba(24,18,8,0.18) 75%)',
        ].join(', '),
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }} />

      {/* Seal + text */}
      <div aria-hidden="true" style={{
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
            background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 45%, transparent) 0%, transparent 70%)',
            animation: visible ? 'flagGlow 1.4s ease-in-out infinite alternate' : 'none',
          }} />
          <FlagSealMedallion countryCode={countryCode} countryName={countryName} size="lg" earned />
        </div>

        <div style={{ textAlign: 'center' }}>
          <p className="type-display-story" style={{
            color: 'var(--palette-gold-bright)', margin: '0 0 6px',
            textShadow: '0 2px 4px rgba(15,10,4,0.75), 0 0 24px color-mix(in srgb, var(--accent) 60%, transparent)',
          }}>
            You earned {countryName}!
          </p>
          <p className="type-label-editorial" style={{
            color: 'color-mix(in srgb, var(--palette-ink-on-dark) 90%, transparent)', margin: 0,
            textShadow: '0 1px 3px rgba(15,10,4,0.6)',
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
