'use client';
/**
 * StudyOpeningCurtain — the brass key turning in the study door. Where
 * ProfileEnteringCurtain is a child's sunrise, this is the grown-up's
 * counterpart: the guardian has just proved who they are, and the family
 * study is being unlocked for them. Same parchment, different hour — lamplight
 * from above instead of dawn from below, and a key turning where the sunrise
 * had rays.
 *
 * It covers the same kind of gap as the sunrise: from the moment a switch to
 * the parent side is committed (the gate passed, or the parent tile pressed),
 * through the router.push/refresh, to the navigation commit — where whatever
 * mounted it unmounts and the destination's own loading skeleton takes over.
 * The parent rooms all hard-code the ivory palette, so the hand-off from this
 * ivory scrim to their skeletons never flashes.
 *
 * z-index 9999 for the same reason as the sunrise: it must cover whatever
 * modal or menu the credential was typed into, which stays mounted for the
 * rest of the navigation.
 *
 * The key turns on a fixed 2.6s cycle with the unlock ripples timed to the
 * turn — fixed values, not Math.random(), so server and client markup agree.
 * Like the sunrise, it renders outside .dg-root and so carries its own
 * prefers-reduced-motion block.
 */
import { useEffect } from 'react';

const C = { gold: '#C9A96E', ivory: '#F5F0E7', ink: '#241A0C', brown: '#5C4A2A', muted: '#8B7355' };

export default function StudyOpeningCurtain() {
  // Hold the page still behind the curtain; the cleanup always runs because
  // the curtain only exists while it is blocking.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  return (
    <>
      <style>{`
        .mdos-scrim {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: clamp(1rem, 3vh, 1.75rem);
          padding: 2rem;
          background: ${C.ivory};
          background-image: radial-gradient(ellipse 90% 55% at 50% 0%,
            rgba(243,220,168,0.85), rgba(201,169,110,0.3) 45%, transparent 75%);
          animation: mdosFade 0.25s ease both;
        }
        @keyframes mdosFade { from { opacity: 0; } to { opacity: 1; } }

        .mdos-stage { position: relative; display: grid; place-items: center; }

        /* Lamplight breathing behind the medallion — the study's answer to the
           sunrise's rotating rays. */
        .mdos-halo {
          position: absolute; width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,169,110,0.28), transparent 65%);
          animation: mdosBreathe 3.4s ease-in-out infinite alternate;
          pointer-events: none;
        }
        @keyframes mdosBreathe {
          from { transform: scale(1);    opacity: 0.65; }
          to   { transform: scale(1.12); opacity: 1; }
        }

        /* Unlock ripples: two rings that fire as the key reaches its turn
           (~50% of the shared 2.6s cycle), like tumblers giving way. */
        .mdos-ring {
          position: absolute; width: 140px; height: 140px; border-radius: 50%;
          border: 1.5px solid rgba(201,169,110,0.55);
          opacity: 0;
          animation: mdosRing 2.6s ease-out infinite;
          pointer-events: none;
        }
        .mdos-ring + .mdos-ring { animation-delay: 0.18s; }
        @keyframes mdosRing {
          0%, 48%   { opacity: 0;    transform: scale(0.8); }
          54%       { opacity: 0.55; }
          92%, 100% { opacity: 0;    transform: scale(1.55); }
        }

        /* The parent tile's face, lifted out of the picker. Arrival starts
           immediately so even a fast navigation reads as deliberate. */
        .mdos-medallion {
          position: relative;
          width: 116px; height: 116px; border-radius: 50%;
          background: #E4DCCE;
          display: flex; align-items: center; justify-content: center;
          border: 3px solid ${C.gold};
          box-shadow: 0 10px 40px rgba(100,80,40,0.28), 0 0 0 8px rgba(201,169,110,0.15);
          animation: mdosArrive 0.7s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes mdosArrive {
          from { opacity: 0; transform: scale(0.82) translateY(14px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* The key itself turns in the lock: rest, a firm quarter-ish turn,
           settle back — one turn per ripple cycle. */
        .mdos-key {
          display: inline-block;
          font-size: 3.2rem; line-height: 1;
          animation: mdosTurn 2.6s cubic-bezier(.45,0,.25,1) infinite;
        }
        @keyframes mdosTurn {
          0%, 36%   { transform: rotate(0deg); }
          50%       { transform: rotate(46deg); }
          58%       { transform: rotate(40deg); }
          78%, 100% { transform: rotate(0deg); }
        }

        /* Caption */
        .mdos-caption { text-align: center; display: grid; justify-items: center; gap: 0.6rem; }
        .mdos-eyebrow {
          margin: 0;
          font-family: Lato, sans-serif;
          font-size: 0.6rem; letter-spacing: 0.3em; text-transform: uppercase;
          color: ${C.gold};
        }
        .mdos-headline {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(1.2rem, 3.2vw, 1.6rem);
          font-weight: 600;
          color: ${C.ink};
        }
        .mdos-bar {
          width: min(210px, 55vw); height: 2px; border-radius: 2px;
          background: rgba(201,169,110,0.25); overflow: hidden;
        }
        .mdos-bar i {
          display: block; width: 42%; height: 100%;
          background: linear-gradient(to right, transparent, ${C.gold}, transparent);
          animation: mdosShuttle 1.3s ease-in-out infinite alternate;
        }
        @keyframes mdosShuttle {
          from { transform: translateX(0); }
          to   { transform: translateX(138%); }
        }

        /* Same contract as the sunrise: everything decorative stops; only the
           0.25s scrim fade and a slow shuttle survive. */
        @media (prefers-reduced-motion: reduce) {
          .mdos-halo, .mdos-ring { display: none; }
          .mdos-medallion { animation: none; opacity: 1; transform: none; }
          .mdos-key { animation: none; }
          .mdos-bar i { animation-duration: 2s; }
        }
      `}</style>

      <div className="mdos-scrim" role="status" aria-live="polite">
        <div className="mdos-stage">
          <div className="mdos-halo" aria-hidden="true" />
          <div className="mdos-ring" aria-hidden="true" />
          <div className="mdos-ring" aria-hidden="true" />
          <div className="mdos-medallion" aria-hidden="true">
            <span className="mdos-key">🗝️</span>
          </div>
        </div>

        {/* The caption is the announcement — no sr-only duplicate. */}
        <div className="mdos-caption">
          <p className="mdos-eyebrow">Maison d&apos;Oré</p>
          <p className="mdos-headline">Opening the family study…</p>
          <div className="mdos-bar"><i /></div>
        </div>
      </div>
    </>
  );
}
