'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';
import { resolveLocation } from '@/lib/countries';

// Small vintage wax seal for year navigation inside On This Day
function YearSeal({ direction, disabled, onPress, pressing }) {
  const { theme } = useTheme();
  const isBack = direction === 'back';
  const gold = disabled ? `${theme.accentGold}4D` : `${theme.accentGold}EB`;
  const goldMid = disabled ? `${theme.accentGold}33` : `${theme.accentGold}8C`;
  const goldFaint = disabled ? `${theme.accentGold}1F` : `${theme.accentGold}4D`;

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={isBack ? 'Travel to an earlier year' : 'Travel to a later year'}
      style={{
        width: 44, height: 44, borderRadius: '50%', padding: 0,
        background: `radial-gradient(circle at 35% 30%, ${theme.bgCard} 0%, ${theme.bgSoft} 55%, ${theme.bgPrimary} 100%)`,
        border: `2px solid ${theme.accentGold}${disabled ? '33' : 'A6'}`,
        boxShadow: disabled
          ? 'none'
          : pressing
            ? `inset 0 2px 4px ${theme.accentGold}26`
            : `${theme.shadowSoft}, inset 0 1px 0 ${theme.accentGold}26`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: pressing ? 'scale(0.87)' : 'scale(1)',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Inner emboss ring */}
      <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', border: `1px solid ${theme.accentGold}${disabled ? '1A' : '59'}`, pointerEvents: 'none' }} />
      {/* Arrow SVG */}
      <svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true" style={{ display: 'block' }}>
        <circle cx="20" cy="20" r="17" fill="none" stroke={goldMid} strokeWidth="0.9" />
        <circle cx="20" cy="20" r="13" fill="none" stroke={goldFaint} strokeWidth="0.5" />
        {isBack ? (
          <g transform="translate(20,20)">
            <line x1="6" y1="0" x2="-4" y2="0" stroke={gold} strokeWidth="1.7" strokeLinecap="round" />
            <polyline points="0,-4 -5,0 0,4" fill="none" stroke={gold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="6" y1="-2" x2="6" y2="2" stroke={gold} strokeWidth="0.9" strokeLinecap="round" />
          </g>
        ) : (
          <g transform="translate(20,20)">
            <line x1="-6" y1="0" x2="4" y2="0" stroke={gold} strokeWidth="1.7" strokeLinecap="round" />
            <polyline points="0,-4 5,0 0,4" fill="none" stroke={gold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="-6" y1="-2" x2="-6" y2="2" stroke={gold} strokeWidth="0.9" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </button>
  );
}

export default function DGOnThisDay({ events = [], onTrack, onFlagEarned }) {
  const { theme } = useTheme();
  const [pressingYear, setPressingYear] = useState(null); // 'back' | 'forward' | null

  // Published events from the on_this_day_event table, grouped year → list in
  // position order. A year holds a list, not a slot: several events in one year
  // is the normal case and the reader shows all of them. The server has already
  // filtered on the publish gate; the headline/story guard is belt-and-braces
  // for a row that was published while still half-written.
  const byYear = useMemo(() => {
    const m = {};
    for (const ev of events) {
      if (!ev?.headline || !ev.story) continue;
      (m[ev.year] ||= []).push(ev);
    }
    for (const list of Object.values(m)) list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return m;
  }, [events]);

  const MAX_YEAR = new Date().getFullYear();

  // The most recent year this day holds something for. The corpus is authored
  // day by day and year by year, so the current year is usually empty; opening
  // there would show the child an empty card for a day that has content. A
  // future-dated row is ignored — "most recent" means most recent that has
  // already happened.
  const latestAuthoredYear = useMemo(() => {
    const years = Object.keys(byYear).map(Number).filter((y) => y <= MAX_YEAR);
    return years.length ? Math.max(...years) : null;
  }, [byYear, MAX_YEAR]);

  // On This Day is the last twenty years; the deep past belongs to Greatest
  // Moments, which is reached by rank rather than by stepping. Flooring the
  // navigator here is what stops a child walking back to year 1 through
  // hundreds of empty years. The floor drops to meet an older authored year so
  // that the year the section opens on is never below its own floor — it moves
  // for content that exists, never to open up empty centuries.
  const MIN_YEAR = Math.min(MAX_YEAR - 20, latestAuthoredYear ?? MAX_YEAR);

  // Where the section opens: the most recent authored year, or the current year
  // when the day has nothing at all (the empty state below then says so).
  const landingYear = latestAuthoredYear ?? MAX_YEAR;
  const [currentYear, setCurrentYear] = useState(landingYear);

  // A new calendar day arrives as a new `events` array — re-land on that day's
  // most recent authored year. Keyed on `events` rather than the edition id
  // because the id changes first and the events land a fetch later, so the old
  // day's year would stick. Adjusted during render rather than in an effect: an
  // effect would render the new day's events under the old day's year first,
  // then immediately re-render.
  const [lastEvents, setLastEvents] = useState(events);
  if (events !== lastEvents) {
    setLastEvents(events);
    setCurrentYear(landingYear);
  }

  // A step is only offered when it lands on something: an arrow is live when the
  // neighbouring year holds an event, dead when it is empty. The corpus is
  // sparse, so most neighbours are empty — this is what stops a press handing
  // the child the "nothing here yet" card. The band still bounds both ends.
  const hasEventsIn = useCallback((year) => (byYear[year]?.length ?? 0) > 0, [byYear]);
  const canGoBack = currentYear - 1 >= MIN_YEAR && hasEventsIn(currentYear - 1);
  const canGoForward = currentYear + 1 <= MAX_YEAR && hasEventsIn(currentYear + 1);

  // Handle year navigation
  const goBackOneYear = useCallback(() => {
    if (canGoBack) {
      const newYear = currentYear - 1;
      setCurrentYear(newYear);
      onTrack?.('history', String(newYear));
    }
  }, [currentYear, onTrack, canGoBack]);

  const goForwardOneYear = useCallback(() => {
    if (canGoForward) {
      const newYear = currentYear + 1;
      setCurrentYear(newYear);
      onTrack?.('history', String(newYear));
    }
  }, [currentYear, onTrack, canGoForward]);

  // Which years inside the band actually hold something, nearest first from
  // wherever the child is standing. An unauthored year is an ordinary outcome,
  // not a gap to fill at read time — so it offers a real destination instead of
  // generating one (D5).
  const authoredYears = useMemo(
    () => Object.keys(byYear).map(Number).filter((y) => y >= MIN_YEAR && y <= MAX_YEAR).sort((a, b) => b - a),
    [byYear, MIN_YEAR, MAX_YEAR],
  );

  const nearestAuthoredYear = useMemo(() => {
    if (!authoredYears.length) return null;
    // Ties go to the more recent year, which authoredYears already orders first.
    return authoredYears.reduce((best, y) =>
      Math.abs(y - currentYear) < Math.abs(best - currentYear) ? y : best);
  }, [authoredYears, currentYear]);

  const jumpToYear = useCallback((year) => {
    setCurrentYear(year);
    onTrack?.('history', String(year));
  }, [onTrack]);

  const yearEvents = useMemo(() => byYear[currentYear] || [], [byYear, currentYear]);

  // Award a flag seal for each event location the child actually sees. Keyed by
  // year and position, because a year can hold several events in different
  // countries and each is its own collectible.
  const earnedKeys = useRef(new Set());
  useEffect(() => {
    for (const ev of yearEvents) {
      const key = `${ev.year}:${ev.position ?? 0}`;
      if (!ev.location || earnedKeys.current.has(key)) continue;
      const iso2 = resolveLocation(ev.location);
      if (iso2) {
        earnedKeys.current.add(key);
        onFlagEarned?.(ev.location, iso2, 'on_this_day');
      }
    }
  }, [yearEvents, onFlagEarned]);

  return (
    <section style={{ background: 'transparent', borderRadius: 0, overflow: 'visible' }}>
      <div style={{ padding: '0' }}>
        {/* Header — fixed height, matches sibling columns exactly */}
        <div style={{ marginBottom: '0.85rem' }}>
          <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 0.35rem' }}>
            Travel through time
          </p>
          <h2 style={{ fontFamily: theme.fontHeadline, fontSize: '1.4rem', fontWeight: 600, color: theme.textHeadline, margin: 0, lineHeight: 1.15 }}>
            On This Day
          </h2>
        </div>

        {/* Card — year nav INSIDE, below the year heading */}
        <div style={{
          background: theme.bgCard,
          borderRadius: theme.radiusSmall,
          overflow: 'hidden',
          border: `1px solid ${theme.accentGold}25`,
          boxShadow: theme.shadowSoft,
        }}>
          {/* Year display + arrows — all inside the card */}
          <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: `1px solid ${theme.accentGold}1F` }}>
            <p style={{ fontFamily: theme.fontHeadline, fontSize: '1.6rem', fontWeight: 600, color: theme.textHeadline, margin: '0 0 0.1rem', lineHeight: 1, textAlign: 'center' }}>
              {currentYear}
            </p>
            <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', color: theme.textMuted, margin: '0 0 0.75rem', textAlign: 'center' }}>
              {currentYear === MAX_YEAR ? 'Most recent year' : `${MAX_YEAR - currentYear} years ago`}
            </p>
            {/* Arrows below the year */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <YearSeal
                direction="back"
                disabled={!canGoBack}
                pressing={pressingYear === 'back'}
                onPress={() => { setPressingYear('back'); setTimeout(() => setPressingYear(null), 110); goBackOneYear(); }}
              />
              <YearSeal
                direction="forward"
                disabled={!canGoForward}
                pressing={pressingYear === 'forward'}
                onPress={() => { setPressingYear('forward'); setTimeout(() => setPressingYear(null), 110); goForwardOneYear(); }}
              />
            </div>
          </div>

          {/* Content — every published event the year holds, in position order */}
          {yearEvents.length > 0 ? (
            yearEvents.map((ev, i) => {
              const iso2 = ev.location ? resolveLocation(ev.location) : null;
              return (
                <div
                  key={`${ev.year}:${ev.position ?? i}`}
                  style={i > 0 ? { borderTop: `1px solid ${theme.accentGold}1F` } : undefined}
                >
                  {ev.image_url && (
                    <div style={{ position: 'relative' }}>
                      <img src={ev.image_url} alt="" style={{ display: 'block', width: '100%', aspectRatio: '16/10', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 40%, ${theme.bgCard} 100%)` }} />
                    </div>
                  )}

                  <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
                    {ev.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                        {iso2 && <FlagSealMedallion countryCode={iso2} countryName={ev.location} size="xs" earned />}
                        <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.accentSage, margin: 0 }}>
                          {ev.location}
                        </p>
                      </div>
                    )}

                    <h3 style={{ fontFamily: theme.fontHeadline, fontSize: '1.1rem', fontWeight: 600, color: theme.textHeadline, margin: '0 0 0.6rem', lineHeight: 1.3 }}>
                      {ev.headline}
                    </h3>

                    <p style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.82rem', color: theme.textBody, margin: 0, lineHeight: 1.75 }}>
                      {ev.story}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            /* An unauthored year is a designed state, not a gap. Offer the
               nearest year that has something rather than an apology. */
            <div style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
              <p style={{ fontFamily: theme.fontBody, fontSize: '0.82rem', color: theme.textMuted, margin: 0, lineHeight: 1.7 }}>
                Nothing from {currentYear} yet.
              </p>
              {nearestAuthoredYear != null && (
                <button
                  type="button"
                  onClick={() => jumpToYear(nearestAuthoredYear)}
                  style={{
                    marginTop: '0.9rem',
                    padding: '0.5rem 1.1rem',
                    minHeight: 44,
                    borderRadius: 999,
                    border: `1px solid ${theme.accentGold}55`,
                    background: theme.bgCard,
                    boxShadow: theme.shadowSoft,
                    fontFamily: theme.fontBody,
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    color: theme.textHeadline,
                    cursor: 'pointer',
                  }}
                >
                  Travel to {nearestAuthoredYear} <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
