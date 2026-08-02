'use client';
/**
 * ProfileEnteringCurtain — the golden sunrise that answers "Who's reading
 * today?". Where BookOpeningCurtain is a dark leather volume swinging open,
 * this is its parchment-bright counterpart: the child has just pressed their
 * own face, and the first light of their reading day comes up behind it.
 *
 * It covers exactly one gap — from the tap on a tile, through the
 * enterChildProfile server action, to the router.push('/daily-gold-edition')
 * committing. At that commit the whole picker unmounts and this curtain goes
 * with it, handing the wait over to the edition's own loading skeleton, so
 * there is never a bare flash between the two.
 *
 * z-index 9999 because it must also cover the PIN modal (z-1000): after a
 * correct PIN the modal is still mounted for the rest of the navigation, and
 * a child should see the sunrise, not the pad they just finished with.
 *
 * The dust specks carry fixed positions/delays/durations (same idiom as
 * BookOpeningCurtain's DUST) rather than Math.random(), so the server and
 * client markup agree and React doesn't hydrate-mismatch on them.
 *
 * It also carries its own prefers-reduced-motion block: this renders outside
 * .dg-root, so none of the edition's motion rules reach it.
 */
import { useEffect } from 'react';

const C = { gold: '#C9A96E', ivory: '#F5F0E7', ink: '#241A0C', brown: '#5C4A2A', muted: '#8B7355' };

// Gold dust rising past the medallion. Fixed values, not Math.random(), so the
// server and client render the same markup.
const DUST = [
  { left: '14%', delay: '0.20s', dur: '2.6s', size: 3 },
  { left: '29%', delay: '0.85s', dur: '3.2s', size: 2 },
  { left: '43%', delay: '0.45s', dur: '2.9s', size: 4 },
  { left: '57%', delay: '1.10s', dur: '3.4s', size: 2 },
  { left: '72%', delay: '0.60s', dur: '2.7s', size: 3 },
  { left: '87%', delay: '1.35s', dur: '3.1s', size: 2 },
];

export default function ProfileEnteringCurtain({ name, emoji, bg }: {
  name: string; emoji: string; bg: string;
}) {
  // Hold the picker still behind the curtain. The curtain only exists while it
  // is blocking — it unmounts with the picker at navigation commit — so the
  // cleanup that restores the scroll always runs.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  return (
    <>
      <style>{`
        .mdoe-scrim {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: clamp(1rem, 3vh, 1.75rem);
          padding: 2rem;
          background: ${C.ivory};
          background-image: radial-gradient(ellipse 90% 55% at 50% 100%,
            rgba(243,220,168,0.9), rgba(201,169,110,0.35) 45%, transparent 75%);
          animation: mdoeFade 0.25s ease both;
        }
        @keyframes mdoeFade { from { opacity: 0; } to { opacity: 1; } }

        .mdoe-stage { position: relative; display: grid; place-items: center; }

        /* Sun rays fanning out behind the medallion, masked away at the edge so
           they dissolve into the parchment instead of ending on a hard circle. */
        .mdoe-rays {
          position: absolute; width: 380px; height: 380px; border-radius: 50%;
          background: repeating-conic-gradient(
            rgba(201,169,110,0.14) 0deg 6deg, transparent 6deg 24deg);
          -webkit-mask-image: radial-gradient(circle, black 30%, transparent 70%);
          mask-image: radial-gradient(circle, black 30%, transparent 70%);
          opacity: 0.7;
          animation: mdoeRays 16s linear infinite;
          pointer-events: none;
        }
        @keyframes mdoeRays {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* The face the child just pressed, lifted out of the tile grid. Arrival
           starts immediately so even a fast local navigation reads as a
           deliberate sunrise rather than a glitch. */
        .mdoe-medallion {
          position: relative;
          width: 116px; height: 116px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 3.2rem; line-height: 1;
          border: 3px solid ${C.gold};
          box-shadow: 0 10px 40px rgba(100,80,40,0.28), 0 0 0 8px rgba(201,169,110,0.15);
          animation:
            mdoeArrive 0.7s cubic-bezier(.22,1,.36,1) both,
            mdoeFloat 3.2s ease-in-out 0.7s infinite alternate;
        }
        @keyframes mdoeArrive {
          from { opacity: 0; transform: scale(0.82) translateY(14px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes mdoeFloat {
          from { transform: translateY(0); }
          to   { transform: translateY(-6px); }
        }

        /* Gold dust rising past the medallion */
        .mdoe-dust { position: absolute; inset: -40px -10px 0; pointer-events: none; }
        .mdoe-dust i {
          position: absolute; bottom: 6%;
          border-radius: 50%;
          background: radial-gradient(circle, ${C.gold}, rgba(201,169,110,0));
          opacity: 0;
          animation-name: mdoeDust;
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
        }
        @keyframes mdoeDust {
          0%   { opacity: 0;   transform: translateY(0) scale(0.6); }
          18%  { opacity: 0.9; }
          100% { opacity: 0;   transform: translateY(-130px) scale(1.25); }
        }

        /* Caption */
        .mdoe-caption { text-align: center; display: grid; justify-items: center; gap: 0.6rem; }
        .mdoe-eyebrow {
          margin: 0;
          font-family: Lato, sans-serif;
          font-size: 0.6rem; letter-spacing: 0.3em; text-transform: uppercase;
          color: ${C.gold};
        }
        .mdoe-headline {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(1.2rem, 3.2vw, 1.6rem);
          font-weight: 600;
          color: ${C.ink};
        }
        .mdoe-bar {
          width: min(210px, 55vw); height: 2px; border-radius: 2px;
          background: rgba(201,169,110,0.25); overflow: hidden;
        }
        .mdoe-bar i {
          display: block; width: 42%; height: 100%;
          background: linear-gradient(to right, transparent, ${C.gold}, transparent);
          animation: mdoeShuttle 1.3s ease-in-out infinite alternate;
        }
        @keyframes mdoeShuttle {
          from { transform: translateX(0); }
          to   { transform: translateX(138%); }
        }

        /* This renders outside .dg-root, so nothing up the tree quiets it for
           us — the curtain carries its own reduced-motion contract. Everything
           decorative stops; only the 0.25s scrim fade and a slow shuttle
           (the one honest "still working" signal) survive. */
        @media (prefers-reduced-motion: reduce) {
          .mdoe-rays, .mdoe-dust { display: none; }
          .mdoe-medallion { animation: none; opacity: 1; transform: none; }
          .mdoe-bar i { animation-duration: 2s; }
        }
      `}</style>

      <div className="mdoe-scrim" role="status" aria-live="polite">
        <div className="mdoe-stage">
          <div className="mdoe-rays" aria-hidden="true" />

          <div className="mdoe-dust" aria-hidden="true">
            {DUST.map((d, i) => (
              <i key={i} style={{
                left: d.left,
                width: d.size, height: d.size,
                animationDelay: d.delay,
                animationDuration: d.dur,
              }} />
            ))}
          </div>

          <div className="mdoe-medallion" style={{ background: bg }} aria-hidden="true">
            {emoji}
          </div>
        </div>

        {/* The caption is the announcement — no sr-only duplicate. */}
        <div className="mdoe-caption">
          <p className="mdoe-eyebrow">Maison d&apos;Oré</p>
          <p className="mdoe-headline">Preparing {name}&apos;s paper…</p>
          <div className="mdoe-bar"><i /></div>
        </div>
      </div>
    </>
  );
}
