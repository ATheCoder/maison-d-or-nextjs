'use client';
/**
 * DGWaxSealNavigator — Vintage wax seal press day navigator
 * Two embossed cream-and-gold medallions flanking the date in Cormorant Garamond.
 * Press animation: stamp-down + page-turn rotateY flip to new date.
 */
import { useState, useEffect, useCallback } from 'react';
import { getEditionByDate, getEditionDates } from '@/app/daily-gold-edition/actions';
import { useTheme } from '@/components/theme/ThemeContext';

// SVG seal face — vintage engraved arrow as the clear primary mark,
// with a fine embossed ring frame and small corner flourishes.
function SealFace({ direction, disabled }) {
  const gold = disabled ? 'rgba(201,169,110,0.3)' : 'rgba(201,169,110,0.92)';
  const goldFaint = disabled ? 'rgba(201,169,110,0.12)' : 'rgba(201,169,110,0.35)';
  const goldMid = disabled ? 'rgba(201,169,110,0.2)' : 'rgba(201,169,110,0.55)';

  // back = left arrow, forward = right arrow
  const isBack = direction === 'back';

  return (
    <svg viewBox="0 0 44 44" width="30" height="30" style={{ display: 'block' }}>
      {/* Outer embossed ring */}
      <circle cx="22" cy="22" r="20" fill="none" stroke={goldMid} strokeWidth="1" />
      {/* Inner fine ring */}
      <circle cx="22" cy="22" r="16" fill="none" stroke={goldFaint} strokeWidth="0.6" />

      {/* Corner dot flourishes at cardinal points */}
      <circle cx="22" cy="4"  r="0.9" fill={goldFaint} />
      <circle cx="22" cy="40" r="0.9" fill={goldFaint} />
      <circle cx="4"  cy="22" r="0.9" fill={goldFaint} />
      <circle cx="40" cy="22" r="0.9" fill={goldFaint} />

      {/* === VINTAGE ENGRAVED ARROW — the primary mark === */}
      {isBack ? (
        <g transform="translate(22,22)">
          {/* Arrow shaft */}
          <line x1="7" y1="0" x2="-5" y2="0" stroke={gold} strokeWidth="1.8" strokeLinecap="round" />
          {/* Arrowhead — elegant V-chevron */}
          <polyline points="0,-4.5 -6,0 0,4.5" fill="none" stroke={gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          {/* Tail serif — a short horizontal serif at the right end of shaft */}
          <line x1="7" y1="-2.2" x2="7" y2="2.2" stroke={gold} strokeWidth="1" strokeLinecap="round" />
        </g>
      ) : (
        <g transform="translate(22,22)">
          {/* Arrow shaft */}
          <line x1="-7" y1="0" x2="5" y2="0" stroke={gold} strokeWidth="1.8" strokeLinecap="round" />
          {/* Arrowhead — elegant V-chevron */}
          <polyline points="0,-4.5 6,0 0,4.5" fill="none" stroke={gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          {/* Tail serif */}
          <line x1="-7" y1="-2.2" x2="-7" y2="2.2" stroke={gold} strokeWidth="1" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

function WaxSeal({ direction, disabled, onPress, pressing }) {
  const gold = '#C9A96E';
  const cream = '#FAF7F2';
  const linen = '#EDE0CC';

  return (
    <button
      onClick={disabled ? undefined : onPress}
      style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: disabled
          ? `radial-gradient(circle at 35% 30%, #F0EAE0 0%, #E0D8CC 60%, #D4CBBC 100%)`
          : `radial-gradient(circle at 35% 30%, ${cream} 0%, ${linen} 55%, #D8CCBA 100%)`,
        border: `2px solid ${disabled ? 'rgba(201,169,110,0.2)' : 'rgba(201,169,110,0.7)'}`,
        boxShadow: disabled
          ? 'none'
          : pressing
            ? `0 1px 4px rgba(100,80,40,0.25), inset 0 2px 4px rgba(0,0,0,0.12)`
            : `0 3px 10px rgba(100,80,40,0.2), 0 1px 3px rgba(100,80,40,0.15), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,0,0,0.06)`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: pressing ? 'scale(0.88)' : 'scale(1)',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Inner emboss ring */}
      <div style={{
        position: 'absolute',
        inset: 4,
        borderRadius: '50%',
        border: `1px solid rgba(201,169,110,${disabled ? '0.1' : '0.4'})`,
        pointerEvents: 'none',
      }} />
      {/* Seal face SVG */}
      <SealFace direction={direction} disabled={disabled} />
    </button>
  );
}

export default function DGWaxSealNavigator({ currentDate, onEditionChange, initialDates = [] }) {
  const [allDates, setAllDates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [pressing, setPressing] = useState(null); // 'back' | 'forward' | null
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState(0); // -1 = going back, +1 = going forward
  const [displayDate, setDisplayDate] = useState(currentDate);
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Load all available edition dates on mount (from the local DB via a server
  // action, or reuse the list already fetched on the server).
  useEffect(() => {
    const init = (dates) => {
      setAllDates(dates);
      const idx = dates.indexOf(currentDate);
      setCurrentIndex(idx !== -1 ? idx : dates.length - 1);
    };
    if (initialDates && initialDates.length) {
      init(initialDates);
    } else {
      getEditionDates().then(init).catch(() => {});
    }
  }, []);

  // Sync index when currentDate changes externally
  useEffect(() => {
    if (allDates.length > 0) {
      const idx = allDates.indexOf(currentDate);
      if (idx !== -1) setCurrentIndex(idx);
    }
    setDisplayDate(currentDate);
  }, [currentDate, allDates]);

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const navigate = useCallback(async (direction) => {
    if (loading || allDates.length === 0) return;
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= allDates.length) return;

    const targetDate = allDates[newIndex];
    setPressing(direction === -1 ? 'back' : 'forward');
    setFlipDir(direction);

    // Stamp down then release
    await new Promise(r => setTimeout(r, 120));
    setPressing(null);

    // Page-turn flip
    setFlipping(true);
    await new Promise(r => setTimeout(r, 200));

    // Swap date mid-flip
    setDisplayDate(targetDate);
    setCurrentIndex(newIndex);

    await new Promise(r => setTimeout(r, 200));
    setFlipping(false);

    // Load the edition for this date
    setLoading(true);
    try {
      const record = await getEditionByDate(targetDate);
      if (record) {
        onEditionChange(record);
      }
    } catch (_) {}
    setLoading(false);
  }, [currentIndex, allDates, loading, onEditionChange]);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < allDates.length - 1;

  const gold = '#C9A96E';
  const mocha = '#3A2D24';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.25rem',
      padding: '1.25rem 1.5rem',
      background: 'linear-gradient(180deg, rgba(245,239,230,0.9) 0%, rgba(237,224,204,0.6) 100%)',
      borderBottom: '1px solid rgba(201,169,110,0.15)',
    }}>
      {/* Back seal */}
      <WaxSeal
        direction="back"
        disabled={!canGoBack || loading}
        pressing={pressing === 'back'}
        onPress={() => navigate(-1)}
      />

      {/* Date display with page-turn flip */}
      <div style={{
        flex: 1,
        maxWidth: 340,
        textAlign: 'center',
        perspective: '600px',
      }}>
        <div style={{
          transform: flipping ? `rotateY(${flipDir * 90}deg)` : 'rotateY(0deg)',
          transition: 'transform 0.2s ease-in-out',
          transformStyle: 'preserve-3d',
        }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
            color: mocha,
            margin: 0,
            letterSpacing: '0.03em',
            lineHeight: 1.3,
          }}>
            {formatDisplayDate(displayDate)}
          </p>
          {loading && (
            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '0.65rem',
              color: gold,
              margin: '0.25rem 0 0',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              Loading edition…
            </p>
          )}
        </div>

        {/* Thin gold rule beneath date */}
        <div style={{
          height: 1,
          background: `linear-gradient(to right, transparent, ${gold}50, transparent)`,
          marginTop: '0.5rem',
        }} />

        {/* Edition count indicator */}
        {allDates.length > 1 && (
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '0.6rem',
            color: `${gold}70`,
            margin: '0.35rem 0 0',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>
            Edition {currentIndex + 1} of {allDates.length}
          </p>
        )}
      </div>

      {/* Forward seal */}
      <WaxSeal
        direction="forward"
        disabled={!canGoForward || loading}
        pressing={pressing === 'forward'}
        onPress={() => navigate(1)}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,400;0,400&display=swap');
      `}</style>
    </div>
  );
}