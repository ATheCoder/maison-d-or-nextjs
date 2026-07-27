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
import DGIdentityHeader from '@/components/dailygold/DGIdentityHeader';
import DGValuesStrip from '@/components/dailygold/DGValuesStrip';
import DGGreatestMoments from '@/components/dailygold/DGGreatestMoments';
import DGWaxSealNavigator from '@/components/dailygold/DGWaxSealNavigator';
import DGInspirationBar from '@/components/dailygold/DGInspirationBar';
import FlagSealCelebration from '@/components/dailygold/FlagSealCelebration';
import FlagCollectionView from '@/components/dailygold/FlagCollectionView';
import { ThemeProvider, useTheme } from '@/components/theme/ThemeContext';

/**
 * PAGE — /daily-gold-edition
 * Daily Gold — Cinematic World Journey
 *
 * The viewed day lives in the URL, not in component state: today is the bare
 * route and every earlier day is `?date=YYYY-MM-DD`, so any day a reader turns
 * to can be linked, bookmarked, reloaded and shared. Turning a page is a
 * navigation — the server fetches that day's sections and re-renders this
 * component with them, which is why nothing below holds edition content in
 * state.
 *
 * Layout contract (navigation-redesign-spec §4/§7):
 * - ≥1024px: labelled navigation rail on the left, content offset by the
 *   shared `--dg-rail-w` variable (the rail reads the same variable, so the
 *   two can never drift apart — replaces the old hard-coded marginLeft: 80).
 * - 768–1023px: the rail collapses to icons (labels hidden), narrower var.
 * - <768px: rail hidden; sticky identity header on top, tab bar at the
 *   bottom, content padded by `--dg-tabbar-h` (includes the safe-area inset).
 */

class DGErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  componentDidCatch(error, info) { console.error('DG CRASH:', error, info); }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div role="alert" style={{ padding: 40, background: '#F5F0E7', minHeight: '100vh' }}>
        <h2 style={{ color: '#C46D46' }}>Daily Gold Error</h2>
        <pre style={{ fontSize: 12, color: '#4A3B2A', whiteSpace: 'pre-wrap' }}>
          {this.state.error?.toString()}
        </pre>
      </div>
    );
    return this.props.children;
  }
}

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
 * The shared shell stylesheet. One place owns the responsive layout system:
 * the rail-width / tab-bar-height variables, the three breakpoint tiers, the
 * section band grid, focus visibility, and reduced-motion handling.
 */
const SHELL_CSS = `
  .dg-root {
    --dg-rail-w: 224px;
    --dg-tabbar-h: 0px;
    min-height: 100vh;
    overflow-x: clip;
  }
  .dg-shell {
    padding-left: var(--dg-rail-w);
    padding-bottom: var(--dg-tabbar-h);
    min-height: 100vh;
  }

  /* Navigation rail (desktop) */
  .dg-rail {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    width: var(--dg-rail-w);
    display: flex;
    flex-direction: column;
    padding: 1.5rem 0.75rem;
    border-right: 1px solid color-mix(in srgb, var(--dg-gold) 15%, transparent);
    /* visible so the reader-switcher dropdown can extend past the rail edge */
    overflow: visible;
    z-index: 1000;
  }
  .dg-rail-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 44px;
    padding: 0.55rem 0.9rem;
    border: none;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s ease;
  }
  .dg-rail-item:hover { background: color-mix(in srgb, var(--dg-gold) 10%, transparent); }
  .dg-rail-active { background: color-mix(in srgb, var(--dg-gold) 14%, transparent); }

  /* Mobile-only chrome, hidden on desktop */
  .dg-idheader, .dg-tabbar { display: none; }

  /* The three-section band: steps 3 → 2 → 1 columns on its own */
  .dg-band {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
    gap: clamp(1rem, 2vw, 1.5rem);
    padding: clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3vw, 2rem);
    align-items: start;
    border-top: 1px solid color-mix(in srgb, var(--dg-gold) 10%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--dg-gold) 10%, transparent);
  }

  /* Compact rail: icons only */
  @media (max-width: 1023px) {
    .dg-root { --dg-rail-w: 84px; }
    .dg-rail { padding: 1.5rem 0.5rem; }
    .dg-rail-item { justify-content: center; padding: 0.55rem; }
    .dg-rail-label { display: none !important; }
  }

  /* Mobile: no rail; identity header + tab bar */
  @media (max-width: 767px) {
    .dg-root { --dg-rail-w: 0px; --dg-tabbar-h: calc(64px + env(safe-area-inset-bottom, 0px)); }
    .dg-rail { display: none; }
    .dg-idheader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      position: sticky;
      top: 0;
      z-index: 900;
      padding: 0.35rem 1rem;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .dg-tabbar {
      display: flex;
      align-items: stretch;
      justify-content: space-around;
      position: fixed;
      left: 0; right: 0; bottom: 0;
      padding: 0.25rem 0.5rem calc(0.25rem + env(safe-area-inset-bottom, 0px));
      z-index: 1000;
    }
  }

  /* Keyboard focus is visible everywhere on the page */
  .dg-root :focus-visible {
    outline: 2px solid var(--dg-gold);
    outline-offset: 2px;
    border-radius: 4px;
  }

  @keyframes dgFadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* Calm by default for those who ask for it */
  @media (prefers-reduced-motion: reduce) {
    .dg-root *, .dg-root *::before, .dg-root *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

function DailyGoldShell({ date, today, child, edition: editionRecord, dates, people, goodNews, onThisDay, greatestMoments }) {
  const { theme } = useTheme();
  const router = useRouter();

  // Every section is the server's answer for `date`, so the masthead, the
  // footer and the content can never disagree about which day this is.
  const viewedDate = date;
  const dateLabel = new Date(`${viewedDate}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // The edition is fetched on the server (SSR, via Drizzle) and passed in.
  const { edition, rawPost } = editionRecord
    ? mapRecord(editionRecord)
    : { edition: EMPTY_EDITION, rawPost: null };

  const [timeSpent, setTimeSpent] = useState(0);
  const [topicsExplored, setTopicsExplored] = useState([]);
  const [celebration, setCelebration] = useState(null);
  const [showCollection, setShowCollection] = useState(false);
  const pendingEarns = useRef(new Set());
  const startTime = useRef(null);

  useEffect(() => {
    // Track time spent
    startTime.current = Date.now();
    const interval = setInterval(() => {
      setTimeSpent(Math.round((Date.now() - startTime.current) / 60000));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Turning to another day is a navigation, not a state change: the address
  // bar leads and the server answers with that day's sections. Today keeps the
  // bare URL so the paper of the moment has one plain, permanent address; every
  // earlier day carries its date, which is the link a reader can share.
  // `scroll: false` keeps the reader at the navigator they just pressed.
  const handleDateChange = useCallback((next) => {
    if (!next || next === viewedDate) return;
    router.push(next === today ? '/daily-gold-edition' : `/daily-gold-edition?date=${next}`, { scroll: false });
  }, [router, viewedDate, today]);

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
        }).catch(() => {});
      }
    } catch (_) {}
  }, [child]);

  // One handler for the "My World" shelf, shared by every nav renderer.
  const handleShelfAction = useCallback((key) => {
    if (key === 'flags') setShowCollection(true);
  }, []);

  return (
    <div
      className="dg-root"
      style={{
        '--dg-gold': theme.accentGold,
        backgroundColor: theme.bgPrimary,
        backgroundImage: 'radial-gradient(ellipse at 15% 25%, rgba(139,115,80,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 75%, rgba(100,75,45,0.04) 0%, transparent 45%)',
        fontFamily: theme.fontBody,
        color: theme.textBody,
      }}
    >
      <style>{SHELL_CSS}</style>

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

      <DGNavigationRail child={child} onShelfAction={handleShelfAction} />
      <DGMobileTabBar child={child} onShelfAction={handleShelfAction} />

      <main
        className="dg-shell"
        key={child?.id || 'no-child'}
        style={{ animation: 'dgFadeIn 0.4s ease-out' }}
      >
        <DGIdentityHeader child={child} onShelfAction={handleShelfAction} />

        <DGHero dateStr={dateLabel} heroImageUrl={edition.images?.hero || rawPost?.image_url} />

        <DGWaxSealNavigator
          currentDate={viewedDate}
          availableDates={dates}
          onDateChange={handleDateChange}
        />

        <DGBornToday people={people} onTrack={trackInteraction} onFlagEarned={handleFlagEarn} child={child} editionDate={viewedDate} />

        <div className="dg-band">
          <DGGoodNews items={goodNews} onTrack={trackInteraction} child={child} editionDate={viewedDate} />
          <DGOnThisDay events={onThisDay} onTrack={trackInteraction} onFlagEarned={handleFlagEarn} child={child} />
          <DGGreatestMoments moments={greatestMoments} editionDate={viewedDate} />
        </div>

        <DGInspirationBar edition={edition} />

        <div style={{ padding: '0.75rem clamp(1rem, 3vw, 2rem) 0.5rem' }}>
          <DGDestination
            dest={edition.destination}
            imageUrl={rawPost?.image_url}
            onTrack={trackInteraction}
            onFlagEarned={handleFlagEarn}
            child={child}
            editionDate={viewedDate}
          />
        </div>

        <DGMoreToExplore />
        <DGValuesStrip />

        <DGForParents
          edition={edition}
          timeSpent={timeSpent}
          topicsExplored={topicsExplored}
        />

        <footer style={{
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: theme.fontHeadline, fontStyle: 'italic',
            fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)', fontWeight: 300,
            color: theme.textMuted, margin: '0 auto 1rem', maxWidth: 600, lineHeight: 1.8,
          }}>
            &ldquo;The more we learn about the world, the more we learn about ourselves.&rdquo;
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <div aria-hidden="true" style={{ height: 1, width: 60, background: `${theme.accentGold}4D` }} />
            <span style={{ fontFamily: theme.fontHeadline, fontSize: '0.85rem', color: theme.textMuted, letterSpacing: '0.1em' }}>
              Daily Gold · {dateLabel}
            </span>
            <div aria-hidden="true" style={{ height: 1, width: 60, background: `${theme.accentGold}4D` }} />
          </div>
        </footer>
      </main>
    </div>
  );
}

/**
 * `date` is the day the URL asks for and `today` the day it is; every other
 * prop is the server's content for `date`, already filtered to what a reader
 * may see.
 *
 * The reader (`child`) is resolved on the server from the session's active
 * child profile, so there is nothing to fetch and no client-side cache to keep
 * in sync: switching profiles refreshes the route and this prop changes.
 * Outside child mode it stays null and every child surface simply stays absent.
 *
 * @param {{ date?: string, today?: string, child?: any, edition?: any, dates?: string[], people?: any[], goodNews?: any[], onThisDay?: any[], greatestMoments?: any[] }} props
 */
export default function DailyGoldEdition({ date, today, child = null, edition = null, dates = [], people = [], goodNews = [], onThisDay = [], greatestMoments = [] }) {
  // Defaulted here rather than in the signature so a caller that knows neither
  // date — the design-sync preview — still renders a coherent single day.
  const todayStr = today || new Date().toISOString().slice(0, 10);

  return (
    <DGErrorBoundary>
      <ThemeProvider childId={child?.id}>
        <DailyGoldShell
          date={date || todayStr}
          today={todayStr}
          child={child}
          edition={edition}
          dates={dates}
          people={people}
          goodNews={goodNews}
          onThisDay={onThisDay}
          greatestMoments={greatestMoments}
        />
      </ThemeProvider>
    </DGErrorBoundary>
  );
}
