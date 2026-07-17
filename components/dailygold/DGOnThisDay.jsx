'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/components/theme/ThemeContext';
import { saveEnrichedEvent } from '@/app/daily-gold-edition/actions';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';

// Location string → ISO2 (best-effort for On This Day locations)
const LOC_TO_ISO2 = {
  'France': 'FR', 'Paris': 'FR', 'Germany': 'DE', 'Berlin': 'DE',
  'United Kingdom': 'GB', 'England': 'GB', 'London': 'GB', 'Britain': 'GB',
  'United States': 'US', 'USA': 'US', 'America': 'US', 'Washington': 'US', 'New York': 'US',
  'Russia': 'RU', 'Soviet Union': 'RU', 'Moscow': 'RU', 'Italy': 'IT', 'Rome': 'IT',
  'Spain': 'ES', 'Madrid': 'ES', 'Japan': 'JP', 'Tokyo': 'JP', 'China': 'CN', 'Beijing': 'CN',
  'India': 'IN', 'Australia': 'AU', 'Canada': 'CA', 'Brazil': 'BR', 'Mexico': 'MX',
  'Portugal': 'PT', 'Lisbon': 'PT', 'Greece': 'GR', 'Athens': 'GR',
  'Netherlands': 'NL', 'Amsterdam': 'NL', 'Poland': 'PL', 'Warsaw': 'PL',
  'Egypt': 'EG', 'Cairo': 'EG', 'Turkey': 'TR', 'Istanbul': 'TR',
  'South Africa': 'ZA', 'Kenya': 'KE', 'Nigeria': 'NG', 'Ethiopia': 'ET',
  'Argentina': 'AR', 'Chile': 'CL', 'Colombia': 'CO', 'Peru': 'PE',
  'Ireland': 'IE', 'Dublin': 'IE', 'Scotland': 'GB', 'Sweden': 'SE', 'Stockholm': 'SE',
  'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI', 'Switzerland': 'CH',
  'Austria': 'AT', 'Vienna': 'AT', 'Hungary': 'HU', 'Romania': 'RO',
  'Ukraine': 'UA', 'Kyiv': 'UA', 'Czech Republic': 'CZ', 'Czechoslovakia': 'CZ',
  'Israel': 'IL', 'Jerusalem': 'IL', 'Saudi Arabia': 'SA', 'Iran': 'IR', 'Iraq': 'IQ',
  'Pakistan': 'PK', 'Bangladesh': 'BD', 'Indonesia': 'ID', 'Malaysia': 'MY',
  'South Korea': 'KR', 'North Korea': 'KP', 'Vietnam': 'VN', 'Thailand': 'TH',
};

function getLocationIso2(location) {
  if (!location) return null;
  for (const [k, v] of Object.entries(LOC_TO_ISO2)) {
    if (location.includes(k)) return v;
  }
  return null;
}

// Small vintage wax seal for year navigation inside On This Day
function YearSeal({ direction, disabled, onPress, pressing }) {
  const cream = '#FAF7F2';
  const linen = '#EDE0CC';
  const gold = disabled ? 'rgba(201,169,110,0.3)' : 'rgba(201,169,110,0.92)';
  const goldMid = disabled ? 'rgba(201,169,110,0.2)' : 'rgba(201,169,110,0.55)';
  const goldFaint = disabled ? 'rgba(201,169,110,0.12)' : 'rgba(201,169,110,0.3)';
  const isBack = direction === 'back';

  return (
    <button
      onClick={disabled ? undefined : onPress}
      style={{
        width: 40, height: 40, borderRadius: '50%',
        background: disabled
          ? 'radial-gradient(circle at 35% 30%, #F0EAE0 0%, #E0D8CC 60%, #D4CBBC 100%)'
          : `radial-gradient(circle at 35% 30%, ${cream} 0%, ${linen} 55%, #D8CCBA 100%)`,
        border: `2px solid ${disabled ? 'rgba(201,169,110,0.2)' : 'rgba(201,169,110,0.65)'}`,
        boxShadow: disabled ? 'none'
          : pressing
            ? '0 1px 3px rgba(100,80,40,0.2), inset 0 2px 4px rgba(0,0,0,0.1)'
            : '0 2px 8px rgba(100,80,40,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: pressing ? 'scale(0.87)' : 'scale(1)',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Inner emboss ring */}
      <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', border: `1px solid rgba(201,169,110,${disabled ? '0.1' : '0.35'})`, pointerEvents: 'none' }} />
      {/* Arrow SVG */}
      <svg viewBox="0 0 40 40" width="26" height="26" style={{ display: 'block' }}>
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

export default function DGOnThisDay({ events = [], editionId, editionDate, onTrack, onFlagEarned }) {
  const { theme } = useTheme();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [pressingYear, setPressingYear] = useState(null); // 'back' | 'forward' | null
  const [loading, setLoading] = useState(false);
  const [enrichedEvents, setEnrichedEvents] = useState({});
  const [researchedEvents, setResearchedEvents] = useState({});

  // Events from the on_this_day_event table, keyed by year. Already-enriched
  // years render straight from here with no Base44 roundtrip; un-enriched
  // stubs still go through enrichHistoricalEvent below.
  const byYear = useMemo(() => {
    const m = {};
    for (const ev of events) {
      if (ev?.maison_rewrite_done && ev.headline && ev.story && m[ev.year] == null) m[ev.year] = ev;
    }
    return m;
  }, [events]);

  // Reset year and cache whenever the edition changes (new calendar day selected)
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    setEnrichedEvents({});
    setResearchedEvents({});
  }, [editionId]);

  // Indefinite time travel — child can go back as far as they want
  const MIN_YEAR = 1;
  const MAX_YEAR = new Date().getFullYear();

  // Handle year navigation
  const goBackOneYear = useCallback(() => {
    if (currentYear > MIN_YEAR) {
      const newYear = currentYear - 1;
      setCurrentYear(newYear);
      onTrack?.('history', String(newYear));
    }
  }, [currentYear, onTrack]);

  const goForwardOneYear = useCallback(() => {
    if (currentYear < MAX_YEAR) {
      const newYear = currentYear + 1;
      setCurrentYear(newYear);
      onTrack?.('history', String(newYear));
    }
  }, [currentYear, onTrack]);

  // Research/enrich event on first view (lazy loading)
  const researchEvent = useCallback(async (year) => {
    if (!year || !editionId || byYear[year] || enrichedEvents[year] || researchedEvents[year]) return;

    setLoading(true);
    try {
      const res = await base44.functions.invoke('enrichHistoricalEvent', {
        edition_id: editionId,
        year: year,
      });

      if (res.data && res.data.headline) {
        setEnrichedEvents(prev => ({
          ...prev,
          [year]: {
            headline: res.data.headline,
            story: res.data.story,
            image_url: res.data.image_url,
            location: res.data.location,
          }
        }));
        if (res.data.was_researched) {
          setResearchedEvents(prev => ({ ...prev, [year]: true }));
        }
        // Write-through: persist the enrichment in our own table so it isn't
        // stranded in Base44 (the server rescues the image to R2).
        if (editionDate) {
          saveEnrichedEvent(editionDate, year, {
            headline: res.data.headline,
            story: res.data.story,
            location: res.data.location,
            image_url: res.data.image_url,
            researched: !!res.data.was_researched,
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn(`Failed to research year ${year}:`, err.message);
    } finally {
      setLoading(false);
    }
  }, [editionId, editionDate, byYear, enrichedEvents, researchedEvents]);

  // Research current year when it changes
  useEffect(() => {
    if (currentYear && !byYear[currentYear] && !enrichedEvents[currentYear]) {
      researchEvent(currentYear);
    }
  }, [currentYear, byYear, enrichedEvents, researchEvent]);

  // Trigger flag earn when enriched event loads with a location
  const earnedYears = useRef(new Set());
  useEffect(() => {
    const data = byYear[currentYear] || enrichedEvents[currentYear];
    if (!data?.location || earnedYears.current.has(currentYear)) return;
    const iso2 = getLocationIso2(data.location);
    if (iso2) {
      earnedYears.current.add(currentYear);
      onFlagEarned?.(data.location, iso2, 'on_this_day');
    }
  }, [byYear, enrichedEvents, currentYear]);

  // Get enriched data for current year
  const enrichedData = byYear[currentYear] || enrichedEvents[currentYear] || {};
  const displayHeadline = enrichedData.headline;
  const displayStory = enrichedData.story;
  const displayImage = enrichedData.image_url;
  const displayLocation = enrichedData.location;
  const wasJustResearched = researchedEvents[currentYear];

  return (
    <section style={{ background: 'transparent', borderRadius: 0, overflow: 'visible' }}>
      <div style={{ padding: '0' }}>
        {/* Header — fixed height, matches sibling columns exactly */}
        <div style={{ marginBottom: '0.85rem' }}>
          <p style={{ fontFamily: theme.fontBody, fontSize: '0.55rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 0.35rem' }}>
            Travel through time
          </p>
          <h2 style={{ fontFamily: theme.fontHeadline, fontSize: '1.4rem', fontWeight: 600, color: theme.textHeadline, margin: 0, lineHeight: 1.15 }}>
            On This Day
          </h2>
        </div>

        {/* Card — year nav INSIDE, below the year heading */}
        <div style={{
          background: 'rgba(255,248,238,0.7)',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(180,140,80,0.10)',
        }}>
          {/* Year display + arrows — all inside the card */}
          <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: `1px solid rgba(201,169,110,0.12)` }}>
            <p style={{ fontFamily: theme.fontHeadline, fontSize: '1.6rem', fontWeight: 600, color: theme.textHeadline, margin: '0 0 0.1rem', lineHeight: 1, textAlign: 'center' }}>
              {currentYear}
            </p>
            <p style={{ fontFamily: theme.fontBody, fontSize: '0.6rem', color: `${theme.accentGold}70`, margin: '0 0 0.75rem', textAlign: 'center' }}>
              {currentYear === MAX_YEAR ? 'Most recent year' : `${MAX_YEAR - currentYear} years ago`}
            </p>
            {/* Arrows below the year */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <YearSeal
                direction="back"
                disabled={currentYear <= MIN_YEAR}
                pressing={pressingYear === 'back'}
                onPress={() => { setPressingYear('back'); setTimeout(() => setPressingYear(null), 110); goBackOneYear(); }}
              />
              <YearSeal
                direction="forward"
                disabled={currentYear >= MAX_YEAR}
                pressing={pressingYear === 'forward'}
                onPress={() => { setPressingYear('forward'); setTimeout(() => setPressingYear(null), 110); goForwardOneYear(); }}
              />
            </div>
          </div>

          {/* Content */}
          {loading && !displayHeadline ? (
            <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: `3px solid ${theme.accentGold}40`,
                borderTopColor: theme.accentGold,
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem',
              }} />
              <p style={{ fontFamily: theme.fontBody, fontSize: '0.82rem', color: theme.textBody, margin: 0 }}>
                Researching {currentYear}…
              </p>
            </div>
          ) : displayHeadline && displayStory ? (
            <>
              {/* Image */}
              {displayImage && (
                <div style={{ height: 140, position: 'relative', background: `url('${displayImage}') center/cover` }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(255,248,238,0.95) 100%)' }} />
                </div>
              )}

              {/* Story */}
              <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
                {displayLocation && (() => {
                  const iso2 = getLocationIso2(displayLocation);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                      {iso2 && <FlagSealMedallion countryCode={iso2} countryName={displayLocation} size="xs" earned />}
                      <p style={{ fontFamily: theme.fontBody, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.accentSage, margin: 0 }}>
                        {displayLocation}
                      </p>
                    </div>
                  );
                })()}

                <h3 style={{ fontFamily: theme.fontHeadline, fontSize: '1.1rem', fontWeight: 600, color: theme.textHeadline, margin: '0 0 0.6rem', lineHeight: 1.3 }}>
                  {displayHeadline}
                </h3>

                <p style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.82rem', color: theme.textBody, margin: 0, lineHeight: 1.75 }}>
                  {displayStory}
                </p>
              </div>
            </>
          ) : (
            <div style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
              <p style={{ fontFamily: theme.fontBody, fontSize: '0.82rem', color: theme.textMuted, margin: 0 }}>
                No record found for {currentYear} — try another year.
              </p>
            </div>
          )}
        </div>


      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}