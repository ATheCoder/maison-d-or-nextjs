'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DGHero from '@/components/dailygold/DGHero';
import DGBornToday from '@/components/dailygold/DGBornToday';
import DGGoodNews from '@/components/dailygold/DGGoodNews';
import DGOnThisDay from '@/components/dailygold/DGOnThisDay';
import DGDestination from '@/components/dailygold/DGDestination';
import DGMoreToExplore from '@/components/dailygold/DGMoreToExplore';
import DGValuesStrip from '@/components/dailygold/DGValuesStrip';
import DGGreatestMoments from '@/components/dailygold/DGGreatestMoments';
import DGWaxSealNavigator from '@/components/dailygold/DGWaxSealNavigator';
import DGInspirationBar from '@/components/dailygold/DGInspirationBar';
import FlagSealCelebration from '@/components/dailygold/FlagSealCelebration';
import { GALLERY_CSS } from '@/components/dailygold/galleryCss';
import { useFlagEarn } from '@/components/dailygold/useFlagEarn';
import { TrackedSection } from '@/components/dailygold/instrumentation/TrackedSection';
import { SignupInviteProvider } from '@/components/dailygold/SignupInvite';
import { SignedOutCta, WelcomeFlourish } from '@/components/dailygold/DGVisitorBanners';
import { useReader } from '@/components/dailygold/ReaderContext';
import type { DestinationView } from '@/components/dailygold/DGDestination';
import type {
  EditionRecord,
  GoodNewsRecord,
  GreatestMomentRecord,
  OnThisDayRecord,
  PersonRecord,
} from '@/app/(dg)/daily-gold-edition/queries';

/**
 * PAGE — /daily-gold-edition
 * Daily Gold — The Gallery
 *
 * The day is hung as a gallery. The paintings are the page and every word is a
 * label: small, precise, always *beneath* the work rather than printed over
 * it. One wall per section, an enormous amount of air, and nothing that lifts,
 * floats or glows — the art does the glowing. The reference drawing is
 * `.design-sync/redesigns/06-gallery.html`; the geometry lives in GALLERY_CSS
 * and the walls compose three primitives out of `gallery/` (Wall, Work,
 * Label).
 *
 * The gallery is drawn dark in the mockup, because a gallery is dark so the
 * pictures can be light. This page is not: it hangs on whichever of the seven
 * [data-theme] grounds the reader chose, which is why every gold *glyph* on it
 * is --accent-readable and why the closed rooms dim upward on the five lit
 * grounds. GALLERY_CSS documents both rules and the measurements behind them.
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
 * padding — lives in DGAppChrome, mounted by the (dg) group's layout and shared
 * with every other rail destination, so that turning to another day rebuilds
 * only what is below. The layout contract
 * (navigation-redesign-spec §4/§7) is documented there and in NAV_SHELL_CSS.
 * The gallery changed nothing about it: the mockup's 224px rail with its five
 * routes, its identity block and its theme picker *is* the rail already there.
 */

/**
 * The edition as the sections below read it: the flat `EditionRecord` columns
 * regrouped into a destination, a pair of images and the day's quote. Nothing
 * here reaches the server — it is `mapRecord`'s output and this component's
 * private shape, except `destination`, which is DGDestination's own declared
 * prop type so that the mapping is checked against the thing consuming it.
 */
type EditionView = {
  id: string | null;
  date: string | null;
  destination_name?: string | null;
  daily_quote?: string | null;
  daily_quote_author?: string | null;
  destination: DestinationView | null;
  images: { destination?: string | null; hero?: string | null };
  generated_at: string | null;
};

// Today has no edition row. An explicit absent state — never another day's
// content, and never sample content dressed up as today's.
const EMPTY_EDITION: EditionView = {
  id: null,
  date: null,
  destination_name: null,
  destination: null,
  images: {},
  generated_at: null,
};

// Map a raw edition record (snake_case, as returned by the Drizzle-backed
// day reads) into the view-model the child components consume.
function mapRecord(record: EditionRecord) {
  // An edition row can exist with nothing authored in it yet. Only build a
  // destination when there is something to show, so the section can be absent
  // rather than rendering a shell of em-dashes.
  const hasDestination = !!(
    record.destination_country || record.destination_description || record.destination_image_url ||
    record.taste_of_day || record.sound_of_day || record.nature_detail || record.tiny_phrase ||
    record.continent || record.child_life
  );
  const edition: EditionView = {
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
      taste_of_day: record.taste_of_day ? { name: record.taste_of_day, image_url: record.taste_image_url } : null,
      sound_of_day: record.sound_of_day ? { name: record.sound_of_day, image_url: record.sound_image_url } : null,
      nature_detail: record.nature_detail ? { name: record.nature_detail, image_url: record.nature_image_url } : null,
      tiny_phrase: record.tiny_phrase ? {
        word: record.tiny_phrase,
        translation: record.tiny_phrase_translation,
        language: record.tiny_phrase_language || null,
        image_url: record.phrase_image_url,
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

type DayContent = {
  date: string;
  today: string;
  edition: EditionRecord | null;
  dates: string[];
  people: PersonRecord[];
  goodNews: GoodNewsRecord[];
  onThisDay: OnThisDayRecord[];
  greatestMoments: GreatestMomentRecord[];
};

function DailyGoldDay({
  date,
  today,
  edition: editionRecord,
  dates,
  people,
  goodNews,
  onThisDay,
  greatestMoments,
  savedSet,
  signedOut,
  welcomeName,
}: DayContent & {
  savedSet: Set<string> | null;
  signedOut: boolean;
  /** The active child's name when `?welcome=1` brought them here, else null. */
  welcomeName: string | null;
}) {
  const router = useRouter();

  // Every section is the server's answer for `date`, so the entrance, the
  // footer and the walls between them can never disagree about which day this
  // is.
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
  const handleDateChange = useCallback((next: string) => {
    if (!next || next === viewedDate) return;
    router.push(next === today ? '/daily-gold-edition' : `/daily-gold-edition?date=${next}`, { scroll: false });
  }, [router, viewedDate, today]);

  return (
    // The day's content, inside the <main> the chrome provides. The fade is
    // here rather than on <main> so it plays on each day the reader turns to,
    // not once when the chrome first mounts.
    <div className="gl" style={{ animation: 'dgFadeIn 0.4s ease-out' }}>
      <style>{GALLERY_CSS}</style>

      {/* Who is holding the paper, not what is in it — so both sit above the
          entrance and outside every tracked region. The signed-out bar is
          full-bleed and sticky, so it lives directly in the flow; the flourish
          is a card, and its slot pads instead of the card carrying a top
          margin — a first-child margin would collapse out of the page and open
          a white body-band above the themed background. */}
      {signedOut && <SignedOutCta />}
      {welcomeName && (
        <div style={{ paddingTop: 'clamp(0.75rem, 2vw, 1.25rem)' }}>
          <WelcomeFlourish name={welcomeName} />
        </div>
      )}

      {celebration && (
        <FlagSealCelebration
          key={celebration.id}
          countryCode={celebration.countryCode}
          countryName={celebration.countryName}
          type={celebration.type}
          onDone={dismissCelebration}
        />
      )}

      {/* ── the entrance ─────────────────────────────────────────────────
          One painting, the day's name, and the turner on the label's own
          line. The day navigator is chrome rather than reading, so it sits
          inside the entrance but outside the tracked region — a child hunting
          for yesterday's paper shouldn't bank dwell against the hero. */}
      <TrackedSection id="hero">
        <DGHero
          dateStr={dateLabel}
          heroImageUrl={edition.images?.hero || rawPost?.image_url}
          destinationName={edition.destination?.name}
          atmosphere={edition.destination?.atmosphere}
          hasEdition={!!editionRecord}
        >
          <DGWaxSealNavigator
            currentDate={viewedDate}
            availableDates={dates}
            onDateChange={handleDateChange}
          />
        </DGHero>
      </TrackedSection>

      {/* ── the destination wall, and its four senses ── */}
      <TrackedSection id="destination">
        <DGDestination
          dest={edition.destination}
          imageUrl={rawPost?.image_url}
          onFlagEarned={earn}
          savedSet={savedSet}
          editionDate={viewedDate}
        />
      </TrackedSection>

      {/* ── the portrait wall ── */}
      <TrackedSection id="born_today">
        <DGBornToday people={people} savedSet={savedSet} editionDate={viewedDate} />
      </TrackedSection>

      {/* ── the salon hang ── */}
      <TrackedSection id="good_news">
        <DGGoodNews items={goodNews} onFlagEarned={earn} savedSet={savedSet} editionDate={viewedDate} />
      </TrackedSection>

      {/* ── the year room ──
          On This Day does not award flag seals for now: its locations are
          wherever history happened, not places the child was taken, so a
          twenty-year band handed out flags faster than every other surface
          combined. The section still keeps its earning code — re-enable by
          passing `onFlagEarned={earn}` again. */}
      <TrackedSection id="on_this_day">
        <DGOnThisDay events={onThisDay} savedSet={savedSet} editionDate={viewedDate} />
      </TrackedSection>

      {/* ── the ledger ── */}
      <TrackedSection id="greatest_moments">
        <DGGreatestMoments moments={greatestMoments} savedSet={savedSet} editionDate={viewedDate} />
      </TrackedSection>

      {/* ── the quiet room ── */}
      <TrackedSection id="inspiration">
        <DGInspirationBar edition={edition} />
      </TrackedSection>

      {/* ── the closed rooms ── */}
      <TrackedSection id="more_to_explore">
        <DGMoreToExplore />
      </TrackedSection>

      {/* ── the way out: the five words, then the tail. Neither is a wall, so
          neither takes the rule that separates one wall from the next. ── */}
      <TrackedSection id="values">
        <DGValuesStrip />
      </TrackedSection>

      <footer className="gl-foot">
        <p>&ldquo;The more we learn about the world, the more we learn about ourselves.&rdquo;</p>
        <small>Daily Gold · {dateLabel}</small>
      </footer>
    </div>
  );
}

/**
 * `date` is the day the URL asks for and `today` the day it is; every other
 * prop is the server's content for `date`, already filtered to what a reader
 * may see.
 *
 * **Nothing about the reader is a prop.** The chrome resolves the active child
 * once for the whole (dg) group and holds them in ReaderContext — identity, the
 * saved keys behind every heart, and whether there is a session at all. That is
 * what leaves this component's own props identical for every reader on a given
 * date, which is what lets the router keep the page and hand it back on the
 * next visit instead of asking the server to build it again (see
 * ReaderContext for the full argument).
 *
 * `welcome` is the one visitor fact that still arrives from the server, because
 * it is not about the reader but about the address: `?welcome=1` says the
 * /welcome wizard has just created whoever is holding this paper. The *name* in
 * the flourish still comes from the session's own active child by way of the
 * context, so the parameter can announce nobody else's child.
 *
 * Every content prop is typed as the query module's own record, so the shapes
 * app/(dg)/daily-gold-edition/page.tsx builds are checked all the way down to
 * the sections that render them — which they were not while this file was .jsx
 * and every one of them arrived as `any`. The imports are type-only and erased;
 * nothing of that `server-only` module ships to the client.
 */
export default function DailyGoldEdition({
  date,
  today,
  edition = null,
  dates = [],
  people = [],
  goodNews = [],
  onThisDay = [],
  greatestMoments = [],
  welcome = false,
}: Partial<DayContent> & { welcome?: boolean }) {
  // Defaulted here rather than in the signature so a caller that knows neither
  // date — the design-sync preview — still renders a coherent single day.
  const todayStr = today || new Date().toISOString().slice(0, 10);
  // Inert outside the (dg) chrome, so the preview renders a readerless paper
  // exactly as it did when these were unpassed props.
  const { child, signedOut, savedSet } = useReader();

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
        savedSet={savedSet}
        signedOut={signedOut}
        welcomeName={welcome && child ? child.name : null}
      />
    </SignupInviteProvider>
  );
}
