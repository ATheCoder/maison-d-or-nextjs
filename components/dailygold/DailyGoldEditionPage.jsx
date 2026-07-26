'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { base44 } from '@/api/base44Client';
import DGHero from '@/components/dailygold/DGHero';
import DGBornToday from '@/components/dailygold/DGBornToday';
import DGGoodNews from '@/components/dailygold/DGGoodNews';
import DGOnThisDay from '@/components/dailygold/DGOnThisDay';
import DGDestination from '@/components/dailygold/DGDestination';
import DGMoreToExplore from '@/components/dailygold/DGMoreToExplore';
import DGForParents from '@/components/dailygold/DGForParents';
import DGNavigationRail from '@/components/dailygold/DGNavigationRail';
import DGMobileTabBar from '@/components/dailygold/DGMobileTabBar';
import DGValuesStrip from '@/components/dailygold/DGValuesStrip';
import DGGreatestMoments from '@/components/dailygold/DGGreatestMoments';
import DGWaxSealNavigator from '@/components/dailygold/DGWaxSealNavigator';
import DGInspirationBar from '@/components/dailygold/DGInspirationBar';
import FlagSealCelebration from '@/components/dailygold/FlagSealCelebration';
import FlagCollectionView from '@/components/dailygold/FlagCollectionView';
import ChildGreetingStrip from '@/components/dailygold/ChildGreetingStrip';
import { ThemeProvider } from '@/components/theme/ThemeContext';
import { getPeopleForDate, getGoodNewsForDate, getOnThisDayForDate, getGreatestMomentsForDate } from '@/app/daily-gold-edition/actions';

/**
 * PAGE — /daily-gold-edition
 * Daily Gold — Cinematic World Journey
 */

class DGErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  componentDidCatch(error, info) { console.error('DG CRASH:', error, info); }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, background: '#F5F0E7', minHeight: '100vh' }}>
        <h2 style={{ color: '#C46D46' }}>Daily Gold Error</h2>
        <pre style={{ fontSize: 12, color: '#4A3B2A', whiteSpace: 'pre-wrap' }}>
          {this.state.error?.toString()}
        </pre>
      </div>
    );
    return this.props.children;
  }
}

const C = {
  midnight: '#0F1B2E',
  navy: '#162544',
  gold: '#C8A96B',
  sand: '#EADCC2',
  ivory: '#F5F0E7',
};

// Today has no edition row. An explicit absent state — never another day's
// content, and never sample content dressed up as today's.
const EMPTY_EDITION = {
  id: null,
  date: null,
  destination_name: null,
  destination: null,
  images: {},
  generated_at: null,
};

// Map a raw edition record (snake_case, as returned by the Drizzle-backed
// server actions) into the view-model the child components consume.
function mapRecord(record) {
  // An edition row can exist with nothing authored in it yet. Only build a
  // destination when there is something to show, so the section can be absent
  // rather than rendering a shell of em-dashes.
  const hasDestination = !!(
    record.destination_country || record.destination_description || record.destination_image_url ||
    record.taste_of_day || record.sound_of_day || record.nature_detail || record.tiny_phrase ||
    record.continent || record.child_life
  );
  const edition = {
    id: record.id,
    date: record.edition_date,
    destination_name: record.destination_country,
    daily_quote: record.daily_quote,
    daily_quote_author: record.daily_quote_author,
    destination: hasDestination ? {
      name: record.destination_country,
      continent: record.continent,
      atmosphere: record.destination_description,
      image_url: record.destination_image_url || null,
      taste_of_day: record.taste_of_day ? { name: record.taste_of_day } : null,
      sound_of_day: record.sound_of_day ? { name: record.sound_of_day } : null,
      nature_detail: record.nature_detail ? { name: record.nature_detail } : null,
      tiny_phrase: record.tiny_phrase ? {
        word: record.tiny_phrase,
        translation: record.tiny_phrase_translation,
        language: record.tiny_phrase_language || null,
      } : null,
      child_life: record.child_life || null,
    } : null,
    images: {
      destination: record.destination_image_url || null,
      hero: record.hero_image_url || null,
    },
    generated_at: record.generated_at,
  };
  return { edition, rawPost: { image_url: record.destination_image_url, id: record.id } };
}

/**
 * @param {{ initialChild?: any, initialEdition?: any, initialDates?: string[], initialPeople?: any[], initialGoodNews?: any[], initialOnThisDay?: any[], initialGreatestMoments?: any[] }} props
 */
export default function DailyGoldEdition({ initialChild = null, initialEdition = null, initialDates = [], initialPeople = [], initialGoodNews = [], initialOnThisDay = [], initialGreatestMoments = [] }) {
  const router = useRouter();
  const todayStr = new Date().toISOString().slice(0, 10);
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // The edition is fetched on the server (SSR, via Drizzle) and passed in.
  const initial = initialEdition ? mapRecord(initialEdition) : { edition: EMPTY_EDITION, rawPost: null };

  const [edition, setEdition] = useState(initial.edition);
  const [people, setPeople] = useState(initialPeople);
  const [goodNews, setGoodNews] = useState(initialGoodNews);
  const [onThisDay, setOnThisDay] = useState(initialOnThisDay);
  const [greatestMoments, setGreatestMoments] = useState(initialGreatestMoments);
  const [rawPost, setRawPost] = useState(initial.rawPost);
  const [user, setUser] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [topicsExplored, setTopicsExplored] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [showCollection, setShowCollection] = useState(false);
  const pendingEarns = useRef(new Set());
  const startTime = useRef(Date.now());

  const [viewedDate, setViewedDate] = useState(initialEdition?.edition_date || todayStr);

  // SSR provides the edition up-front, so there is no client-side loading gate.
  const loading = false;
  const generating = false;

  // The reader is resolved on the server from the session's active child
  // profile, so there is nothing to fetch and no client-side cache to keep in
  // sync: switching profiles refreshes the route and this prop changes.
  // Outside child mode it stays null and every child surface below is absent.
  const child = initialChild;

  useEffect(() => {
    // Track time spent
    const interval = setInterval(() => {
      setTimeSpent(Math.round((Date.now() - startTime.current) / 60000));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // The navigator can land on a day that has no edition row of its own — one
  // listed only for its Golden Stories — so `date` is the authority and
  // `record` is whatever exists for it, possibly nothing.
  const handleEditionChange = (record, date) => {
    const viewed = date || record?.edition_date;
    if (!viewed) return;
    const { edition: mapped, rawPost: rp } = record
      ? mapRecord(record)
      : { edition: EMPTY_EDITION, rawPost: null };
    setEdition(mapped);
    setRawPost(rp);
    setViewedDate(viewed);
    // Born Today is keyed by the viewed date's month-day, not the edition row.
    getPeopleForDate(viewed)
      .then(setPeople)
      .catch(() => setPeople([]));
    // Good News lives in its own table, keyed by the exact date.
    getGoodNewsForDate(viewed)
      .then(setGoodNews)
      .catch(() => setGoodNews([]));
    // On This Day lives in its own table, keyed by the month-day.
    getOnThisDayForDate(viewed)
      .then(setOnThisDay)
      .catch(() => setOnThisDay([]));
    // Greatest Moments too — its own table, keyed by the month-day.
    getGreatestMomentsForDate(viewed)
      .then(setGreatestMoments)
      .catch(() => setGreatestMoments([]));
  };

  const handleFlagEarn = useCallback(async (countryName, countryCode, source) => {
    if (!child?.id || !countryCode) return;
    const key = `${child.id}-${countryCode}`;
    if (pendingEarns.current.has(key)) return;
    pendingEarns.current.add(key);

    try {
      const res = await base44.functions.invoke('earnFlagSeal', {
        child_id: child.id,
        country_name: countryName,
        country_code: countryCode,
        source,
        edition_date: viewedDate,
      });
      if (res?.data?.status === 'new_seal') {
        setCelebration({ countryName, countryCode, type: 'new' });
      } else if (res?.data?.status === 'already_earned') {
        setCelebration({ countryName, countryCode, type: 'repeat' });
      }
    } catch (_) {
      pendingEarns.current.delete(key);
    }
  }, [child, viewedDate]);

  const trackInteraction = useCallback(async (contentType, contentId) => {
    try {
      const topicMap = { person: 'People', news: 'Good News', history: 'History', geography: 'Geography' };
      const topic = topicMap[contentType] || contentType;
      setTopicsExplored(prev => prev.includes(topic) ? prev : [...prev, topic]);

      if (child) {
        await base44.entities.AnalyticsEvent.create({
          child_id: child?.id || null,
          event_type: 'daily_gold_interaction',
          content_type: contentType,
          content_id: contentId,
          timestamp: new Date().toISOString(),
          parent_email: user?.email || null,
        }).catch(() => {});
      }
    } catch (_) {}
  }, [user, child]);

  return (
    <DGErrorBoundary>
    <ThemeProvider childId={child?.id}>
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F0E7',
      backgroundImage: 'radial-gradient(ellipse at 15% 25%, rgba(139,115,80,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 75%, rgba(100,75,45,0.04) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(160,130,90,0.03) 0%, transparent 60%)',
      fontFamily: 'Lato, sans-serif',
      overflowX: 'hidden',
    }}>
      <>
        <style>{`
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { display: none; }
          @keyframes dgStarSpin { to { transform: rotate(360deg); } }
          @keyframes dgDotPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.85); } }
          @keyframes dgFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes mdo-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.96); } }
        `}</style>

        {/* Full-screen loading screen — covers everything including nav rail */}
        {loading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#F5F0E7',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2rem',
        }}>
          {/* Maison d'Oré gold sun ornament */}
          <div style={{ animation: 'dgStarSpin 8s linear infinite' }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="8" stroke="#C9A96E" strokeWidth="1.5"/>
              <circle cx="32" cy="32" r="4" fill="#C9A96E"/>
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const x1 = 32 + 12 * Math.cos(rad);
                const y1 = 32 + 12 * Math.sin(rad);
                const x2 = 32 + 16 * Math.cos(rad);
                const y2 = 32 + 16 * Math.sin(rad);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round"/>;
              })}
            </svg>
          </div>
          {/* Text */}
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'Playfair Display, serif',
              fontStyle: 'italic',
              fontSize: '1.1rem',
              fontWeight: 400,
              color: '#5C4A2A',
              margin: '0 0 0.5rem',
            }}>
              Preparing today's edition
            </p>
          </div>
          {/* Three pulsing gold dots */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <div key={i} style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#C9A96E',
                animation: `dgDotPulse 1.6s ${d}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Main content — fades in smoothly when ready */}
      {!loading && (
        <div style={{
          animation: 'dgFadeIn 0.4s ease-out',
        }}>
          {celebration && (
            <FlagSealCelebration
              countryCode={celebration.countryCode}
              countryName={celebration.countryName}
              type={celebration.type}
              onDone={() => setCelebration(null)}
            />
          )}

          {showCollection && (
            <FlagCollectionView
              childId={child?.id}
              onClose={() => setShowCollection(false)}
            />
          )}

          <DGNavigationRail />
          <DGMobileTabBar />

          {generating && (
            <div style={{
              position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
              zIndex: 500,
              background: `rgba(22,37,68,0.95)`,
              backdropFilter: 'blur(12px)',
              border: `1px solid rgba(212,175,55,0.3)`,
              borderRadius: 30,
              padding: '0.75rem 1.5rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, animation: `mdo-pulse 1.2s ${d}s ease-in-out infinite` }} />
              ))}
              <span style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.72rem', color: C.sand }}>
                Aurora is preparing today's edition…
              </span>
            </div>
          )}

          <div
            key={child?.id || 'no-child'}
            style={{
              marginLeft: 80,
              minHeight: '100vh',
              background: 'transparent',
            }}
          >
            <DGHero dateStr={dateLabel} heroImageUrl={edition.images?.hero || rawPost?.image_url} />

        {child?.id && (
          <ChildGreetingStrip
            child={child}
            onShowFlags={() => setShowCollection(true)}
            navigate={(path) => router.push(path)}
          />
        )}

        <DGWaxSealNavigator
          currentDate={viewedDate}
          initialDates={initialDates}
          onEditionChange={handleEditionChange}
        />

        <DGBornToday people={people} onTrack={trackInteraction} onFlagEarned={handleFlagEarn} child={child} editionDate={viewedDate} />

        <div className="dg-three-col" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.25rem',
          padding: '1.5rem clamp(1rem, 3vw, 2rem)',
          boxSizing: 'border-box',
          background: 'transparent',
          borderTop: '1px solid rgba(201,169,110,0.10)',
          borderBottom: '1px solid rgba(201,169,110,0.10)',
          alignItems: 'start',
        }}>
          <DGGoodNews items={goodNews} onTrack={trackInteraction} child={child} editionDate={viewedDate} />
          <DGOnThisDay events={onThisDay} onTrack={trackInteraction} onFlagEarned={handleFlagEarn} child={child} />
          <DGGreatestMoments moments={greatestMoments} editionDate={viewedDate} />
        </div>

        <style>{`
          @media (max-width: 768px) {
            .dg-three-col { grid-template-columns: 1fr !important; padding: 1rem !important; gap: 1.25rem !important; }
          }
        `}</style>

        <DGInspirationBar edition={edition} />

        <div style={{ padding: '0.75rem clamp(1rem, 3vw, 2rem) 0.5rem' }}>
          <DGDestination
            dest={edition.destination}
            imageUrl={rawPost?.image_url}
            onTrack={trackInteraction}
            onDestinationClick={() => setSelectedDestination(edition.destination)}
            onFlagEarned={handleFlagEarn}
            child={child}
            editionDate={viewedDate}
          />
        </div>

        {selectedDestination && (
          <div
            onClick={() => setSelectedDestination(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(10,20,40,0.92)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '2rem',
              overflowY: 'auto',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: 720, width: '100%',
                background: C.navy,
                borderRadius: 24,
                border: `1px solid rgba(212,175,55,0.25)`,
                overflow: 'hidden',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ position: 'relative', height: 280, background: C.midnight }}>
                {selectedDestination.image_url ? (
                  <img src={selectedDestination.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    background: `linear-gradient(135deg, ${C.navy} 0%, ${C.midnight} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(201,169,110,0.2)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${C.navy} 100%)` }} />
                <button
                  onClick={() => setSelectedDestination(null)}
                  style={{
                    position: 'absolute', top: 16, right: 16,
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', border: `1px solid ${C.gold}40`,
                    color: C.gold, fontSize: '1rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
              <div style={{ padding: '2rem 2rem 2.5rem' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 700, color: C.ivory, margin: '0 0 1.5rem', lineHeight: 1.2 }}>
                  A Child in {selectedDestination.name?.split(',')[0]}
                </h2>
                {selectedDestination.atmosphere && (
                  <p style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: '1.05rem', color: `${C.sand}90`, lineHeight: 1.9, margin: '0 0 1rem' }}>
                    {selectedDestination.atmosphere}
                  </p>
                )}
                {selectedDestination.child_life?.story && (
                  <div style={{ fontFamily: 'Lato, sans-serif', fontWeight: 300, fontSize: '0.95rem', color: `${C.ivory}80`, lineHeight: 1.9 }}>
                    {selectedDestination.child_life.story.split('\n\n').map((para, i) => (
                      <p key={i} style={{ margin: '0 0 1rem' }}>{para}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DGMoreToExplore />
        <DGValuesStrip />

        <DGForParents
          child={child}
          edition={edition}
          timeSpent={timeSpent}
          topicsExplored={topicsExplored}
        />

        <div style={{
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)',
          background: 'transparent',
          textAlign: 'center',
          marginBottom: 70,
        }}>
          <p style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)', fontWeight: 300, color: '#8B7355', margin: '0 auto 1rem', maxWidth: 600, lineHeight: 1.8 }}>
            "The more we learn about the world, the more we learn about ourselves."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <div style={{ height: 1, width: 60, background: `rgba(201,169,110,0.3)` }} />
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.85rem', color: 'rgba(139,115,85,0.6)', letterSpacing: '0.1em' }}>
              Daily Gold · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <div style={{ height: 1, width: 60, background: `rgba(201,169,110,0.3)` }} />
          </div>
        </div>
      </div>
      </div>
      )}
      </>
    </div>
    </ThemeProvider>
    </DGErrorBoundary>
  );
}