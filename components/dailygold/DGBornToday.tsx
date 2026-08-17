'use client';
/**
 * DGBornToday — the day's shelf of Golden Story volumes.
 *
 * Each person born on this date is bound as a small leather book whose cover is
 * their portrait: gilt-ruled boards, a shaded spine, page edges showing on the
 * fore-edge, and a shelf shadow underneath. Opening one lands on the same book
 * full-size (<GoldenStory>), so the shelf and the destination share a language.
 *
 * Rank is staged, never labelled. The first three volumes stand on a podium:
 * the first front-and-centre under a cone of light, bound largest; the second
 * and third flank it, smaller, angled inward like a display case and set back
 * in depth (translateZ). Everyone else stands in a dimmer, smaller row behind.
 * The light does the rest of the talking — hovering any volume hands it the
 * spotlight (`:has()` dims the others), and the podium leans gently toward the
 * pointer (CSS vars driven from pointermove; individual transform properties
 * keep the entrance choreography composable with the 3D pose).
 *
 * /stories/[name] is force-dynamic with no loading.tsx, which means the click
 * waits on a server round-trip with nothing to show for it. `useLinkStatus`
 * (next/link, Next 16) hands us exactly that pending window, and we spend it
 * playing the book-opening curtain rather than leaving the tap feeling dead.
 * The curtain itself is <BookOpeningCurtain>, shared with StorybookView, which
 * keeps it up past the navigation until the story's plates have loaded.
 */
import { useRef } from 'react';
import Link from 'next/link';
import { useInstrumentation } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import StoryOpeningCurtain from '@/components/dailygold/StoryOpeningCurtain';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';
import { resolvePerson } from '@/lib/countries';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import { formatDate, formatYear } from '@/lib/dates';
import type { PersonRecord } from '@/app/(dg)/daily-gold-edition/queries';

/** Where a volume stands: the three podium places, or the row behind. */
type VolumeTier = 'lead' | 'featl' | 'featr' | 'shelf';

// ── ONE VOLUME ON THE SHELF ───────────────────────────────────────────────────
function BookVolume({
  person,
  savedSet,
  editionDate,
  delay = '0s',
  tier = 'shelf',
}: {
  person: PersonRecord;
  savedSet?: Set<string> | null;
  editionDate?: string;
  /** CSS animation-delay for the entrance stagger. */
  delay?: string;
  tier?: VolumeTier;
}) {
  const { track } = useInstrumentation();
  // personToRecord emits snake_case; resolvePerson prefers an explicit code and
  // falls back to the nationality text (R4.1). It is passed no `nationality`
  // here because a PersonRecord has none — remarkable_person keeps the
  // nationality adjective in `country` (see PersonEditor's note on that column),
  // and the field this used to read was a leftover from the Base44 shape that
  // has been undefined since the Drizzle migration.
  const iso2 = resolvePerson({
    countryCode: person.country_code,
    country: person.country,
  });
  const initials = person.name ? person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  // Portraits come from remarkable_person (R2-hosted covers); people without
  // one get the parchment placeholder below.
  const imgUrl = person.image_url || null;
  // Some rows carry the person's own name as their story_title; printing it
  // under the name reads as a mistake, so fall through to the real role.
  const role = [person.story_title, person.role, person.field]
    .find(t => t && t.trim().toLowerCase() !== (person.name || '').trim().toLowerCase()) || null;

  // Boards, gilt and caption — identical whether or not the volume opens.
  const boards = (
    <>
      {imgUrl ? (
        <img src={imgUrl} alt={person.name} className="dgbt-portrait" />
      ) : (
        <div className="dgbt-empty" aria-hidden="true">
          <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
            <ellipse cx="24" cy="18" rx="10" ry="12" style={{ stroke: 'var(--accent)' }} strokeWidth="1.2" />
            <path d="M6 42 Q12 30 24 30 Q36 30 42 42" style={{ stroke: 'var(--accent)' }} strokeWidth="1.2" fill="none" />
          </svg>
        </div>
      )}

      {/* Leather washes: the portrait sinks into the boards at every edge */}
      <div className="dgbt-wash" aria-hidden="true" />
      {/* Gilt rules stamped into the board */}
      <div className="dgbt-gilt" aria-hidden="true" />
      {/* Shaded fold where the cover meets the spine */}
      <div className="dgbt-spine" aria-hidden="true" />
      {/* Light travelling over the leather on hover */}
      <div className="dgbt-gleam" aria-hidden="true" />

      {/* Flag seal — stamped top-left, decorative only (role="img") */}
      {iso2 && (
        <div className="dgbt-flag">
          <FlagSealMedallion
            countryCode={iso2}
            countryName={person.country || ''}
            size="xs"
            earned={true}
            fallbackInitials={initials}
          />
        </div>
      )}

      {/* Foil-stamped caption */}
      <div className="dgbt-caption">
        <div className="dgbt-rule" aria-hidden="true" />
        <h3 className="dgbt-name" style={{ fontFamily: 'var(--face-display)' }}>{person.name}</h3>
        {role && (
          <p className="dgbt-role" style={{ fontFamily: 'var(--face-display)' }}>{role}</p>
        )}
        <p className="dgbt-dates" style={{ fontFamily: 'var(--face-sans)' }}>
          {formatDate(person.birth_date)}
          {person.death_date ? ` to ${formatYear(person.death_date)}` : ''}
        </p>
        <div className="dgbt-cta" style={{ fontFamily: 'var(--face-sans)' }}>
          <span>Open the Story</span>
          <span aria-hidden="true">›</span>
        </div>
      </div>
    </>
  );

  return (
    <div className={`dgbt-cell dgbt-cell--${tier}`} style={{ animationDelay: delay }}>
      <div className="dgbt-stage">
        <div className="dgbt-vol">
          {/* Fore-edge: the paper stack showing past the boards */}
          <div className="dgbt-edges" aria-hidden="true" />

          {person.slug ? (
            <Link
              href={`/stories/${person.slug}`}
              prefetch={false}
              className="dgbt-cover"
              /* Leaving the shelf, not opening the book: the story route mounts
                 its own provider and reports the read itself. What this records
                 is the choice — which volume the child reached for, from where. */
              onClick={() => track('nav_select', {
                contentType: 'person',
                contentId: `/stories/${person.slug}`,
                label: person.name,
                source: 'section',
                section: 'born_today',
              })}
              aria-label={`Open the story of ${person.name}`}
            >
              {boards}
              <StoryOpeningCurtain name={person.name} imgUrl={imgUrl} />
            </Link>
          ) : (
            /* No slug means no story to open yet — the volume still stands on
               the shelf, it just isn't a door. */
            <div className="dgbt-cover dgbt-cover-closed">{boards}</div>
          )}

          {/* Treasury heart — sibling of the cover link, never nested inside it.
              A slugless volume gets none: with no story to open there is no
              stable id to save it under and nowhere for the treasury card to
              lead. No reader (savedSet null) means no hearts at all. */}
          {savedSet && person.slug && (
            <div className="dgbt-heart">
              <TreasuryHeart
                itemType="person"
                itemId={person.slug}
                itemTitle={person.name}
                itemSubtitle={role}
                itemImageUrl={imgUrl}
                countryCode={iso2}
                countryName={person.country}
                editionDate={editionDate}
                initialSaved={savedSet.has(`person:${person.slug}`)}
                size="sm"
                onImage
              />
            </div>
          )}
        </div>
      </div>

      {/* The shelf the volume stands on */}
      <div className="dgbt-ledge" aria-hidden="true" />
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function DGBornToday({
  people = [],
  savedSet = null,
  editionDate,
}: {
  people?: PersonRecord[];
  /** The reader's saved treasury keys, or null when there is no reader. */
  savedSet?: Set<string> | null;
  editionDate?: string;
}) {
  const podiumRef = useRef<HTMLDivElement>(null);

  // The podium leans a few degrees toward the pointer. CSS custom properties
  // carry the normalized cursor position so the pose itself stays in CSS; the
  // .5s transform transition on the cells turns raw pointermove into a damped,
  // weighty follow rather than a 1:1 track.
  const handleTilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = podiumRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--tiltx', String(((e.clientX - r.left) / r.width - 0.5).toFixed(3)));
    el.style.setProperty('--tilty', String(((e.clientY - r.top) / r.height - 0.5).toFixed(3)));
  };
  const resetTilt = () => {
    const el = podiumRef.current;
    if (!el) return;
    el.style.setProperty('--tiltx', '0');
    el.style.setProperty('--tilty', '0');
  };

  if (!people.length) return null;

  // Up to 10 volumes. The first three stand on the podium; the rest stand in
  // the receded row behind it.
  const volumes = people.slice(0, 10);
  const featured = volumes.slice(0, 3);
  const shelf = volumes.slice(3);
  const podiumTiers: VolumeTier[] = ['lead', 'featl', 'featr'];
  const podiumDelays = ['0.05s', '0.24s', '0.34s'];

  return (
    <section className="dgbt-section" style={{ background: 'transparent', position: 'relative' }}>
      <style>{`
        /* ── shelf ─────────────────────────────────────────────────────────── */
        .dgbt-section { padding: 5rem clamp(1.25rem, 4vw, 3.5rem) 5.5rem; }

        /* ── the podium ────────────────────────────────────────────────────
           Rank staged in space: #1 front and centre and largest; #2 / #3
           flanking, smaller, turned inward like a display case and pushed
           back in Z; everyone else in the receded row behind. Sizes are
           viewport-fluid (min(vw, px)) so the whole diorama scales without
           breakpoints. --tiltx/--tilty arrive from pointermove. */
        .dgbt-podium {
          position: relative;
          display: flex; align-items: flex-end; justify-content: center;
          perspective: 1500px;
          --tiltx: 0; --tilty: 0;
        }

        .dgbt-cell--lead {
          order: 2; z-index: 3;
          width: min(38vw, 350px);
          transform:
            rotateY(calc(var(--tiltx) * -6deg))
            rotateX(calc(var(--tilty) * 3deg));
        }
        .dgbt-cell--featl,
        .dgbt-cell--featr {
          z-index: 2;
          width: min(26vw, 245px);
        }
        .dgbt-cell--featl {
          order: 1;
          /* -1%: tucks the flank behind the lead without the lead's boards
             covering the flank's caption (the inward rotation already pulls
             the inner edge away from the lead) */
          margin-right: -1%;
          transform:
            translateZ(-70px)
            rotateY(calc(16deg + var(--tiltx) * -6deg))
            rotateX(calc(var(--tilty) * 3deg));
        }
        .dgbt-cell--featr {
          order: 3;
          margin-left: -1%;
          transform:
            translateZ(-70px)
            rotateY(calc(-16deg + var(--tiltx) * -6deg))
            rotateX(calc(var(--tilty) * 3deg));
        }
        .dgbt-podium .dgbt-cell {
          transition: transform 0.5s cubic-bezier(.22,1,.36,1), filter 0.45s ease;
        }

        /* The cone of light the lead stands under, breathing slowly */
        .dgbt-beam {
          position: absolute; z-index: 0; pointer-events: none;
          left: 50%; top: -8%; width: 160%; height: 126%;
          transform: translateX(-50%);
          background:
            radial-gradient(ellipse 30% 46% at 50% 60%,
              rgba(255,238,200,0.5), transparent 70%),
            conic-gradient(from 0deg at 50% -14%,
              transparent 148deg, color-mix(in srgb, var(--accent) 8%, transparent) 168deg,
              color-mix(in srgb, var(--accent) 18%, transparent) 180deg, color-mix(in srgb, var(--accent) 8%, transparent) 192deg,
              transparent 212deg);
          /* Soft top and bottom so the cone fades in below the heading
             instead of striping across it */
          mask-image: linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%);
          animation: dgbtBreathe 7s ease-in-out infinite alternate;
        }
        @keyframes dgbtBreathe {
          from { opacity: 0.7; }
          to   { opacity: 1; }
        }

        /* The lead's own halo, plus a one-time gleam as it arrives */
        .dgbt-cell--lead .dgbt-stage::before {
          content: ''; position: absolute; inset: -16% -14% -4%;
          background: radial-gradient(ellipse at 50% 44%,
            rgba(255,240,205,0.34) 0%, color-mix(in srgb, var(--accent) 13%, transparent) 45%, transparent 72%);
          pointer-events: none;
        }
        .dgbt-cell--lead .dgbt-gleam {
          animation: dgbtHello 1.4s cubic-bezier(.3,.6,.3,1) 1.05s backwards;
        }
        @keyframes dgbtHello {
          0%   { opacity: 0; transform: translateX(-75%); }
          30%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(75%); }
        }
        .dgbt-cell--lead .dgbt-cover {
          box-shadow:
            0 20px 38px rgba(52,33,12,0.32),
            0 3px 7px rgba(52,33,12,0.22),
            inset 0 1px 0 rgba(255,238,205,0.09);
        }
        .dgbt-cell--lead .dgbt-ledge::before {
          left: 8%; right: 8%;
          background: radial-gradient(ellipse at 50% 0%, rgba(72,46,17,0.38), transparent 72%);
        }
        .dgbt-cell--lead .dgbt-ledge::after {
          background: linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 70%, transparent), transparent);
        }

        /* Captions scale with the volume's standing */
        .dgbt-cell--lead .dgbt-caption { padding-bottom: 1.05rem; }
        .dgbt-cell--lead .dgbt-name  { font-size: clamp(1rem, 1.5vw, 1.32rem); }
        .dgbt-cell--lead .dgbt-role  { font-size: clamp(0.76rem, 1vw, 0.92rem); }
        .dgbt-cell--lead .dgbt-dates { font-size: clamp(0.72rem, 0.85vw, 0.82rem); }
        .dgbt-cell--featl .dgbt-name, .dgbt-cell--featr .dgbt-name { font-size: clamp(0.78rem, 1.15vw, 1.02rem); }
        .dgbt-cell--featl .dgbt-role, .dgbt-cell--featr .dgbt-role { font-size: clamp(0.66rem, 0.88vw, 0.82rem); }

        /* ── the row behind ────────────────────────────────────────────────
           Fixed-cap tracks + auto-fit keep the row centred under the podium
           at any count; resting dimness sets it back in the light. */
        .dgbt-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(23vw, 200px), 200px));
          justify-content: center;
          gap: clamp(0.9rem, 1.8vw, 1.6rem) clamp(0.75rem, 1.5vw, 1.35rem);
          margin-top: clamp(2rem, 4vw, 3.25rem);
        }
        .dgbt-grid .dgbt-cell { filter: brightness(0.95) saturate(0.85); }

        /* ── the spotlight follows attention ───────────────────────────────
           Hovering any volume hands it the light: it comes to full brightness
           and gains a halo while every other volume falls back into shadow. */
        .dgbt-cell { transition: filter 0.45s ease; }
        @media (hover: hover) {
          .dgbt-books:has(.dgbt-stage:hover) .dgbt-cell:not(:has(.dgbt-stage:hover)) {
            filter: brightness(0.86) saturate(0.8);
          }
          /* brightness(1), not none — an identity filter keeps the cell's
             stacking context alive so the z-index:-1 halo stays visible */
          .dgbt-books .dgbt-cell:has(.dgbt-stage:hover) { filter: brightness(1) saturate(1); }
        }
        .dgbt-stage { position: relative; }
        .dgbt-stage::after {
          content: ''; position: absolute; inset: -14% -12% -2%; z-index: -1;
          background: radial-gradient(ellipse at 50% 46%,
            rgba(255,240,205,0.30) 0%, color-mix(in srgb, var(--accent) 11%, transparent) 45%, transparent 72%);
          opacity: 0; transition: opacity 0.5s ease;
          pointer-events: none;
        }
        .dgbt-stage:hover::after,
        .dgbt-stage:focus-within::after { opacity: 1; }

        /* ── entrances: the lead arrives first, flanks slide in from the
           wings, the back row rises last. Individual transform properties
           (translate/scale) compose with each cell's 3D pose. ── */
        .dgbt-cell { animation: dgbtRise 0.6s cubic-bezier(.22,1,.36,1) backwards; }
        @keyframes dgbtRise {
          from { opacity: 0; translate: 0 18px; }
          to   { opacity: 1; translate: 0 0; }
        }
        .dgbt-cell--lead { animation: dgbtLeadIn 0.9s cubic-bezier(.16,1,.3,1) backwards; }
        @keyframes dgbtLeadIn {
          from { opacity: 0; translate: 0 36px; scale: 0.94; }
          to   { opacity: 1; translate: 0 0; scale: 1; }
        }
        .dgbt-cell--featl { animation: dgbtFlankL 0.8s cubic-bezier(.16,1,.3,1) backwards; }
        @keyframes dgbtFlankL {
          from { opacity: 0; translate: -40px 24px; }
          to   { opacity: 1; translate: 0 0; }
        }
        .dgbt-cell--featr { animation: dgbtFlankR 0.8s cubic-bezier(.16,1,.3,1) backwards; }
        @keyframes dgbtFlankR {
          from { opacity: 0; translate: 40px 24px; }
          to   { opacity: 1; translate: 0 0; }
        }

        /* ── one volume ────────────────────────────────────────────────────── */
        .dgbt-stage { perspective: 1100px; }

        .dgbt-vol {
          position: relative;
          aspect-ratio: 3 / 4;
          transform-style: preserve-3d;
          transform-origin: 6% 50%;
          transition: transform 0.55s cubic-bezier(.22,1,.36,1);
          will-change: transform;
        }
        .dgbt-stage:hover .dgbt-vol,
        .dgbt-stage:focus-within .dgbt-vol {
          transform: translateY(-10px) rotateY(-10deg) rotateX(1.5deg);
        }

        /* Fore-edge — the paper stack, sitting just behind the boards */
        .dgbt-edges {
          position: absolute; top: 5px; bottom: 5px; right: -7px; width: 9px;
          border-radius: 0 4px 4px 0;
          background: repeating-linear-gradient(to right,
            #F7F1E4 0 1px, #DFD2B4 1px 2px, #F2EADA 2px 3px);
          box-shadow: inset -3px 0 5px rgba(80,52,18,0.28);
          transform: translateZ(-8px);
          pointer-events: none;
        }

        .dgbt-cover {
          position: absolute; inset: 0;
          display: block; overflow: hidden;
          border-radius: 3px 11px 11px 3px;
          background: linear-gradient(150deg, #3A281C 0%, #241812 55%, #150E08 100%);
          box-shadow:
            0 14px 26px rgba(52,33,12,0.26),
            0 2px 5px rgba(52,33,12,0.20),
            inset 0 1px 0 rgba(255,238,205,0.07);
          text-decoration: none; color: inherit;
          transition: box-shadow 0.5s ease;
        }
        .dgbt-stage:hover .dgbt-cover,
        .dgbt-stage:focus-within .dgbt-cover {
          box-shadow:
            0 30px 52px rgba(52,33,12,0.34),
            0 4px 10px rgba(52,33,12,0.22),
            inset 0 1px 0 rgba(255,238,205,0.10);
        }
        .dgbt-cover:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 3px;
        }
        .dgbt-cover-closed { cursor: default; }

        .dgbt-portrait {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover; object-position: center top;
          display: block;
          transition: transform 0.7s cubic-bezier(.22,1,.36,1);
        }
        .dgbt-stage:hover .dgbt-portrait,
        .dgbt-stage:focus-within .dgbt-portrait { transform: scale(1.06); }

        .dgbt-empty {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }

        /* Portrait dissolving into the boards on every edge */
        .dgbt-wash {
          position: absolute; inset: 0; pointer-events: none;
          background:
            linear-gradient(to bottom, rgba(20,13,6,0.55) 0%, transparent 22%),
            linear-gradient(to top, rgba(14,9,4,0.96) 0%, rgba(24,16,7,0.80) 24%, rgba(24,16,7,0.30) 48%, transparent 68%),
            linear-gradient(to right, rgba(12,8,4,0.62) 0%, transparent 26%),
            linear-gradient(to left, rgba(12,8,4,0.42) 0%, transparent 22%);
        }

        /* Gilt rules stamped into the board */
        .dgbt-gilt {
          position: absolute; inset: 7px; pointer-events: none;
          border: 1px solid color-mix(in srgb, var(--palette-gold-bright) 34%, transparent);
          border-radius: 2px 7px 7px 2px;
          box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--palette-gold-bright) 7%, transparent);
        }

        /* Shaded fold at the binding, with two gilt bands */
        .dgbt-spine {
          position: absolute; left: 0; top: 0; bottom: 0; width: 15%;
          pointer-events: none;
          background: linear-gradient(to right,
            rgba(8,5,2,0.94) 0%, rgba(28,18,10,0.68) 45%, rgba(28,18,10,0) 100%);
        }
        .dgbt-spine::before, .dgbt-spine::after {
          content: ''; position: absolute; top: 9px; bottom: 9px; width: 1px;
          background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--palette-gold-bright) 55%, transparent) 16%, color-mix(in srgb, var(--palette-gold-bright) 55%, transparent) 84%, transparent);
        }
        .dgbt-spine::before { left: 26%; }
        .dgbt-spine::after  { left: 40%; opacity: 0.4; }

        /* Light travelling across the leather */
        .dgbt-gleam {
          position: absolute; inset: 0; pointer-events: none; opacity: 0;
          background: linear-gradient(104deg,
            transparent 36%, rgba(255,240,205,0.16) 46%, rgba(255,250,235,0.30) 50%,
            rgba(255,240,205,0.14) 54%, transparent 64%);
          transform: translateX(-75%);
        }
        .dgbt-stage:hover .dgbt-gleam,
        .dgbt-stage:focus-within .dgbt-gleam {
          opacity: 1;
          animation: dgbtGleam 0.95s cubic-bezier(.3,.6,.3,1) forwards;
        }
        @keyframes dgbtGleam {
          from { transform: translateX(-75%); }
          to   { transform: translateX(75%); }
        }

        /* The two seals on the boards are a pair, and are placed as one: the
           flag measured 12px off the spine fold (where the front board starts,
           the same way the heart is measured off the fore-edge) rather than 6px,
           which left it straddling the shading and belonging to neither. Its
           13px top lands a 24px medallion on the same centre line as the 26px
           heart. The shadow is what seats it on the leather — without it the
           medallion's own pale ring reads as a sticker over the portrait. */
        .dgbt-flag {
          position: absolute; top: 13px; left: 12px; z-index: 5;
          filter: drop-shadow(0 2px 6px rgba(18,11,4,0.55));
        }
        /* The heart's 44px tap target is much bigger than the 26px disc inside
           it, so this offset is 9px short of where the disc lands: 12px off the
           boards, level with the flag seal across the cover. */
        .dgbt-heart { position: absolute; top: 3px; right: 3px; z-index: 20; }

        /* ── foil-stamped caption ──────────────────────────────────────────── */
        .dgbt-caption {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 0 0.85rem 0.85rem calc(15% + 0.35rem);
          z-index: 4;
        }
        .dgbt-rule {
          height: 1px; margin-bottom: 0.45rem;
          background: linear-gradient(to right, transparent, color-mix(in srgb, var(--palette-gold-bright) 62%, transparent), transparent);
        }
        .dgbt-name {
          font-size: clamp(0.78rem, 1.05vw, 0.95rem);
          font-weight: 700;
          color: rgba(253,246,231,0.97);
          margin: 0 0 0.15rem;
          line-height: 1.15; letter-spacing: 0.015em;
          text-shadow: 0 1px 5px rgba(0,0,0,0.55);
        }
        .dgbt-role {
          font-style: italic;
          font-size: clamp(0.68rem, 0.82vw, 0.79rem);
          color: var(--palette-gold-bright);
          margin: 0 0 0.35rem;
          line-height: 1.3; letter-spacing: 0.03em;
          text-shadow: 0 1px 4px rgba(0,0,0,0.5);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .dgbt-dates {
          font-weight: 300;
          font-size: clamp(0.68rem, 0.78vw, 0.76rem);
          color: rgba(236,222,192,0.9);
          margin: 0; letter-spacing: 0.08em;
          text-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }
        .dgbt-cta {
          margin-top: 0.5rem;
          display: flex; align-items: center; gap: 5px;
          /* mirrors type-label-editorial (class can't reach into this block) */
          font-size: var(--type-label-editorial); font-weight: 560;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--palette-gold-bright);
          opacity: 0; transform: translateY(5px);
          transition: opacity 0.28s ease, transform 0.28s ease;
        }
        .dgbt-stage:hover .dgbt-cta,
        .dgbt-stage:focus-within .dgbt-cta { opacity: 1; transform: translateY(0); }

        /* ── the shelf under the volume ────────────────────────────────────── */
        .dgbt-ledge { position: relative; height: 15px; }
        .dgbt-ledge::before {
          content: ''; position: absolute; left: 5%; right: 5%; top: 0; height: 11px;
          border-radius: 50%;
          background: radial-gradient(ellipse at 50% 0%, rgba(72,46,17,0.30), transparent 72%);
          filter: blur(3px);
          transition: left 0.55s ease, right 0.55s ease, opacity 0.55s ease;
        }
        .dgbt-cell:hover .dgbt-ledge::before { left: 11%; right: 11%; opacity: 0.62; }
        .dgbt-ledge::after {
          content: ''; position: absolute; left: 0; right: 0; top: 12px; height: 1px;
          background: linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 35%, transparent), transparent);
        }

        /* Touch devices never fire hover, so the CTA would sit invisible forever */
        @media (hover: none) {
          .dgbt-cta { display: none !important; }
        }

        /* The podium and back row are viewport-fluid — no column reflow
           needed, only padding and fore-edge tuning at small sizes. */
        @media (max-width: 768px) {
          .dgbt-section { padding: 3.5rem 1.25rem 4rem; }
          .dgbt-caption { padding-bottom: 0.75rem; }
        }
        @media (max-width: 560px) {
          .dgbt-edges { width: 7px; right: -5px; }

          /* Below phone width the row of three would shrink the books until
             the captions swallow the covers, so the podium restacks: the lead
             alone on top, still clearly largest, its flanks beneath it, and
             the back row capped narrower than the flanks so size keeps
             telling the ranking. Explicit grid placement overrides order. */
          .dgbt-podium {
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: end; justify-items: center;
            row-gap: 1.1rem;
          }
          .dgbt-cell--lead { grid-column: 1 / -1; grid-row: 1; width: min(64vw, 280px); }
          .dgbt-cell--featl { grid-row: 2; width: min(40vw, 180px); justify-self: end; margin-right: 0.3rem; }
          .dgbt-cell--featr { grid-row: 2; width: min(40vw, 180px); justify-self: start; margin-left: 0.3rem; }
          /* Two volumes only: the lone flank centres under the lead */
          .dgbt-podium[data-count="2"] .dgbt-cell--featl {
            grid-column: 1 / -1; justify-self: center; margin-right: 0;
          }

          /* Small covers push the caption up over the portrait, so the
             leather wash climbs higher to keep the foil text seated on dark
             ground */
          .dgbt-wash {
            background:
              linear-gradient(to bottom, rgba(20,13,6,0.55) 0%, transparent 22%),
              linear-gradient(to top, rgba(14,9,4,0.97) 0%, rgba(24,16,7,0.86) 30%, rgba(24,16,7,0.42) 56%, transparent 76%),
              linear-gradient(to right, rgba(12,8,4,0.62) 0%, transparent 26%),
              linear-gradient(to left, rgba(12,8,4,0.42) 0%, transparent 22%);
          }
          .dgbt-grid {
            grid-template-columns: repeat(2, 1fr);
            max-width: 310px;
            margin-left: auto; margin-right: auto;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .dgbt-cell { animation: none; }
          .dgbt-cell--lead, .dgbt-cell--featl, .dgbt-cell--featr { animation: none; }
          .dgbt-beam { animation: none; }
          .dgbt-vol, .dgbt-portrait, .dgbt-cover { transition: none; }
          .dgbt-stage:hover .dgbt-vol,
          .dgbt-stage:focus-within .dgbt-vol { transform: none; }
          .dgbt-stage:hover .dgbt-portrait,
          .dgbt-stage:focus-within .dgbt-portrait { transform: none; }
          .dgbt-gleam { display: none; }
        }
      `}</style>

      {/* ── Section header ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
          <div aria-hidden="true" style={{ height: 1, width: 36, background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 53%, transparent))' }} />
          <p className="type-label-editorial" style={{ color: 'var(--accent-readable)', margin: 0 }}>
            Extraordinary Lives
          </p>
          <div aria-hidden="true" style={{ height: 1, flex: 1, background: 'linear-gradient(to right, color-mix(in srgb, var(--accent) 53%, transparent), transparent)' }} />
        </div>
        <h2 className="type-display-section" style={{ color: 'var(--text-primary)', margin: 0 }}>
          Born on This Day
        </h2>
        <p className="type-caption font-display italic" style={{ margin: '0.4rem 0 0' }}>
          {people.length > 1
            ? `${people.length} remarkable lives, bound and waiting on today's shelf`
            : 'A remarkable life, bound and waiting on today’s shelf'}
        </p>
      </div>

      {/* ── One wrapper so hovering any volume can dim all the others ── */}
      <div className="dgbt-books">
        {/* The podium: #2 and #3 flank #1, angled inward, set back in depth.
            DOM order stays rank order for readers and tab order; the visual
            arrangement is pure CSS `order`. */}
        <div
          className="dgbt-podium"
          data-count={featured.length}
          ref={podiumRef}
          onPointerMove={handleTilt}
          onPointerLeave={resetTilt}
        >
          <div className="dgbt-beam" aria-hidden="true" />
          {featured.map((person, i) => (
            <BookVolume
              key={person.slug || i}
              person={person}
              savedSet={savedSet}
              editionDate={editionDate}
              tier={podiumTiers[i]}
              delay={podiumDelays[i]}
            />
          ))}
        </div>

        {/* Everyone past the podium: a smaller, dimmer row behind it. No
            heading — the staging says it. */}
        {shelf.length > 0 && (
          <div className="dgbt-grid">
            {shelf.map((person, i) => (
              <BookVolume
                key={person.slug || i}
                person={person}
                savedSet={savedSet}
                editionDate={editionDate}
                delay={`${0.45 + i * 0.07}s`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom gold rule */}
      <div style={{
        marginTop: '3rem',
        display: 'flex', alignItems: 'center', gap: 14,
        opacity: 0.45,
      }}>
        <div aria-hidden="true" style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, var(--accent))' }} />
        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M7 1 L8.5 5.5 L13 5.5 L9.5 8.5 L11 13 L7 10 L3 13 L4.5 8.5 L1 5.5 L5.5 5.5Z" style={{ fill: 'var(--accent)' }} opacity="0.7"/>
        </svg>
        <div aria-hidden="true" style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, var(--accent))' }} />
      </div>
    </section>
  );
}
