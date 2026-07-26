'use client';
/**
 * DGBornToday — Immersive 5×2 portrait gallery
 * Full-bleed portraits with edge-dissolve, text overlay, no hard-edged cards.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';
import { resolvePerson } from '@/lib/countries';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import { formatDate, formatYear } from '@/lib/dates';

// ── SINGLE PORTRAIT TILE ──────────────────────────────────────────────────────
function PortraitTile({ person, onClick, child, editionDate }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
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

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        aspectRatio: '3 / 4',
        overflow: 'hidden',
        borderRadius: 20,
        background: `linear-gradient(160deg, ${theme.bgSoft} 0%, ${theme.bgCard} 100%)`,
        transition: 'transform 0.4s cubic-bezier(.22,1,.36,1)',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      {/* The whole tile is one button; the treasury heart stays a sibling so
          we never nest interactive controls. */}
      <button
        onClick={onClick}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          display: 'block',
          padding: 0,
          border: 'none',
          background: 'transparent',
          textAlign: 'inherit',
          font: 'inherit',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        {/* Portrait image */}
        {imgUrl && (
          <img
            src={imgUrl}
            alt={person.name}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center top',
              display: 'block',
              borderRadius: 0,
              transition: 'transform 0.6s cubic-bezier(.22,1,.36,1)',
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
            }}
          />
        )}

        {/* No image placeholder */}
        {!imgUrl && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg aria-hidden="true" width="40" height="40" viewBox="0 0 48 48" fill="none">
              <ellipse cx="24" cy="18" rx="10" ry="12" stroke={theme.accentGold} strokeWidth="1.2"/>
              <path d="M6 42 Q12 30 24 30 Q36 30 42 42" stroke={theme.accentGold} strokeWidth="1.2" fill="none"/>
            </svg>
          </div>
        )}

        {/* ── EDGE DISSOLVE overlays — all four sides blend into the page ── */}
        {/* Bottom — strongest scrim so name and dates stay legible on any artwork */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%',
          background: `linear-gradient(to bottom, transparent 0%, rgba(24,16,7,0.35) 30%, rgba(24,16,7,0.82) 68%, rgba(16,10,4,0.95) 100%)`,
          pointerEvents: 'none',
        }} />
        {/* Right edge dissolve */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: '35%',
          background: `linear-gradient(to right, transparent 0%, ${theme.bgPrimary}14 60%, ${theme.bgPrimary}2E 100%)`,
          pointerEvents: 'none',
        }} />
        {/* Left edge dissolve */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: '25%',
          background: `linear-gradient(to left, transparent 0%, ${theme.bgPrimary}0F 100%)`,
          pointerEvents: 'none',
        }} />
        {/* Top edge dissolve */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '20%',
          background: `linear-gradient(to bottom, ${theme.bgPrimary}2E 0%, transparent 100%)`,
          pointerEvents: 'none',
        }} />

        {/* Flag — top-left */}
        {iso2 && (
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5 }}>
            <FlagSealMedallion
              countryCode={iso2}
              countryName={person.nationality || person.country || ''}
              size="xs"
              earned={true}
              fallbackInitials={initials}
            />
          </div>
        )}

        {/* Text overlay — bottom */}
        <div className="dgbt-caption" style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0 0.85rem 0.85rem',
          zIndex: 4,
        }}>
          {/* Gold rule */}
          <div aria-hidden="true" style={{
            height: 1,
            background: `linear-gradient(to right, transparent, ${theme.accentGold}88, transparent)`,
            marginBottom: '0.45rem',
          }} />

          {/* Name */}
          <h3 className="dgbt-name" style={{
            fontFamily: theme.fontHeadline,
            fontSize: 'clamp(0.78rem, 1.1vw, 0.95rem)',
            fontWeight: 700,
            color: 'rgba(253,245,228,0.97)',
            margin: '0 0 0.15rem',
            lineHeight: 1.15,
            letterSpacing: '0.01em',
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}>
            {person.name}
          </h3>

          {/* Role */}
          {(person.story_title || person.role || person.field) && (
            <p className="dgbt-role" style={{
              fontFamily: theme.fontHeadline,
              fontStyle: 'italic',
              fontSize: 'clamp(0.7rem, 0.85vw, 0.8rem)',
              color: theme.accentGold,
              margin: '0 0 0.35rem',
              lineHeight: 1.3,
              letterSpacing: '0.03em',
              textShadow: '0 1px 3px rgba(0,0,0,0.45)',
            }}>
              {person.story_title || person.role || person.field}
            </p>
          )}

          {/* Dates */}
          <p className="dgbt-dates" style={{
            fontFamily: theme.fontBody,
            fontWeight: 300,
            fontSize: 'clamp(0.7rem, 0.8vw, 0.78rem)',
            color: 'rgba(236,222,192,0.92)',
            margin: 0,
            letterSpacing: '0.08em',
            textShadow: '0 1px 3px rgba(0,0,0,0.45)',
          }}>
            {formatDate(person.birth_date)}
            {person.death_date ? ` to ${formatYear(person.death_date)}` : ''}
          </p>

          {/* Discover story CTA — appears on hover (hidden on touch, see <style>) */}
          <div className="dgbt-cta" style={{
            marginTop: '0.5rem',
            display: 'flex', alignItems: 'center', gap: 5,
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}>
            <span style={{
              fontFamily: theme.fontBody,
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: theme.accentGold,
            }}>
              Discover the Story
            </span>
            <span aria-hidden="true" style={{ color: theme.accentGold, fontSize: '0.75rem', lineHeight: 1 }}>›</span>
          </div>
        </div>
      </button>

      {/* Treasury heart — sibling of the tile button, never nested inside it */}
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 20 }}>
        <TreasuryHeart
          childId={child?.id}
          section="hero_stamps"
          itemId={person.name}
          itemTitle={person.name}
          itemSubtitle={person.story_title || person.role || person.field || ''}
          itemImageUrl={imgUrl || ''}
          countryCode={iso2 || ''}
          countryName={person.nationality || person.country || ''}
          themeTags={[(person.field || person.role || 'person').toLowerCase()].filter(Boolean)}
          editionDate={editionDate}
          size="sm"
        />
      </div>
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function DGBornToday({ people = [], onTrack, onFlagEarned, child, editionDate }) {
  const router = useRouter();
  const { theme } = useTheme();

  if (!people.length) return null;

  // Up to 10 portraits — the grid reflows from 5 columns down to 2 (see <style>).
  const portraits = people.slice(0, 10);

  return (
    <section className="dgbt-section" style={{
      padding: '5rem clamp(1.25rem, 4vw, 3.5rem) 5.5rem',
      background: 'transparent',
      position: 'relative',
    }}>
      <style>{`
        @keyframes dgFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1024px) {
          .dgbt-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .dgbt-section { padding: 3.5rem 1.25rem 4rem !important; }
          .dgbt-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 0.75rem !important; }
          .dgbt-name  { font-size: 0.88rem !important; }
          .dgbt-role  { font-size: 0.72rem !important; }
          .dgbt-dates { font-size: 0.7rem !important; }
        }
        @media (max-width: 560px) {
          .dgbt-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 0.85rem !important; }
          .dgbt-caption { padding: 0 0.75rem 0.8rem !important; }
          .dgbt-name  { font-size: 0.95rem !important; }
          .dgbt-role  { font-size: 0.74rem !important; }
          .dgbt-dates { font-size: 0.7rem !important; }
        }
        /* Touch devices never fire hover, so the CTA would sit invisible forever */
        @media (hover: none) {
          .dgbt-cta { display: none !important; }
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
            ? `${people.length} remarkable people share today with you`
            : 'A remarkable life that shares today with you'}
        </p>
      </div>

      {/* ── Portrait grid — 5 across on desktop, reflowing down to 2 ── */}
      <div className="dgbt-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 'clamp(0.5rem, 1.2vw, 1rem)',
      }}>
        {portraits.map((person, i) => (
          <div key={person.slug || i} style={{ animation: `dgFadeUp 0.5s ease ${i * 60}ms backwards` }}>
            <PortraitTile
              person={person}
              child={child}
              editionDate={editionDate}
              onClick={() => {
                onTrack?.('person', person.name);
                if (person.slug) router.push(`/stories/${person.slug}`);
              }}
            />
          </div>
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
