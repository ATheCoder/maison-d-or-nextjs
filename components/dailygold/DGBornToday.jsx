'use client';
/**
 * DGBornToday — Immersive 5×2 portrait gallery
 * Full-bleed portraits with edge-dissolve, text overlay, no hard-edged cards.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import { formatDate, formatYear } from '@/lib/dates';

// ── Country → ISO2 ────────────────────────────────────────────────────────────
const COUNTRY_TO_ISO2 = {
  'French': 'FR', 'France': 'FR',
  'British': 'GB', 'English': 'GB', 'Scottish': 'GB', 'Welsh': 'GB', 'United Kingdom': 'GB', 'UK': 'GB',
  'American': 'US', 'United States': 'US', 'USA': 'US',
  'German': 'DE', 'Germany': 'DE', 'Italian': 'IT', 'Italy': 'IT',
  'Spanish': 'ES', 'Spain': 'ES', 'Portuguese': 'PT', 'Portugal': 'PT',
  'Dutch': 'NL', 'Netherlands': 'NL', 'Belgian': 'BE', 'Belgium': 'BE',
  'Swiss': 'CH', 'Switzerland': 'CH', 'Austrian': 'AT', 'Austria': 'AT',
  'Irish': 'IE', 'Ireland': 'IE', 'Swedish': 'SE', 'Sweden': 'SE',
  'Norwegian': 'NO', 'Norway': 'NO', 'Danish': 'DK', 'Denmark': 'DK',
  'Finnish': 'FI', 'Finland': 'FI', 'Greek': 'GR', 'Greece': 'GR',
  'Russian': 'RU', 'Russia': 'RU', 'Soviet': 'RU', 'USSR': 'RU',
  'Polish': 'PL', 'Poland': 'PL', 'Czech': 'CZ', 'Hungarian': 'HU', 'Hungary': 'HU',
  'Romanian': 'RO', 'Romania': 'RO', 'Ukrainian': 'UA', 'Ukraine': 'UA',
  'Canadian': 'CA', 'Canada': 'CA', 'Mexican': 'MX', 'Mexico': 'MX',
  'Brazilian': 'BR', 'Brazil': 'BR', 'Argentine': 'AR', 'Argentina': 'AR',
  'Chilean': 'CL', 'Chile': 'CL', 'Colombian': 'CO', 'Colombia': 'CO',
  'Cuban': 'CU', 'Cuba': 'CU', 'Japanese': 'JP', 'Japan': 'JP',
  'Chinese': 'CN', 'China': 'CN', 'Korean': 'KR', 'South Korea': 'KR',
  'Indian': 'IN', 'India': 'IN', 'Pakistani': 'PK', 'Pakistan': 'PK',
  'Thai': 'TH', 'Thailand': 'TH', 'Turkish': 'TR', 'Turkey': 'TR',
  'Iranian': 'IR', 'Iran': 'IR', 'Persian': 'IR', 'Israeli': 'IL', 'Israel': 'IL',
  'Egyptian': 'EG', 'Egypt': 'EG', 'Moroccan': 'MA', 'Morocco': 'MA',
  'Nigerian': 'NG', 'Nigeria': 'NG', 'South African': 'ZA', 'South Africa': 'ZA',
  'Australian': 'AU', 'Australia': 'AU', 'New Zealander': 'NZ', 'New Zealand': 'NZ',
  'Polish-French': 'PL', 'British-American': 'GB', 'Austro-Hungarian': 'AT',
};

function getIso2(person) {
  const direct = (person.country_code || '').toUpperCase();
  if (direct.length === 2 && /^[A-Z]{2}$/.test(direct)) return direct;
  const nationality = person.nationality || person.country || '';
  if (!nationality) return null;
  if (COUNTRY_TO_ISO2[nationality]) return COUNTRY_TO_ISO2[nationality];
  for (const p of nationality.split(/[-,/\s]+/)) {
    if (COUNTRY_TO_ISO2[p?.trim()]) return COUNTRY_TO_ISO2[p.trim()];
  }
  return null;
}

// ── PALETTE ───────────────────────────────────────────────────────────────────
const P = {
  parchment:    '#F5F0E7',
  parchmentMid: '#EDE5D4',
  gold:         '#C8A96B',
  goldLight:    '#E2D0A8',
  textDark:     '#2C1F0E',
  textLight:    '#8B7355',
  sage:         '#7C8770',
};

// ── SINGLE PORTRAIT TILE ──────────────────────────────────────────────────────
function PortraitTile({ person, onClick, child, editionDate }) {
  const [hovered, setHovered] = useState(false);
  const iso2 = getIso2(person);
  const initials = person.name ? person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  // Portraits come from remarkable_person (R2-hosted covers); people without
  // one get the parchment placeholder below.
  const imgUrl = person.image_url || null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        aspectRatio: '3 / 4',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: 20,
        background: `linear-gradient(160deg, ${P.parchmentMid} 0%, #D8CBB0 100%)`,
        transition: 'transform 0.4s cubic-bezier(.22,1,.36,1)',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
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
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            <ellipse cx="24" cy="18" rx="10" ry="12" stroke={P.goldLight} strokeWidth="1.2"/>
            <path d="M6 42 Q12 30 24 30 Q36 30 42 42" stroke={P.goldLight} strokeWidth="1.2" fill="none"/>
          </svg>
        </div>
      )}

      {/* ── EDGE DISSOLVE overlays — all four sides blend into parchment ── */}
      {/* Bottom — strongest, text sits here */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
        background: `linear-gradient(to bottom, transparent 0%, rgba(37,26,12,0.15) 35%, rgba(37,26,12,0.72) 75%, rgba(30,20,8,0.92) 100%)`,
        pointerEvents: 'none',
      }} />
      {/* Right edge dissolve */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: '35%',
        background: `linear-gradient(to right, transparent 0%, rgba(245,240,231,0.08) 60%, rgba(245,240,231,0.18) 100%)`,
        pointerEvents: 'none',
      }} />
      {/* Left edge dissolve */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '25%',
        background: `linear-gradient(to left, transparent 0%, rgba(245,240,231,0.06) 100%)`,
        pointerEvents: 'none',
      }} />
      {/* Top edge dissolve */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '20%',
        background: `linear-gradient(to bottom, rgba(245,240,231,0.18) 0%, transparent 100%)`,
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
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '0 0.85rem 0.85rem',
        zIndex: 4,
      }}>
        {/* Gold rule */}
        <div style={{
          height: 1,
          background: `linear-gradient(to right, transparent, ${P.gold}88, transparent)`,
          marginBottom: '0.45rem',
        }} />

        {/* Name */}
        <h3 style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(0.78rem, 1.1vw, 0.95rem)',
          fontWeight: 700,
          color: 'rgba(253,245,228,0.97)',
          margin: '0 0 0.15rem',
          lineHeight: 1.15,
          letterSpacing: '0.01em',
          textShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}>
          {person.name}
        </h3>

        {/* Role */}
        {(person.story_title || person.role || person.field) && (
          <p style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(0.52rem, 0.75vw, 0.65rem)',
            color: `${P.gold}`,
            margin: '0 0 0.35rem',
            lineHeight: 1.3,
            letterSpacing: '0.03em',
          }}>
            {person.story_title || person.role || person.field}
          </p>
        )}

        {/* Dates */}
        <p style={{
          fontFamily: 'Lato, sans-serif',
          fontWeight: 300,
          fontSize: 'clamp(0.44rem, 0.62vw, 0.55rem)',
          color: 'rgba(220,200,165,0.75)',
          margin: 0,
          letterSpacing: '0.1em',
        }}>
          {formatDate(person.birth_date)}
          {person.death_date ? ` — ${formatYear(person.death_date)}` : ''}
        </p>

        {/* Discover story CTA — appears on hover */}
        <div style={{
          marginTop: '0.5rem',
          display: 'flex', alignItems: 'center', gap: 5,
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>
          <span style={{
            fontFamily: 'Lato, sans-serif',
            fontSize: '0.48rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: P.goldLight,
          }}>
            Discover the Story
          </span>
          <span style={{ color: P.gold, fontSize: '0.75rem', lineHeight: 1 }}>›</span>
        </div>
      </div>

      {/* Treasury heart */}
      <div
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 20 }}
        onClick={e => e.stopPropagation()}
      >
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

  if (!people.length) return null;

  // Split into two rows of 5 (pad if fewer)
  const row1 = people.slice(0, 5);
  const row2 = people.slice(5, 10);

  return (
    <section style={{
      padding: '5rem clamp(1.25rem, 4vw, 3.5rem) 5.5rem',
      background: 'transparent',
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Lato:wght@300;400;700&display=swap');
        @keyframes dgFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Section header ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
          <div style={{ height: 1, width: 36, background: `linear-gradient(to right, transparent, ${P.goldLight})` }} />
          <p style={{
            fontFamily: 'Lato, sans-serif', fontSize: '0.5rem',
            letterSpacing: '0.38em', textTransform: 'uppercase',
            color: P.sage, margin: 0,
          }}>
            Extraordinary Lives
          </p>
          <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, ${P.goldLight}, transparent)` }} />
        </div>
        <h2 style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(1.9rem, 3.5vw, 2.7rem)',
          fontWeight: 700, color: P.textDark,
          margin: 0, lineHeight: 1.1, letterSpacing: '0.02em',
        }}>
          Born on This Day
        </h2>
        <p style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic', fontSize: '0.8rem',
          color: P.textLight, margin: '0.4rem 0 0', letterSpacing: '0.03em',
        }}>
          {people.length > 1
            ? `${people.length} remarkable people share today with you`
            : 'A remarkable life that shares today with you'}
        </p>
      </div>

      {/* ── Row 1 — 5 portraits ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 'clamp(0.5rem, 1.2vw, 1rem)',
        marginBottom: 'clamp(0.5rem, 1.2vw, 1rem)',
      }}>
        {row1.map((person, i) => (
          <div key={person.slug || i} style={{ animation: `dgFadeUp 0.5s ease ${i * 60}ms both` }}>
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

      {/* ── Row 2 — next 5 portraits (only if data exists) ── */}
      {row2.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 'clamp(0.5rem, 1.2vw, 1rem)',
        }}>
          {row2.map((person, i) => (
            <div key={person.slug || i + 5} style={{ animation: `dgFadeUp 0.5s ease ${(i + 5) * 60}ms both` }}>
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
      )}

      {/* Bottom gold rule */}
      <div style={{
        marginTop: '3rem',
        display: 'flex', alignItems: 'center', gap: 14,
        opacity: 0.45,
      }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${P.gold})` }} />
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M7 1 L8.5 5.5 L13 5.5 L9.5 8.5 L11 13 L7 10 L3 13 L4.5 8.5 L1 5.5 L5.5 5.5Z" fill={P.gold} opacity="0.7"/>
        </svg>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${P.gold})` }} />
      </div>
    </section>
  );
}