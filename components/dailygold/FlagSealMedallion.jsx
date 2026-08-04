// @ts-nocheck — untyped .jsx from before checkJs was on; 4 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * FlagSealMedallion
 * Renders a country flag as a vintage gold-rimmed circular seal medallion.
 * size: 'xs'=24px | 'sm'=36px | 'md'=56px | 'lg'=80px
 * earned: true = full color | false = greyed silhouette
 * With onClick it renders a real <button> (padded to a ≥44px hit area);
 * otherwise a role="img" element labelled with the country and earned state.
 *
 * Flags are the SVGs in public/flags (synced from flag-icons by
 * `npm run sync:flags`) — emoji flags render as empty boxes on Windows
 * Chrome, and that failure is invisible to the invalid-code fallback.
 * A missing/failed image falls back to the initials treatment.
 */
import React, { useState } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';

const SIZES = { xs: 24, sm: 36, md: 56, lg: 80 };

/**
 * Load-bearing: without it TS infers `onClick` and `fallbackInitials` — the two
 * parameters with no default — as *required*, and every caller that renders a
 * plain, non-interactive seal stops type-checking the moment it becomes .tsx.
 * Both are genuinely optional; the body already branches on their absence.
 *
 * @param {{
 *   countryCode: string | null,
 *   countryName?: string | null,
 *   size?: keyof typeof SIZES,
 *   earned?: boolean,
 *   onClick?: (() => void) | null,
 *   showLabel?: boolean,
 *   fallbackInitials?: string | null,
 * }} props
 */
function FlagSealMedallion({ countryCode, countryName, size = 'sm', earned = true, onClick, showLabel = false, fallbackInitials }) {
  const { theme } = useTheme();
  const [imgFailed, setImgFailed] = useState(false);
  const px = SIZES[size] || SIZES.sm;
  const code = (countryCode || '').toUpperCase();

  // Validate: must be exactly 2 uppercase ASCII letters A-Z
  const isValidCode = code.length === 2 && /^[A-Z]{2}$/.test(code);
  const showFlag = isValidCode && !imgFailed;

  // Fallback text: initials from countryName or fallbackInitials prop, else '?'
  const fallbackText = fallbackInitials
    || (countryName ? countryName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?');

  const borderW = Math.max(2, Math.round(px * 0.06));
  const fallbackFontSize = Math.round(px * 0.32);

  const ariaLabel = `${countryName || fallbackText}, ${earned ? 'collected' : 'not collected yet'}`;

  const medallion = (
    <>
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
        {/* SVG flag or warm gold initials fallback */}
        {showFlag ? (
          <img
            src={`/flags/${code.toLowerCase()}.svg`}
            alt=""
            width={px}
            height={px}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              // 4:3 source in a circular frame: cover crops the sides, and the
              // slight upscale hides the hairline seam at the clipped edge.
              objectFit: 'cover',
              transform: 'scale(1.02)',
              zIndex: 1,
            }}
          />
        ) : (
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: fallbackFontSize,
            fontFamily: theme.fontHeadline,
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
          fontFamily: theme.fontHeadline,
          fontSize: Math.max(10, Math.round(px * 0.19)),
          color: earned ? theme.textBody : theme.textMuted,
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
    </>
  );

  const layout = {
    display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
    gap: Math.round(px * 0.08),
    userSelect: 'none',
  };

  if (onClick) {
    // Pad the hit area out to ≥44px even for the smallest medallions; the
    // negative margin keeps the visual footprint unchanged.
    const hitPad = Math.max(0, Math.ceil((44 - px) / 2));
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        title={countryName}
        style={{
          ...layout,
          background: 'transparent',
          border: 'none',
          padding: hitPad,
          margin: -hitPad,
          cursor: 'pointer',
          font: 'inherit',
          color: 'inherit',
        }}
      >
        <span aria-hidden="true" style={{ display: 'contents' }}>{medallion}</span>
      </button>
    );
  }

  return (
    <div role="img" aria-label={ariaLabel} title={countryName} style={layout}>
      {medallion}
    </div>
  );
}

// The passport grid mounts one of these per country, all at once; memo keeps a detail-panel
// open/close from re-rendering the whole wall.
export default React.memo(FlagSealMedallion);
