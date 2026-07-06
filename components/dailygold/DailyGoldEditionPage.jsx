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

const SAMPLE_EDITION = {
  editorial_opening: "Every day holds a little gold. Today, let's wander through good news, remarkable lives, hidden corners of history, and a faraway place waiting to be discovered.",
  good_news: [
    { headline: "Young Scientist Discovers New Way to Clean Ocean Plastic", story: "A 14-year-old inventor has created a simple device that can collect microplastics from seawater using only sunlight and natural materials. The invention is already being tested in three coastal communities.", mood: "innovation" },
    { headline: "Ancient Forest Reborn: Million Trees Planted in Scotland", story: "The largest reforestation project in British history has reached its milestone, bringing native woodlands back to landscapes that have been bare for centuries.", mood: "hope" },
    { headline: "Children's Book Translated into 50 Languages for Free", story: "A global initiative is making beautiful stories accessible to children everywhere, breaking down language barriers and helping young readers understand each other's worlds.", mood: "kindness" },
  ],
  born_today: [
    { name: "Marie Curie", birth_year: "1867", field: "Scientist", nationality: "Polish-French", headline: "Pioneer of radioactivity research", story: "Born Maria Skłodowska in Warsaw, she moved to Paris to study science at a time when women were rarely welcomed in laboratories. Her curiosity about invisible rays led to the discovery of radium and polonium. She became the first person to win two Nobel Prizes.", achievement: "First person to win two Nobel Prizes in different sciences", emotional_takeaway: "Curiosity and persistence can change the world." },
    { name: "Pablo Picasso", birth_year: "1881", field: "Artist", nationality: "Spanish", headline: "Artist who saw the world in new shapes", story: "As a child in Spain, Pablo could draw before he could speak. He grew up to become one of the most influential artists ever, co-founding Cubism. He believed that every child is born an artist.", achievement: "Created over 50,000 artworks and revolutionized modern art", emotional_takeaway: "There is no single right way to see the world." },
    { name: "Amelia Earhart", birth_year: "1897", field: "Explorer", nationality: "American", headline: "Pilot who flew beyond boundaries", story: "Amelia grew up climbing trees and collecting bugs, refusing to be limited by what girls were supposed to do. She became the first woman to fly solo across the Atlantic Ocean.", achievement: "First woman to fly solo across the Atlantic", emotional_takeaway: "Courage means flying toward your dreams." },
    { name: "David Attenborough", birth_year: "1926", field: "Naturalist", nationality: "British", headline: "The voice that made us fall in love with nature", story: "From a young age David was fascinated by fossils and newts. He went on to make documentaries that brought the natural world into every living room on earth, changing how we see our planet.", achievement: "Over 70 years of nature documentary filmmaking", emotional_takeaway: "Every creature on Earth has a story worth telling." },
  ],
  on_this_day: [
    { year: "1969", headline: "Humans Walk on the Moon", story: "Apollo 11 landed on the lunar surface, and Neil Armstrong became the first human to step onto another world.", significance: "First time humans set foot on another celestial body" },
    { year: "1928", headline: "Alexander Fleming Discovers Penicillin", story: "Returning from vacation, Fleming noticed that mold had killed bacteria in his petri dishes. This accidental observation led to the first antibiotic.", significance: "Discovery that launched the antibiotic revolution" },
    { year: "1963", headline: "Martin Luther King Jr. Delivers 'I Have a Dream'", story: "Speaking from the steps of the Lincoln Memorial, King shared his vision of equality and justice with over 250,000 people.", significance: "Defining moment of the Civil Rights Movement" },
  ],
  destination: {
    name: "Kyoto, Japan",
    tagline: "Where ancient traditions meet quiet beauty",
    continent: "Asia",
    capital: "Kyoto",
    language: "Japanese",
    atmosphere: "Morning mist rises over bamboo forests. Golden temples reflect in still ponds. The air carries the scent of incense and cherry blossoms. In narrow streets, wooden machiya houses stand as they have for centuries, their sliding doors hiding courtyards filled with moss and stone lanterns.",
    child_life: {
      headline: "A child in Kyoto...",
      story: "might wake to the sound of temple bells, walk past stone lanterns on the way to school, and learn calligraphy with brush and ink. After school, they might help grandparents tend a small garden. In spring, the whole city turns pink with cherry blossoms.",
    },
    taste_of_the_day: { name: "Matcha", story: "This vibrant green powder is made from shade-grown tea leaves. When whisked with hot water, it becomes a frothy, ceremonial drink. In tea ceremonies, every movement is deliberate, turning the simple act of drinking tea into meditation." },
    nature_detail: { name: "Arashiyama Bamboo Grove", story: "Thousands of bamboo stalks rise like green pillars, filtering sunlight into emerald patterns. When wind moves through the grove, it creates a sound so beautiful it has been designated one of Japan's 100 Soundscapes." },
    tiny_phrase: { word: "Komorebi", translation: "Sunlight filtering through leaves", meaning: "This word captures a moment of beauty when light meets nature — the dappled pattern on forest floors, the way leaves turn sunlight into living art." },
  },
  editorial_closing: "Today's gold is scattered across time, place, and human achievement. May you find something that makes you curious.",
};

// Synchronously restore child from sessionStorage to avoid flash/redirect on back-navigation
function getSessionChild() {
  try {
    const cached = sessionStorage.getItem('dg_active_child_obj');
    if (cached) return JSON.parse(cached);
  } catch (_) {}
  return null;
}

// Map a raw edition record (snake_case, as returned by the Drizzle-backed
// server actions) into the view-model the child components consume.
function mapRecord(record) {
  const edition = {
    id: record.id,
    date: record.edition_date,
    destination_name: record.destination_country,
    born_today: record.born_today || [],
    good_news: record.good_news || [],
    on_this_day: record.on_this_day || [],
    greatest_moments: record.greatest_moments || [],
    destination: {
      name: record.destination_country,
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
    },
    images: {
      destination: record.destination_image_url || null,
      hero: record.hero_image_url || null,
    },
    generated_at: record.generated_at,
  };
  return { edition, rawPost: { image_url: record.destination_image_url, id: record.id } };
}

/**
 * @param {{ initialEdition?: any, initialDates?: string[] }} props
 */
export default function DailyGoldEdition({ initialEdition = null, initialDates = [] }) {
  const router = useRouter();
  const todayStr = new Date().toISOString().slice(0, 10);
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  console.log(initialEdition)

  // The edition is fetched on the server (SSR, via Drizzle) and passed in.
  const initial = initialEdition ? mapRecord(initialEdition) : { edition: SAMPLE_EDITION, rawPost: null };

  const [edition, setEdition] = useState(initial.edition);
  const [rawPost, setRawPost] = useState(initial.rawPost);
  const [user, setUser] = useState(null);
  const [child, setChild] = useState(null);
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

  // The edition is already provided by the server; only the (optional) child
  // profile still loads on the client.
  useEffect(() => {
    const childId = '69fc48b9acd4bfd93fc44220';

    // Restore cached child synchronously to avoid flash on back-navigation
    const cachedChild = getSessionChild();
    if (cachedChild) setChild(cachedChild);

    base44.entities.Child
      .filter({ id: childId }, '-created_date', 1)
      .then(kids => kids[0] || null)
      .then(fetchedChild => {
        if (fetchedChild) {
          setChild(fetchedChild);
          sessionStorage.setItem('dg_active_child_obj', JSON.stringify(fetchedChild));
        } else if (!cachedChild) {
          // No child available — clear stale cache and continue with null child
          sessionStorage.removeItem('dg_active_child_id');
          sessionStorage.removeItem('dg_active_child_obj');
        }
      })
      .catch(() => {});

    // Track time spent
    const interval = setInterval(() => {
      setTimeSpent(Math.round((Date.now() - startTime.current) / 60000));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleEditionChange = (record) => {
    const { edition: mapped, rawPost: rp } = mapRecord(record);
    setEdition(mapped);
    setRawPost(rp);
    setViewedDate(record.edition_date);
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

        <DGBornToday people={edition.born_today || []} editionId={edition.id || rawPost?.id} onTrack={trackInteraction} onFlagEarned={handleFlagEarn} child={child} editionDate={viewedDate} />

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
          <DGGoodNews items={edition.good_news || []} onTrack={trackInteraction} child={child} editionDate={viewedDate} />
          <DGOnThisDay events={edition.on_this_day || []} editionId={edition.id || null} onTrack={trackInteraction} onFlagEarned={handleFlagEarn} child={child} editionDate={viewedDate} />
          <DGGreatestMoments moments={edition.greatest_moments || []} editionDate={viewedDate} />
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