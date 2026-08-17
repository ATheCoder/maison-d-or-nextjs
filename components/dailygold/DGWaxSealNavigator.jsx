// @ts-nocheck — untyped .jsx from before checkJs was on; 12 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * DGWaxSealNavigator — Vintage wax seal press day navigator
 * Two embossed cream-and-gold medallions flanking the date (theme headline serif).
 * Press animation: stamp-down + page-turn rotateY flip to new date.
 */
import { useState, useCallback, useOptimistic, useTransition } from 'react';
import { DGEyebrow } from '@/components/dailygold/DGSectionHeader';
import { useInstrumentation } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';

// SVG seal face — vintage engraved arrow as the clear primary mark,
// with a fine embossed ring frame and small corner flourishes.
function SealFace({ direction, disabled }) {
  const gold = disabled
    ? 'color-mix(in srgb, var(--palette-gold) 30%, transparent)'
    : 'color-mix(in srgb, var(--palette-gold) 92%, transparent)';
  const goldFaint = disabled
    ? 'color-mix(in srgb, var(--palette-gold) 12%, transparent)'
    : 'color-mix(in srgb, var(--palette-gold) 35%, transparent)';
  const goldMid = disabled
    ? 'color-mix(in srgb, var(--palette-gold) 20%, transparent)'
    : 'color-mix(in srgb, var(--palette-gold) 55%, transparent)';

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
  const cream = 'var(--palette-ivory)';
  const linen = 'var(--palette-sand)';

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
          : `radial-gradient(circle at 35% 30%, ${cream} 0%, ${linen} 55%, color-mix(in srgb, var(--palette-sand) 88%, var(--palette-walnut)) 100%)`,
        border: `2px solid color-mix(in srgb, var(--palette-gold) ${disabled ? '20%' : '70%'}, transparent)`,
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
        border: `1px solid color-mix(in srgb, var(--palette-gold) ${disabled ? '10%' : '40%'}, transparent)`,
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
  const { track } = useInstrumentation();
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
      // Recorded here because this is the one moment both days are in hand: the
      // edition being turned to is the event's edition_date, the day being left
      // is its label. Ahead of the state change, so the closure still names the
      // day the child is leaving.
      track('edition_turn', { editionDate: targetDate, label: displayDate, source: 'seal_navigator' });
      setDisplayDate(targetDate);
      onDateChange(targetDate);
    });

    await new Promise(r => setTimeout(r, 200));
    setFlipping(false);
  }, [currentIndex, allDates, pending, onDateChange, setDisplayDate, displayDate, track]);

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
      background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface-tint) 0%, transparent) 0%, color-mix(in srgb, var(--surface-tint) 35%, transparent) 20%, color-mix(in srgb, var(--surface-tint) 90%, transparent) 48%, color-mix(in srgb, var(--surface-tint) 90%, transparent) 72%, color-mix(in srgb, var(--surface-tint) 0%, transparent) 100%)',
    }}>
      {/* Divider rule — a gradient hairline that fades at both ends, rather
          than a full-width border that would re-introduce a hard edge. */}
      <div aria-hidden="true" style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: 1,
        background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 20%, transparent) 25%, color-mix(in srgb, var(--accent) 20%, transparent) 75%, transparent)',
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
            fontFamily: 'var(--face-display)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '0.03em',
            lineHeight: 1.3,
          }}>
            {formatDisplayDate(displayDate)}
          </p>
          {pending && (
            <DGEyebrow tracking="tight" color="var(--accent-readable)" style={{ margin: '0.25rem 0 0' }}>
              Loading edition…
            </DGEyebrow>
          )}
        </div>

        {/* Thin gold rule beneath date */}
        <div aria-hidden="true" style={{
          height: 1,
          background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 31%, transparent), transparent)',
          marginTop: '0.5rem',
        }} />

        {/* Position in the archive. Counts days, not editions: a listed day may
            have only Golden Stories and no edition row. Hidden on a day that
            isn't in the list at all (today, before anything is authored). */}
        {allDates.length > 1 && currentIndex < allDates.length && (
          <DGEyebrow tracking="wide" color="var(--text-secondary)" style={{ margin: '0.35rem 0 0' }}>
            Day {currentIndex + 1} of {allDates.length}
          </DGEyebrow>
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