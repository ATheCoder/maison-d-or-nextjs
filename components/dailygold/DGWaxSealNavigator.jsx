'use client';
/**
 * DGWaxSealNavigator — Vintage wax seal press day navigator
 * Two embossed cream-and-gold medallions flanking the date (theme headline serif).
 * Press animation: stamp-down + page-turn rotateY flip to new date.
 */
import { useState, useCallback, useOptimistic, useTransition } from 'react';
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
    <svg viewBox="0 0 44 44" width="30" height="30" aria-hidden="true" style={{ display: 'block' }}>
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

function WaxSeal({ direction, disabled, onPress, pressing, ariaLabel }) {
  const cream = '#FAF7F2';
  const linen = '#EDE0CC';

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      aria-label={ariaLabel}
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
      <div aria-hidden="true" style={{
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

// Where a date sits in the edition list. A date with no edition of its own
// (today, before it has been published) sits one past the end rather than on
// the last edition: otherwise the navigator claims today *is* the newest
// edition, and stepping back skips over it.
function indexForDate(dates, date) {
  const idx = dates.indexOf(date);
  return idx !== -1 ? idx : dates.length;
}

/**
 * @param {{ currentDate: string, availableDates?: string[], onDateChange: (date: string) => void }} props
 * `onDateChange` navigates — the viewed day lives in the URL — so `currentDate`
 * arrives back as a prop once the new day has rendered.
 */
export default function DGWaxSealNavigator({ currentDate, onDateChange, availableDates = [] }) {
  const { theme } = useTheme();
  const [pressing, setPressing] = useState(null); // 'back' | 'forward' | null
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState(0); // -1 = going back, +1 = going forward
  const [pending, startTransition] = useTransition();

  // The date on the seal turns mid-flip, ahead of the day it names: the press
  // should feel answered at once, even though the content behind it is still a
  // navigation away. Optimistic rather than plain state, so the guess lasts
  // exactly as long as the navigation does — when it lands, is superseded, or
  // is abandoned, React puts `currentDate` back and the seal can never end up
  // naming a day the URL isn't showing. It follows the browser's own back and
  // forward buttons for free, since those change `currentDate` too.
  const [displayDate, setDisplayDate] = useOptimistic(currentDate);

  const allDates = availableDates;
  const currentIndex = indexForDate(allDates, displayDate);

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const navigate = useCallback(async (direction) => {
    if (pending || allDates.length === 0) return;
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

    // Mid-flip: the date on the seal turns and the page turns with it. A listed
    // day need not have an edition row of its own — it may be listed for its
    // Golden Stories alone — so the date is the authority and the page renders
    // whatever exists for it, possibly nothing. Both happen inside the one
    // transition: `pending` then holds the loading line, and the optimistic
    // date, until the new day's content has actually arrived.
    startTransition(() => {
      setDisplayDate(targetDate);
      onDateChange(targetDate);
    });

    await new Promise(r => setTimeout(r, 200));
    setFlipping(false);
  }, [currentIndex, allDates, pending, onDateChange, setDisplayDate]);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < allDates.length - 1;

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.25rem',
      padding: '1.75rem 1.5rem 1.5rem',
      // The hero above and the section below both sit on the page's own
      // `bgPrimary`, so a flat `bgSoft` block reads as a pasted-on band with a
      // hard seam at each edge. Fading the tint in from — and back out to —
      // fully transparent `bgSoft` (the same hue at zero alpha, so no grey
      // halo) lets the strip lift off the page instead of cutting into it.
      // Every stop is theme-token derived, so it holds for all five themes.
      background: `linear-gradient(180deg, ${theme.bgSoft}00 0%, ${theme.bgSoft}59 20%, ${theme.bgSoft}E6 48%, ${theme.bgSoft}E6 72%, ${theme.bgSoft}00 100%)`,
    }}>
      {/* Divider rule — a gradient hairline that fades at both ends, rather
          than a full-width border that would re-introduce a hard edge. */}
      <div aria-hidden="true" style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: 1,
        background: `linear-gradient(to right, transparent, ${theme.accentGold}33 25%, ${theme.accentGold}33 75%, transparent)`,
        pointerEvents: 'none',
      }} />
      {/* Back seal */}
      <WaxSeal
        direction="back"
        disabled={!canGoBack || pending}
        pressing={pressing === 'back'}
        onPress={() => navigate(-1)}
        ariaLabel="Previous day"
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
            fontFamily: theme.fontHeadline,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
            color: theme.textBody,
            margin: 0,
            letterSpacing: '0.03em',
            lineHeight: 1.3,
          }}>
            {formatDisplayDate(displayDate)}
          </p>
          {pending && (
            <p style={{
              fontFamily: theme.fontBody,
              fontSize: '0.7rem',
              color: theme.accentGold,
              margin: '0.25rem 0 0',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              Loading edition…
            </p>
          )}
        </div>

        {/* Thin gold rule beneath date */}
        <div aria-hidden="true" style={{
          height: 1,
          background: `linear-gradient(to right, transparent, ${theme.accentGold}50, transparent)`,
          marginTop: '0.5rem',
        }} />

        {/* Position in the archive. Counts days, not editions: a listed day may
            have only Golden Stories and no edition row. Hidden on a day that
            isn't in the list at all (today, before anything is authored). */}
        {allDates.length > 1 && currentIndex < allDates.length && (
          <p style={{
            fontFamily: theme.fontBody,
            fontSize: '0.7rem',
            color: theme.textMuted,
            margin: '0.35rem 0 0',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>
            Day {currentIndex + 1} of {allDates.length}
          </p>
        )}
      </div>

      {/* Forward seal */}
      <WaxSeal
        direction="forward"
        disabled={!canGoForward || pending}
        pressing={pressing === 'forward'}
        onPress={() => navigate(1)}
        ariaLabel="Next day"
      />
    </div>
  );
}