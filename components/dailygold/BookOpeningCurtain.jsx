// @ts-nocheck — untyped .jsx from before checkJs was on; 2 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * BookOpeningCurtain — the full-screen "Opening the story of …" curtain: a
 * leather volume whose cover swings away, leaves turning on a loop, gold dust
 * rising out of the binding.
 *
 * It covers the whole gap between pressing a volume on the shelf and the story
 * being ready to read, and that gap has two halves rendered by two different
 * trees:
 *
 *   1. the server round-trip for /stories/[name] — DGBornToday raises the
 *      curtain from inside the <Link> (useLinkStatus), and
 *   2. the wait for the story's illustrations to arrive — StorybookView keeps
 *      it up on the destination until every plate has loaded.
 *
 * The navigation unmounts (1) and mounts (2) in the same commit, so the two
 * curtains meet with no gap. `resume` is what makes the seam invisible: the
 * second one starts where the first left off — cover already swung open, book
 * already lifted, leaves mid-loop — instead of playing the opening again.
 */
import { useEffect } from 'react';

// Gold dust that rises out of the opening book. Fixed positions rather than
// Math.random() so the server and client markup agree.
const DUST = [
  { left: '8%', delay: '0.35s', dur: '2.4s', size: 3 },
  { left: '21%', delay: '0.95s', dur: '3.1s', size: 2 },
  { left: '34%', delay: '0.55s', dur: '2.7s', size: 4 },
  { left: '47%', delay: '1.25s', dur: '3.4s', size: 2 },
  { left: '58%', delay: '0.75s', dur: '2.9s', size: 3 },
  { left: '71%', delay: '1.55s', dur: '3.2s', size: 2 },
  { left: '84%', delay: '0.45s', dur: '2.6s', size: 3 },
  { left: '94%', delay: '1.15s', dur: '3.6s', size: 2 },
];

// How far into the animation `resume` picks up: the moment the cover finishes
// swinging (0.3s delay + 1.05s of dgoOpen). Every resumed animation is offset
// by this, so the second curtain is the first one, still running.
const OPENED_AT = 1.35;

export default function BookOpeningCurtain({ name, imgUrl = null, resume = false }) {
  // Hold the page still behind the curtain. The curtain only exists while it
  // is blocking — the shelf unmounts it on navigation, the story page when the
  // art arrives — so the cleanup that restores the scroll always runs.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '✦';

  return (
    <>
      <style>{`
        .dgo-scrim {
          position: fixed; inset: 0; z-index: 9998;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: clamp(1.1rem, 3vh, 2rem);
          padding: 2rem;
          /* The same wooden table the story lands on (app/globals.css §3.1b,
             docs/golden-stories-bible.md "The table"). It has to be this
             surface and not a lookalike: the curtain and the stage are on
             screen back to back — the curtain hands off mid-animation to
             StorybookView's — so any difference reads as the ground changing
             under the book. The blur still softens whatever the reader was
             looking at through the very edges. */
          background-color: var(--table-wood);
          background-image: var(--table-surface);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: dgoFade 0.26s ease both;
        }
        @keyframes dgoFade { from { opacity: 0; } to { opacity: 1; } }

        .dgo-stage { perspective: 1500px; perspective-origin: 50% 45%; }

        .dgo-book {
          position: relative;
          width: min(250px, 44vw); aspect-ratio: 3 / 4;
          transform-style: preserve-3d;
          animation: dgoLift 0.85s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes dgoLift {
          from { opacity: 0; transform: rotateX(16deg) rotateY(8deg) scale(0.88); }
          to   { opacity: 1; transform: rotateX(6deg)  rotateY(0deg) scale(1); }
        }

        /* Parchment beneath the cover */
        .dgo-pages {
          position: absolute; inset: 0;
          border-radius: 3px 9px 9px 3px;
          overflow: hidden;
          background:
            radial-gradient(ellipse 70% 60% at 30% 24%, rgba(255,252,242,0.9), transparent 62%),
            linear-gradient(160deg, #F6F1E5 0%, #EADFC6 100%);
          /* Warm-tinted and tight: the volume here is ~250px, so the stage's
             full --table-book-shadow would swamp it. Neutral black on walnut
             goes sooty, hence the hue. */
          box-shadow: inset 0 0 44px rgba(96,64,26,0.22),
            0 2px 3px rgba(22,14,6,0.45), 0 18px 38px -8px rgba(14,9,4,0.6);
        }
        .dgo-rules {
          position: absolute; inset: 16% 12% 18% 18%;
          background: repeating-linear-gradient(to bottom,
            rgba(150,116,62,0.28) 0 1px, transparent 1px 13px);
          opacity: 0.55;
        }
        .dgo-gutter {
          position: absolute; top: 0; bottom: 0; left: 0; width: 16%;
          background: linear-gradient(to right, rgba(70,44,16,0.4), transparent);
        }

        /* Leaves turning on a loop while the story is fetched */
        .dgo-leaf {
          position: absolute; inset: 0;
          transform-origin: left center;
          transform-style: preserve-3d;
          border-radius: 3px 9px 9px 3px;
          background: linear-gradient(160deg, #FBF7EC 0%, #EDE2CA 100%);
          box-shadow: 2px 0 12px rgba(60,38,12,0.3);
          opacity: 0;
          animation: dgoFlip 2.4s cubic-bezier(.5,0,.5,1) infinite;
        }
        .dgo-leaf-1 { animation-delay: 1.05s; }
        .dgo-leaf-2 { animation-delay: 2.25s; }
        @keyframes dgoFlip {
          0%   { opacity: 0;    transform: rotateY(0deg); }
          8%   { opacity: 1; }
          72%  { opacity: 1; }
          88%  { opacity: 0;    transform: rotateY(-165deg); }
          100% { opacity: 0;    transform: rotateY(-165deg); }
        }

        /* The cover, hinged on its spine */
        .dgo-cover {
          position: absolute; inset: 0;
          transform-origin: left center;
          transform-style: preserve-3d;
          animation: dgoOpen 1.05s cubic-bezier(.55,.06,.3,1) 0.3s forwards;
        }
        @keyframes dgoOpen {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(-158deg); }
        }
        .dgo-face {
          position: absolute; inset: 0;
          border-radius: 3px 9px 9px 3px;
          overflow: hidden;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          background: linear-gradient(150deg, #3A281C 0%, #241812 55%, #150E08 100%);
        }
        .dgo-face-front { box-shadow: 0 22px 48px rgba(0,0,0,0.5); }
        .dgo-face-back {
          transform: rotateY(180deg);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--palette-gold-bright) 16%, transparent);
          background:
            radial-gradient(ellipse 60% 50% at 40% 30%, rgba(90,64,38,0.55), transparent 60%),
            linear-gradient(150deg, #2E2015 0%, #1B1208 100%);
        }
        .dgo-cover-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover; object-position: center top;
        }
        .dgo-cover-initials {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--face-display);
          font-size: 3rem; letter-spacing: 0.08em;
          color: color-mix(in srgb, var(--palette-gold-bright) 55%, transparent);
        }
        .dgo-cover-wash {
          position: absolute; inset: 0;
          background:
            linear-gradient(to top, rgba(14,9,4,0.9) 0%, rgba(24,16,7,0.35) 40%, transparent 70%),
            linear-gradient(to right, rgba(12,8,4,0.6) 0%, transparent 28%);
        }
        .dgo-cover-frame {
          position: absolute; inset: 8px;
          border: 1px solid color-mix(in srgb, var(--palette-gold-bright) 40%, transparent);
          border-radius: 2px 6px 6px 2px;
        }
        .dgo-cover-spine {
          position: absolute; left: 0; top: 0; bottom: 0; width: 15%;
          background: linear-gradient(to right, rgba(8,5,2,0.95), rgba(28,18,10,0.6) 50%, transparent);
        }

        /* Gold dust rising out of the binding */
        .dgo-dust { position: absolute; inset: 0; pointer-events: none; }
        .dgo-dust i {
          position: absolute; bottom: 8%;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--palette-gold-bright) 65%, var(--palette-ivory)), transparent);
          opacity: 0;
          animation-name: dgoDust;
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
        }
        @keyframes dgoDust {
          0%   { opacity: 0;   transform: translateY(0) scale(0.6); }
          18%  { opacity: 0.9; }
          100% { opacity: 0;   transform: translateY(-120px) scale(1.25); }
        }

        /* Caption */
        .dgo-caption { text-align: center; display: grid; justify-items: center; gap: 0.6rem; }
        .dgo-eyebrow {
          margin: 0;
          color: color-mix(in srgb, var(--palette-gold-bright) 72%, transparent);
        }
        .dgo-name {
          margin: 0;
          color: color-mix(in srgb, var(--palette-gold-bright) 45%, var(--palette-ivory));
          text-shadow: 0 2px 18px color-mix(in srgb, var(--palette-gold-bright) 28%, transparent);
        }
        .dgo-bar {
          width: min(210px, 55vw); height: 2px; border-radius: 2px;
          background: color-mix(in srgb, var(--palette-gold-bright) 16%, transparent); overflow: hidden;
        }
        .dgo-bar i {
          display: block; width: 42%; height: 100%;
          background: linear-gradient(to right, transparent, var(--palette-gold-bright), transparent);
          animation: dgoShuttle 1.3s ease-in-out infinite;
        }
        @keyframes dgoShuttle {
          0%   { transform: translateX(-110%); }
          100% { transform: translateX(250%); }
        }

        /* ── the second half of the wait ───────────────────────────────────────
           Every animation offset back by the moment the cover finished opening,
           so this curtain takes over mid-stride instead of starting again. The
           scrim doesn't fade in at all: it never went away. */
        .dgo-resume { animation: none; }
        .dgo-resume .dgo-book   { animation-delay: -${OPENED_AT}s; }
        .dgo-resume .dgo-cover  { animation-delay: ${0.3 - OPENED_AT}s; }
        .dgo-resume .dgo-leaf-1 { animation-delay: ${1.05 - OPENED_AT}s; }
        .dgo-resume .dgo-leaf-2 { animation-delay: ${2.25 - OPENED_AT}s; }

        @media (prefers-reduced-motion: reduce) {
          .dgo-book { animation: none; }
          .dgo-cover { animation: dgoFadeCover 0.5s ease 0.2s forwards; }
          @keyframes dgoFadeCover { to { opacity: 0; } }
          .dgo-leaf, .dgo-dust { display: none; }
          .dgo-bar i { animation-duration: 2s; }
        }
      `}</style>

      <div className={`dgo-scrim${resume ? ' dgo-resume' : ''}`} role="status" aria-live="polite">
        <div className="dgo-stage">
          <div className="dgo-book">
            {/* Pages — revealed as the cover swings away */}
            <div className="dgo-pages" aria-hidden="true">
              <div className="dgo-rules" />
              <div className="dgo-gutter" />
            </div>

            {/* Two leaves turning on a loop: the book keeps reading itself for
                as long as the story takes to arrive. */}
            <div className="dgo-leaf dgo-leaf-1" aria-hidden="true" />
            <div className="dgo-leaf dgo-leaf-2" aria-hidden="true" />

            {/* The cover, hinged on its spine */}
            <div className="dgo-cover" aria-hidden="true">
              <div className="dgo-face dgo-face-front">
                {imgUrl
                  ? <img src={imgUrl} alt="" className="dgo-cover-img" />
                  : <span className="dgo-cover-initials">{initials}</span>}
                <div className="dgo-cover-wash" />
                <div className="dgo-cover-frame" />
                <div className="dgo-cover-spine" />
              </div>
              <div className="dgo-face dgo-face-back" />
            </div>

            <div className="dgo-dust" aria-hidden="true">
              {DUST.map((d, i) => (
                <i key={i} style={{
                  left: d.left,
                  width: d.size, height: d.size,
                  animationDelay: d.delay,
                  animationDuration: d.dur,
                }} />
              ))}
            </div>
          </div>
        </div>

        <div className="dgo-caption">
          <p className="dgo-eyebrow type-label-editorial">Opening the story of</p>
          <p className="dgo-name type-display-story">{name}</p>
          <div className="dgo-bar"><i /></div>
        </div>
      </div>
    </>
  );
}
