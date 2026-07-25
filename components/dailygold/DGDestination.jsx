'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';
import { base44 } from '@/api/base44Client';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';
import SaveHeartSeal from '@/components/dailygold/SaveHeartSeal';

const COUNTRY_TO_ISO2 = {
  'France': 'FR', 'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES', 'Portugal': 'PT',
  'United Kingdom': 'GB', 'Netherlands': 'NL', 'Belgium': 'BE', 'Switzerland': 'CH',
  'Austria': 'AT', 'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI',
  'Ireland': 'IE', 'Greece': 'GR', 'Poland': 'PL', 'Czech Republic': 'CZ', 'Czechia': 'CZ',
  'Hungary': 'HU', 'Romania': 'RO', 'Bulgaria': 'BG', 'Croatia': 'HR', 'Serbia': 'RS',
  'Ukraine': 'UA', 'Russia': 'RU', 'Japan': 'JP', 'China': 'CN', 'India': 'IN',
  'South Korea': 'KR', 'Vietnam': 'VN', 'Thailand': 'TH', 'Indonesia': 'ID', 'Malaysia': 'MY',
  'Singapore': 'SG', 'Philippines': 'PH', 'Australia': 'AU', 'New Zealand': 'NZ',
  'United States': 'US', 'Canada': 'CA', 'Mexico': 'MX', 'Brazil': 'BR', 'Argentina': 'AR',
  'Chile': 'CL', 'Colombia': 'CO', 'Peru': 'PE', 'Venezuela': 'VE', 'Ecuador': 'EC',
  'South Africa': 'ZA', 'Egypt': 'EG', 'Morocco': 'MA', 'Nigeria': 'NG', 'Kenya': 'KE',
  'Ethiopia': 'ET', 'Ghana': 'GH', 'Tanzania': 'TZ', 'Algeria': 'DZ', 'Tunisia': 'TN',
  'Turkey': 'TR', 'Iran': 'IR', 'Iraq': 'IQ', 'Saudi Arabia': 'SA', 'UAE': 'AE',
  'United Arab Emirates': 'AE', 'Israel': 'IL', 'Jordan': 'JO', 'Lebanon': 'LB',
  'Pakistan': 'PK', 'Bangladesh': 'BD', 'Sri Lanka': 'LK', 'Nepal': 'NP',
  'Cuba': 'CU', 'Peru': 'PE', 'Bolivia': 'BO', 'Paraguay': 'PY', 'Uruguay': 'UY',
  'Iceland': 'IS', 'Luxembourg': 'LU', 'Malta': 'MT', 'Cyprus': 'CY',
};

function getDestinationIso2(name) {
  if (!name) return null;
  const base = name.split(',')[0].trim();
  if (COUNTRY_TO_ISO2[base]) return COUNTRY_TO_ISO2[base];
  for (const [k, v] of Object.entries(COUNTRY_TO_ISO2)) {
    if (base.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(base.toLowerCase())) return v;
  }
  return null;
}

const C = {
  gold: '#D4AF37',
  sage: '#7F8F7C',
  terra: '#C46D46',
  sand: '#EADCC2',
};

const DETAIL_CARDS = [
  { key: 'taste_of_day', label: 'Taste of the Day', emoji: '🍵' },
  { key: 'sound_of_day', label: 'Sound of the Day', emoji: '🎵' },
  { key: 'nature_detail', label: 'Nature Detail', emoji: '🌿' },
  { key: 'tiny_phrase', label: 'Tiny Phrase', emoji: '✍️' },
];

function GlobeVisual({ tapped, onSpinComplete, theme }) {
  const [spinning, setSpinning] = useState(false);

  const handleTap = () => {
    if (!spinning) {
      setSpinning(true);
      setTimeout(() => {
        setSpinning(false);
        onSpinComplete?.();
      }, 1200);
    }
  };

  return (
    <div
      onClick={handleTap}
      style={{
        width: 200, height: 200,
        margin: '0 auto 2rem',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      {/* Outer glow */}
      <div style={{
        position: 'absolute', inset: '-10px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.accentGold}30 0%, transparent 70%)`,
        filter: 'blur(20px)',
        animation: 'globeGlow 4s ease-in-out infinite',
      }} />
      
      {/* Main globe sphere */}
      <div style={{
        width: '100%', height: '100%',
        borderRadius: '50%',
        position: 'relative',
        overflow: 'hidden',
        background: `radial-gradient(ellipse at 30% 35%, ${theme.bgSoft} 0%, ${theme.accentGold}40 25%, ${theme.bgPrimary} 60%, ${theme.bgCard} 100%)`,
        border: `2px solid ${theme.accentGold}60`,
        boxShadow: `
          0 0 80px ${theme.accentGold}40,
          0 0 120px ${theme.accentGold}20,
          inset 0 0 60px rgba(0,0,0,0.5),
          inset 0 -20px 40px rgba(0,0,0,0.3)
        `,
        animation: spinning ? 'globeFastSpin 1.2s ease-out' : 'globeSlowSpin 40s linear infinite',
      }}>
        {/* Soft continent suggestions (abstract warm landmasses) */}
        <svg
          viewBox="0 0 200 200"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            opacity: 0.4,
            animation: spinning ? 'globeFastSpin 1.2s ease-out' : 'globeSlowSpin 40s linear infinite',
          }}
        >
          {/* Abstract warm continent shapes */}
          <ellipse cx="60" cy="70" rx="25" ry="20" fill={C.sand} opacity="0.5" />
          <ellipse cx="110" cy="60" rx="30" ry="25" fill={C.sand} opacity="0.4" />
          <ellipse cx="140" cy="100" rx="20" ry="18" fill={C.sand} opacity="0.45" />
          <ellipse cx="80" cy="130" rx="22" ry="16" fill={C.sand} opacity="0.4" />
          <ellipse cx="150" cy="140" rx="18" ry="14" fill={C.sand} opacity="0.35" />
          {/* Secondary landmasses */}
          <ellipse cx="40" cy="90" rx="15" ry="12" fill={C.gold} opacity="0.3" />
          <ellipse cx="100" cy="110" rx="16" ry="14" fill={C.gold} opacity="0.25" />
          <ellipse cx="170" cy="80" rx="14" ry="12" fill={C.gold} opacity="0.3" />
        </svg>

        {/* Atmospheric overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 35% 30%, ${theme.bgCard}20 0%, transparent 50%)`,
        }} />
        
        {/* Limb darkening edge */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(circle, transparent 60%, ${theme.bgPrimary}CC 100%)`,
        }} />
      </div>

      {/* Orbital rings */}
      <div style={{
        position: 'absolute', inset: '-8px',
        borderRadius: '50%',
        border: `1px solid ${theme.accentGold}20`,
        boxShadow: `0 0 0 12px ${theme.accentGold}08`,
      }} />
    </div>
  );
}

function DetailCard({ card, data, onTrack, theme, child, editionDate }) {
  const content = data?.[card.key];
  const title = content?.name || content?.word || '—';
  // tiny_phrase also carries a translation and the language it is in. Both are
  // stored on the edition and neither had anywhere to render.
  const subtitle = content?.translation || null;
  const label = content?.language ? `${card.label} · ${content.language}` : card.label;
  const [savedItems, setSavedItems] = useState([]);

  useEffect(() => {
    if (!child || !child.id) return;
    let cancelled = false;
    (async () => {
      try {
        const items = await base44.entities.SavedItem.filter({ child_id: child.id, item_type: card.itemType }, '-saved_at', 10);
        if (!cancelled) setSavedItems(items);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [child?.id]);

  const savedItem = savedItems.find(s => s.item_id === `${card.key}-${title}`);
  const isSaved = !!savedItem;

  return (
    <div
      onMouseEnter={() => onTrack?.('geography', card.label)}
      style={{
        padding: '0.75rem',
        borderRadius: 10,
        background: theme.bgSoft,
        border: `1px solid ${theme.accentGold}12`,
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 4, right: 4 }}>
        <SaveHeartSeal
          childId={child?.id}
          itemType={card.itemType}
          itemId={`${card.key}-${title}`}
          itemTitle={title}
          itemSubtitle={card.label}
          itemImageUrl=""
          countryCode=""
          countryName=""
          themeTags={[card.label.toLowerCase()]}
          editionDate={editionDate}
          size="sm"
        />
      </div>
      <span style={{ fontSize: '1.1rem' }}>{card.emoji}</span>
      <p style={{ fontFamily: theme.fontBody, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: theme.accentGold, margin: '0.3rem 0 0.2rem' }}>
        {label}
      </p>
      <p style={{ fontFamily: theme.fontHeadline, fontSize: '0.85rem', fontWeight: 600, color: theme.textHeadline, margin: 0, lineHeight: 1.3 }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontFamily: theme.fontHeadline, fontStyle: 'italic', fontSize: '0.72rem', color: theme.textMuted, margin: '0.2rem 0 0', lineHeight: 1.35 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function DestinationModal({ dest, imageUrl, onClose, theme }) {
  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const heroImg = imageUrl;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: theme.bgOverlay,
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 800, width: '100%',
          background: theme.bgCard,
          borderRadius: theme.radius,
          border: `1px solid ${theme.accentGold}25`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          boxShadow: theme.shadowDeep,
        }}
      >
        {/* Hero image - fixed, no scroll */}
        <div style={{ position: 'relative', height: 340, background: theme.bgSoft, flexShrink: 0 }}>
          {heroImg ? (
            <img src={heroImg} alt={dest.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '5rem', opacity: 0.2 }}>🌍</span>
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 40, height: 40, borderRadius: '50%',
              background: theme.bgCard, border: `1px solid ${theme.accentGold}50`,
              color: theme.accentGold, fontSize: '1.4rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}
          >×</button>
          
          {/* Location overlay */}
          <div style={{
            position: 'absolute', bottom: '1.5rem', left: '2rem', zIndex: 5,
          }}>
            <p style={{ fontFamily: theme.fontBody, fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.accentGold, margin: '0 0 0.35rem' }}>
              {dest.continent && `${dest.continent} · `}{dest.name}
            </p>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ padding: '2rem 2.5rem 2.5rem', overflowY: 'auto', flex: 1 }}>
          {dest.atmosphere && (
            <p style={{ fontFamily: theme.fontHeadline, fontStyle: 'italic', fontSize: '1.15rem', color: theme.textBody, lineHeight: 1.85, margin: '0 0 1.5rem', borderLeft: `3px solid ${theme.accentGold}40`, paddingLeft: '1rem' }}>
              {dest.atmosphere}
            </p>
          )}

          {dest.child_life?.story && (
            <div style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.95rem', color: theme.textBody, lineHeight: 1.9 }}>
              <p style={{ margin: '0 0 1rem' }}>{dest.child_life.story}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DGDestination({ dest, imageUrl, onTrack, onDestinationClick, onFlagEarned, child, editionDate }) {
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [flagTriggered, setFlagTriggered] = useState(false);
  const [savedItems, setSavedItems] = useState([]);

  useEffect(() => {
    if (!child || !child.id) return;
    let cancelled = false;
    (async () => {
      try {
        const items = await base44.entities.SavedItem.filter({ child_id: child.id, item_type: 'destination' }, '-saved_at', 10);
        if (!cancelled) setSavedItems(items);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [child?.id]);

  if (!dest) return null;

  const savedDestination = savedItems.find(s => s.item_id === dest.name);
  const isDestinationSaved = !!savedDestination;

  const iso2 = getDestinationIso2(dest.name);

  const handleDestinationView = () => {
    onDestinationClick?.();
    setModalOpen(true);
    // Trigger flag earn on first view
    if (!flagTriggered && iso2) {
      setFlagTriggered(true);
      onFlagEarned?.(dest.name?.split(',')[0].trim(), iso2, 'destination');
    }
  };

  const heroImg = imageUrl;

  return (
    <section style={{ background: theme.bgCard, borderRadius: 20, border: `1px solid ${theme.accentGold}15`, overflow: 'hidden' }}>
      <style>{`
        @keyframes globeSlowSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes globeFastSpin { from { transform: rotate(0deg); } to { transform: rotate(720deg); } }
        @keyframes globeGlow { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>

      {/* Compact hero image */}
      <div
        onClick={handleDestinationView}
        onMouseEnter={() => onTrack?.('geography', dest.name)}
        style={{ position: 'relative', height: 180, cursor: 'pointer', overflow: 'hidden' }}
      >
        {heroImg ? (
          <img src={heroImg} alt={dest.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '3rem', opacity: 0.2 }}>🌍</span>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${theme.bgCard} 100%)` }} />
        <div style={{ position: 'absolute', bottom: '1rem', left: '1.25rem', right: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {iso2 && <FlagSealMedallion countryCode={iso2} countryName={dest.name?.split(',')[0]} size="md" earned />}
            <h3 style={{ fontFamily: theme.fontHeadline, fontSize: '1.5rem', fontWeight: 700, color: theme.textHeadline, margin: 0, lineHeight: 1.1 }}>
              {dest.name?.split(',')[0]}
            </h3>
          </div>
          <div style={{ flexShrink: 0 }}>
            <SaveHeartSeal
              childId={child?.id}
              itemType="destination"
              itemId={dest.name}
              itemTitle={dest.name?.split(',')[0]}
              itemSubtitle={dest.atmosphere?.split('.').slice(0, 1).join('.').trim() || 'Destination'}
              itemImageUrl={heroImg}
              countryCode={iso2 || ''}
              countryName={dest.name?.split(',')[0] || ''}
              themeTags={[dest.continent?.toLowerCase() || 'travel', 'geography']}
              editionDate={editionDate}
              size="md"
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
        {/* Section label */}
        <p style={{ fontFamily: theme.fontBody, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 0.5rem' }}>
          Where in the World
        </p>

        {/* Atmosphere */}
        {dest.atmosphere && (
          <p style={{ fontFamily: theme.fontHeadline, fontStyle: 'italic', fontSize: '0.9rem', color: theme.textBody, margin: '0 0 1rem', lineHeight: 1.7 }}>
            {dest.atmosphere.split('.').slice(0, 2).join('.') + '.'}
          </p>
        )}

        {/* Destination Modal */}
        {modalOpen && (
          <DestinationModal
            dest={dest}
            imageUrl={heroImg}
            onClose={() => setModalOpen(false)}
            theme={theme}
          />
        )}

        {/* Detail cards — 2x2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {DETAIL_CARDS.map(card => (
            <DetailCard key={card.key} card={card} data={dest} theme={theme} onTrack={onTrack} child={child} editionDate={editionDate} />
          ))}
        </div>
      </div>
    </section>
  );
}