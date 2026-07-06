'use client';
/**
 * FlagSealMedallion
 * Renders a country flag as a vintage gold-rimmed circular seal medallion.
 * size: 'xs'=24px | 'sm'=36px | 'md'=56px | 'lg'=80px
 * earned: true = full color | false = greyed silhouette
 */

const SIZES = { xs: 24, sm: 36, md: 56, lg: 80 };

export default function FlagSealMedallion({ countryCode, countryName, size = 'sm', earned = true, onClick, showLabel = false, fallbackInitials }) {
  const px = SIZES[size] || SIZES.sm;
  const code = (countryCode || '').toUpperCase();

  // Validate: must be exactly 2 uppercase ASCII letters A-Z
  const isValidCode = code.length === 2 && /^[A-Z]{2}$/.test(code);

  // Convert ISO2 country code to flag emoji
  const flagEmoji = isValidCode
    ? String.fromCodePoint(...code.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
    : null;

  // Fallback text: initials from countryName or fallbackInitials prop, else '?'
  const fallbackText = fallbackInitials
    || (countryName ? countryName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?');

  const borderW = Math.max(2, Math.round(px * 0.06));
  const fontSize = Math.round(px * 0.5);
  const fallbackFontSize = Math.round(px * 0.32);

  return (
    <div
      onClick={onClick}
      title={countryName}
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
        gap: Math.round(px * 0.08),
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <div style={{
        width: px, height: px, borderRadius: '50%',
        position: 'relative', overflow: 'hidden', flexShrink: 0,
        background: earned
          ? 'radial-gradient(circle at 35% 30%, #FDF6E8 0%, #EFE0BE 55%, #D8C89A 100%)'
          : 'radial-gradient(circle at 35% 30%, #E8E4DC 0%, #D4D0C8 55%, #C4C0B8 100%)',
        border: `${borderW}px solid ${earned ? 'rgba(201,169,110,0.9)' : 'rgba(180,170,155,0.4)'}`,
        boxShadow: earned
          ? `0 ${Math.round(px*0.04)}px ${Math.round(px*0.18)}px rgba(100,80,40,0.22), inset 0 1px 0 rgba(255,255,255,0.7), 0 0 ${Math.round(px*0.12)}px rgba(201,169,110,0.25)`
          : `0 1px ${Math.round(px*0.1)}px rgba(0,0,0,0.08)`,
        filter: earned ? 'none' : 'grayscale(1) opacity(0.38)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}>
        {/* Inner emboss ring */}
        <div style={{
          position: 'absolute',
          inset: Math.round(px * 0.09),
          borderRadius: '50%',
          border: `1px solid ${earned ? 'rgba(230,200,140,0.55)' : 'rgba(200,190,175,0.2)'}`,
          pointerEvents: 'none', zIndex: 2,
        }} />
        {/* Highlight */}
        {earned && (
          <div style={{
            position: 'absolute', top: '8%', left: '12%',
            width: '42%', height: '38%', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.5) 0%, transparent 100%)',
            pointerEvents: 'none', zIndex: 3,
          }} />
        )}
        {/* Flag emoji or warm gold fallback */}
        {flagEmoji ? (
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize, lineHeight: 1, zIndex: 1,
          }}>
            {flagEmoji}
          </span>
        ) : (
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: fallbackFontSize,
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontWeight: 600,
            color: 'rgba(140,100,40,0.85)',
            lineHeight: 1,
            zIndex: 1,
            userSelect: 'none',
          }}>
            {fallbackText}
          </span>
        )}
      </div>

      {showLabel && countryName && (
        <span style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: Math.max(8, Math.round(px * 0.19)),
          color: earned ? '#5C4A2A' : '#9A9490',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: px * 1.5,
          whiteSpace: px >= 56 ? 'normal' : 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {countryName}
        </span>
      )}
    </div>
  );
}