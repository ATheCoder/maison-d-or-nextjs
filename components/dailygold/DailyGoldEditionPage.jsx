'use client';
import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DGHero from '@/components/dailygold/DGHero';
import DGBornToday from '@/components/dailygold/DGBornToday';
import DGGoodNews from '@/components/dailygold/DGGoodNews';
import DGOnThisDay from '@/components/dailygold/DGOnThisDay';
import DGDestination from '@/components/dailygold/DGDestination';
import DGMoreToExplore from '@/components/dailygold/DGMoreToExplore';
import DGForParents from '@/components/dailygold/DGForParents';
import DGValuesStrip from '@/components/dailygold/DGValuesStrip';
import DGGreatestMoments from '@/components/dailygold/DGGreatestMoments';
import DGWaxSealNavigator from '@/components/dailygold/DGWaxSealNavigator';
import DGInspirationBar from '@/components/dailygold/DGInspirationBar';
import FlagSealCelebration from '@/components/dailygold/FlagSealCelebration';
import { useFlagEarn } from '@/components/dailygold/useFlagEarn';
import { TrackedSection } from '@/components/dailygold/instrumentation/TrackedSection';
import { SignupInviteProvider } from '@/components/dailygold/SignupInvite';
import { SignedOutCta, WelcomeFlourish } from '@/components/dailygold/DGVisitorBanners';
import { useTheme } from '@/components/theme/ThemeContext';

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
 * This file is only the day itself. The chrome around it — theme,
 * instrumentation, the rail, the tab bar, the identity header and the shell
 * padding — lives in DailyGoldEditionChrome, mounted by the route's layout, so
 * that turning to another day rebuilds only what is below. The layout contract
 * (navigation-redesign-spec §4/§7) is documented there and in NAV_SHELL_CSS.
 */

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
 * The day's own stylesheet. The navigation layout system it sits inside
 * (NAV_SHELL_CSS) belongs to the chrome and is emitted once by the layout —
 * only what is specific to the reading column lives here.
 */
const PAGE_CSS = `
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
`;

function DailyGoldDay({ date, today, edition: editionRecord, dates, people, goodNews, onThisDay, greatestMoments, savedKeys, exploration, signedOut, welcomeName }) {
  const { theme } = useTheme();
  const router = useRouter();

  // The whole page's saved state, answered once by the server. Sections look up
  // `type:id` in it instead of each heart asking after itself. `null` — not an
  // empty set — outside child mode, and a section with no set renders no hearts
  // at all: an absent heart is honest where a heart that can't save is not.
  //
  // The signed-out visitor is the one exception, and for the same reason: for
  // them an absent heart is *not* honest, because there is something to offer
  // (an account). They get an empty set, so every heart renders unfilled, and
  // TreasuryHeart turns the tap into an invitation rather than a save
  // (SignupInvite). A signed-in grown-up outside child mode still gets null —
  // they already have an account, so there is nothing to invite them to.
  const savedSet = useMemo(
    () => (savedKeys ? new Set(savedKeys) : signedOut ? new Set() : null),
    [savedKeys, signedOut],
  );

  // Every section is the server's answer for `date`, so the masthead, the
  // footer and the content can never disagree about which day this is.
  const viewedDate = date;
  const dateLabel = new Date(`${viewedDate}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // The edition is fetched on the server (SSR, via Drizzle) and passed in.
  const { edition, rawPost } = editionRecord
    ? mapRecord(editionRecord)
    : { edition: EMPTY_EDITION, rawPost: null };

  // Earns resolve the child from the session inside the server action — the
  // client never names one. The hook dedupes by country for this page session
  // and queues celebrations so rapid earns play in order instead of
  // overwriting each other.
  const { earn, celebration, dismissCelebration } = useFlagEarn({ editionDate: viewedDate });

  // Turning to another day is a navigation, not a state change: the address
  // bar leads and the server answers with that day's sections. Today keeps the
  // bare URL so the paper of the moment has one plain, permanent address; every
  // earlier day carries its date, which is the link a reader can share.
  // `scroll: false` keeps the reader at the navigator they just pressed.
  const handleDateChange = useCallback((next) => {
    if (!next || next === viewedDate) return;
    router.push(next === today ? '/daily-gold-edition' : `/daily-gold-edition?date=${next}`, { scroll: false });
  }, [router, viewedDate, today]);

  return (
    // The day's content, inside the <main> the chrome provides. The fade is
    // here rather than on <main> so it plays on each day the reader turns to,
    // not once when the chrome first mounts.
    <div style={{ animation: 'dgFadeIn 0.4s ease-out' }}>
      <style>{PAGE_CSS}</style>

      {/* Who is holding the paper, not what is in it — so both sit above the
          masthead and outside every tracked region. */}
      {welcomeName && <WelcomeFlourish name={welcomeName} />}
      {signedOut && <SignedOutCta />}

      {celebration && (
        <FlagSealCelebration
          key={celebration.id}
          countryCode={celebration.countryCode}
          countryName={celebration.countryName}
          type={celebration.type}
          onDone={dismissCelebration}
        />
      )}

      <TrackedSection id="hero">
        <DGHero dateStr={dateLabel} heroImageUrl={edition.images?.hero || rawPost?.image_url} />
      </TrackedSection>

      {/* The day navigator is chrome, not reading: it stays outside the tracked
          regions so a child hunting for yesterday's paper doesn't bank dwell
          against whatever section they happen to be over. */}
      <DGWaxSealNavigator
        currentDate={viewedDate}
        availableDates={dates}
        onDateChange={handleDateChange}
      />

      <TrackedSection id="born_today">
        <DGBornToday people={people} savedSet={savedSet} editionDate={viewedDate} />
      </TrackedSection>

      {/* Each wrapper below becomes the grid item `.dg-band` lays out — which
          is why Good News is rendered conditionally rather than left to
          return null from the inside: an empty wrapper is still an item, and
          auto-fit would hold a third column open for it. */}
      <div className="dg-band">
        {goodNews.length > 0 && (
          <TrackedSection id="good_news">
            <DGGoodNews items={goodNews} onFlagEarned={earn} savedSet={savedSet} editionDate={viewedDate} />
          </TrackedSection>
        )}
        <TrackedSection id="on_this_day">
          <DGOnThisDay events={onThisDay} onFlagEarned={earn} savedSet={savedSet} editionDate={viewedDate} />
        </TrackedSection>
        <TrackedSection id="greatest_moments">
          <DGGreatestMoments moments={greatestMoments} savedSet={savedSet} editionDate={viewedDate} />
        </TrackedSection>
      </div>

      <TrackedSection id="inspiration">
        <DGInspirationBar edition={edition} />
      </TrackedSection>

      <TrackedSection id="destination">
        <div style={{ padding: '0.75rem clamp(1rem, 3vw, 2rem) 0.5rem' }}>
          <DGDestination
            dest={edition.destination}
            imageUrl={rawPost?.image_url}
            onFlagEarned={earn}
            savedSet={savedSet}
            editionDate={viewedDate}
          />
        </div>
      </TrackedSection>

      <TrackedSection id="more_to_explore">
        <DGMoreToExplore />
      </TrackedSection>
      <TrackedSection id="values">
        <DGValuesStrip />
      </TrackedSection>

      <TrackedSection id="for_parents">
        <DGForParents edition={edition} exploration={exploration} />
      </TrackedSection>

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
    </div>
  );
}

/**
 * `date` is the day the URL asks for and `today` the day it is; every other
 * prop is the server's content for `date`, already filtered to what a reader
 * may see.
 *
 * The reader is not a prop here: the chrome resolves the active child profile
 * in the layout and owns every surface that names them (the rail, the identity
 * header, the switcher). What reaches this component is only what the reader
 * may *see* of the day.
 *
 * `savedKeys` is the reader's answer for the hearts: the `type:id` keys they
 * have already saved, or null when there is no reader.
 *
 * `exploration` is today's activity roll-up for the For Parents card — also
 * server-resolved, also null without a reader (or when the roll-up failed), in
 * which case that card renders its own empty state.
 *
 * `signedOut` and `welcomeName` are the two facts about the *visitor* the day
 * itself cannot supply: whether there is a session at all, and whether this is
 * the first paper of a reader the /welcome wizard has just created. Both are
 * decided on the server; neither is ever inferred here.
 *
 * @param {{ date?: string, today?: string, edition?: any, dates?: string[], people?: any[], goodNews?: any[], onThisDay?: any[], greatestMoments?: any[], savedKeys?: string[] | null, exploration?: any, signedOut?: boolean, welcomeName?: string | null }} props
 */
export default function DailyGoldEdition({ date, today, edition = null, dates = [], people = [], goodNews = [], onThisDay = [], greatestMoments = [], savedKeys = null, exploration = null, signedOut = false, welcomeName = null }) {
  // Defaulted here rather than in the signature so a caller that knows neither
  // date — the design-sync preview — still renders a coherent single day.
  const todayStr = today || new Date().toISOString().slice(0, 10);

  return (
    // The provider is inert unless there is no session, so signed-in readers
    // pay nothing for it and the hearts below behave exactly as they always
    // have.
    <SignupInviteProvider signedOut={signedOut}>
      <DailyGoldDay
        date={date || todayStr}
        today={todayStr}
        edition={edition}
        dates={dates}
        people={people}
        goodNews={goodNews}
        onThisDay={onThisDay}
        greatestMoments={greatestMoments}
        savedKeys={savedKeys}
        exploration={exploration}
        signedOut={signedOut}
        welcomeName={welcomeName}
      />
    </SignupInviteProvider>
  );
}
