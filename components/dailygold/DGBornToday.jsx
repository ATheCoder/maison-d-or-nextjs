'use client';
/**
 * DGBornToday — the day's shelf of Golden Story volumes.
 *
 * Each person born on this date is bound as a small leather book whose cover is
 * their portrait: gilt-ruled boards, a shaded spine, page edges showing on the
 * fore-edge, and a shelf shadow underneath. Opening one lands on the same book
 * full-size (<GoldenStory>), so the shelf and the destination share a language.
 *
 * /stories/[name] is force-dynamic with no loading.tsx, which means the click
 * waits on a server round-trip with nothing to show for it. `useLinkStatus`
 * (next/link, Next 16) hands us exactly that pending window, and we spend it
 * playing the book-opening curtain rather than leaving the tap feeling dead.
 * The curtain itself is <BookOpeningCurtain>, shared with StorybookView, which
 * keeps it up past the navigation until the story's plates have loaded.
 */
import { createPortal } from 'react-dom';
import Link, { useLinkStatus } from 'next/link';
import { useTheme } from '@/components/theme/ThemeContext';
import BookOpeningCurtain from '@/components/dailygold/BookOpeningCurtain';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';
import { resolvePerson } from '@/lib/countries';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import { formatDate, formatYear } from '@/lib/dates';

// ── OPENING CURTAIN ───────────────────────────────────────────────────────────
// Lives inside the <Link>, because useLinkStatus only reports for the link it
// is nested in. Rendered through a portal so the full-screen curtain escapes
// the tile's overflow and stacking context.
function OpeningCurtain({ person, imgUrl }) {
  const { pending } = useLinkStatus();

  // `pending` can only turn true after a click, so the portal is never reached
  // on the server and the SSR/hydration passes both render nothing.
  if (!pending || typeof document === 'undefined') return null;

  return createPortal(
    <BookOpeningCurtain name={person.name} imgUrl={imgUrl} />,
    document.body,
  );
}

// ── ONE VOLUME ON THE SHELF ───────────────────────────────────────────────────
function BookVolume({ person, onTrack, savedSet, editionDate, index = 0 }) {
  const { theme } = useTheme();
  // personToRecord emits snake_case; resolvePerson prefers the explicit code
  // and falls back to the nationality text (R4.1).
  const iso2 = resolvePerson({
    countryCode: person.country_code,
    nationality: person.nationality,
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
            <ellipse cx="24" cy="18" rx="10" ry="12" stroke={theme.accentGold} strokeWidth="1.2" />
            <path d="M6 42 Q12 30 24 30 Q36 30 42 42" stroke={theme.accentGold} strokeWidth="1.2" fill="none" />
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
            countryName={person.nationality || person.country || ''}
            size="xs"
            earned={true}
            fallbackInitials={initials}
          />
        </div>
      )}

      {/* Foil-stamped caption */}
      <div className="dgbt-caption">
        <div className="dgbt-rule" aria-hidden="true" />
        <h3 className="dgbt-name" style={{ fontFamily: theme.fontHeadline }}>{person.name}</h3>
        {role && (
          <p className="dgbt-role" style={{ fontFamily: theme.fontHeadline }}>{role}</p>
        )}
        <p className="dgbt-dates" style={{ fontFamily: theme.fontBody }}>
          {formatDate(person.birth_date)}
          {person.death_date ? ` to ${formatYear(person.death_date)}` : ''}
        </p>
        <div className="dgbt-cta" style={{ fontFamily: theme.fontBody }}>
          <span>Open the Story</span>
          <span aria-hidden="true">›</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="dgbt-cell" style={{ animationDelay: `${index * 65}ms` }}>
      <div className="dgbt-stage">
        <div className="dgbt-vol">
          {/* Fore-edge: the paper stack showing past the boards */}
          <div className="dgbt-edges" aria-hidden="true" />

          {person.slug ? (
            <Link
              href={`/stories/${person.slug}`}
              prefetch={false}
              className="dgbt-cover"
              onClick={() => onTrack?.('person', person.name)}
              aria-label={`Open the story of ${person.name}`}
            >
              {boards}
              <OpeningCurtain person={person} imgUrl={imgUrl} />
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
                countryName={person.nationality || person.country}
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
export default function DGBornToday({ people = [], onTrack, savedSet = null, editionDate }) {
  const { theme } = useTheme();

  if (!people.length) return null;

  // Up to 10 volumes — the shelf reflows from 5 across down to 2 (see <style>).
  const volumes = people.slice(0, 10);

  return (
    <section className="dgbt-section" style={{ background: 'transparent', position: 'relative' }}>
      <style>{`
        /* ── shelf ─────────────────────────────────────────────────────────── */
        .dgbt-section { padding: 5rem clamp(1.25rem, 4vw, 3.5rem) 5.5rem; }

        .dgbt-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: clamp(0.9rem, 1.8vw, 1.6rem) clamp(0.75rem, 1.5vw, 1.35rem);
        }

        .dgbt-cell { animation: dgbtRise 0.6s cubic-bezier(.22,1,.36,1) backwards; }
        @keyframes dgbtRise {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
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
          outline: 2px solid ${theme.accentGold};
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
          border: 1px solid rgba(226,199,140,0.34);
          border-radius: 2px 7px 7px 2px;
          box-shadow: inset 0 0 0 3px rgba(226,199,140,0.07);
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
          background: linear-gradient(to bottom, transparent, rgba(226,199,140,0.55) 16%, rgba(226,199,140,0.55) 84%, transparent);
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

        .dgbt-flag { position: absolute; top: 12px; left: calc(15% + 6px); z-index: 5; }
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
          background: linear-gradient(to right, transparent, rgba(226,199,140,0.62), transparent);
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
          color: #E2C78C;
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
          font-size: 0.68rem; letter-spacing: 0.18em; text-transform: uppercase;
          color: #E2C78C;
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
          background: linear-gradient(to right, transparent, ${theme.accentGold}59, transparent);
        }

        /* Touch devices never fire hover, so the CTA would sit invisible forever */
        @media (hover: none) {
          .dgbt-cta { display: none !important; }
        }

        @media (max-width: 1024px) {
          .dgbt-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 768px) {
          .dgbt-section { padding: 3.5rem 1.25rem 4rem; }
          .dgbt-grid { grid-template-columns: repeat(3, 1fr); }
          .dgbt-name  { font-size: 0.86rem; }
          .dgbt-role  { font-size: 0.72rem; }
          .dgbt-dates { font-size: 0.69rem; }
          .dgbt-caption { padding-bottom: 0.75rem; }
        }
        @media (max-width: 560px) {
          .dgbt-grid { grid-template-columns: repeat(2, 1fr); }
          .dgbt-name  { font-size: 0.95rem; }
          .dgbt-role  { font-size: 0.76rem; }
          .dgbt-dates { font-size: 0.71rem; }
          .dgbt-edges { width: 7px; right: -5px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dgbt-cell { animation: none; }
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
          <div aria-hidden="true" style={{ height: 1, width: 36, background: `linear-gradient(to right, transparent, ${theme.accentGold}88)` }} />
          <p style={{
            fontFamily: theme.fontBody, fontSize: '0.7rem',
            letterSpacing: '0.32em', textTransform: 'uppercase',
            color: theme.accentSage, margin: 0,
          }}>
            Extraordinary Lives
          </p>
          <div aria-hidden="true" style={{ height: 1, flex: 1, background: `linear-gradient(to right, ${theme.accentGold}88, transparent)` }} />
        </div>
        <h2 style={{
          fontFamily: theme.fontHeadline,
          fontSize: 'clamp(1.9rem, 3.5vw, 2.7rem)',
          fontWeight: 700, color: theme.textBody,
          margin: 0, lineHeight: 1.1, letterSpacing: '0.02em',
        }}>
          Born on This Day
        </h2>
        <p style={{
          fontFamily: theme.fontHeadline,
          fontStyle: 'italic', fontSize: '0.8rem',
          color: theme.textMuted, margin: '0.4rem 0 0', letterSpacing: '0.03em',
        }}>
          {people.length > 1
            ? `${people.length} remarkable lives, bound and waiting on today's shelf`
            : 'A remarkable life, bound and waiting on today’s shelf'}
        </p>
      </div>

      {/* ── The shelf — 5 volumes across on desktop, reflowing down to 2 ── */}
      <div className="dgbt-grid">
        {volumes.map((person, i) => (
          <BookVolume
            key={person.slug || i}
            person={person}
            savedSet={savedSet}
            editionDate={editionDate}
            onTrack={onTrack}
            index={i}
          />
        ))}
      </div>

      {/* Bottom gold rule */}
      <div style={{
        marginTop: '3rem',
        display: 'flex', alignItems: 'center', gap: 14,
        opacity: 0.45,
      }}>
        <div aria-hidden="true" style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${theme.accentGold})` }} />
        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M7 1 L8.5 5.5 L13 5.5 L9.5 8.5 L11 13 L7 10 L3 13 L4.5 8.5 L1 5.5 L5.5 5.5Z" fill={theme.accentGold} opacity="0.7"/>
        </svg>
        <div aria-hidden="true" style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${theme.accentGold})` }} />
      </div>
    </section>
  );
}
