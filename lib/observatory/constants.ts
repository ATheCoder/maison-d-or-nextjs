/**
 * The observatory's fixed vocabulary (docs/parent-observatory-implementation-plan.md §3).
 *
 * Windows are trailing and fixed — there is no this-week/last-week toggle, by
 * decision: a parent comparing two weeks is measuring a child, which is the one
 * thing this surface refuses to help with.
 */

/**
 * The sections a *child* reads, and therefore the denominator of "opened X of Y
 * sections" in the edition recap.
 *
 * Cross-reference: components/dailygold/DailyGoldEditionPage.jsx:206-263 renders
 * these in this order. `for_parents` is rendered there too (:261) but is
 * deliberately absent here — it is the grown-ups' own card, and counting it
 * would make "9 of 10" the best score any reader could possibly get.
 *
 * `good_news` is conditional in the edition (`goodNews.length > 0`, :225), so
 * the denominator drops to 8 on days with nothing published.
 */
export const EDITION_PAPER_SECTIONS = [
  'hero',
  'born_today',
  'good_news',
  'on_this_day',
  'greatest_moments',
  'inspiration',
  'destination',
  'more_to_explore',
  'values',
] as const;

/** Published good-news items live in positions 0–9; 10+ are retrieval candidates. */
export const GOOD_NEWS_DISPLAY_LIMIT = 10;

/**
 * Sections that are tracked but never reported on this surface.
 *
 * `for_parents` is the grown-ups' own card, sitting at the foot of the child's
 * page. The child scrolls past it, so it accumulates real dwell — but telling a
 * parent "For Parents · under a minute · 0%" measures the parent's own card
 * against the child's curiosity, and "First visit to For Parents" is not an
 * achievement anybody wants read out at dinner. It is already excluded from the
 * recap denominator (EDITION_PAPER_SECTIONS); this keeps that consistent across
 * the meters and the milestone feed.
 */
export const HIDDEN_SECTIONS: readonly string[] = ['for_parents'];

// ── Windows ──────────────────────────────────────────────────────────────────

/** F1. Seven bars: today plus the six days behind it. */
export const WEEK_DAYS = 7;
/** F2/F3. Today plus 29 days behind it. Well inside the 12-month purge horizon. */
export const MONTH_DAYS = 30;
/** F4. A book untouched for this long is "set aside", never "abandoned". */
export const BOOKSHELF_ACTIVE_DAYS = 14;
/**
 * F5. A section first visited longer ago than this is not surfaced as a
 * first-ever, because the 12-month purge can make an old section look new
 * again once its original rows are gone (plan §8).
 */
export const FIRST_EVER_WINDOW_DAYS = 30;

// ── Caps ─────────────────────────────────────────────────────────────────────

/** F3. What the query fetches; the card shows TOP_CONTENT_VISIBLE and hides the rest. */
export const TOP_CONTENT_LIMIT = 25;
export const TOP_CONTENT_VISIBLE = 6;
/** F5. */
export const MILESTONE_LIMIT = 8;
export const FLAG_MILESTONE_LIMIT = 12;
/** F5. Below this a streak is just "read yesterday too", not an achievement. */
export const STREAK_MILESTONE_MIN = 3;
/** F6. */
export const RECAP_DAY_LIMIT = 10;
/** F7. */
export const STARTER_LIMIT = 3;

// ── Reading rhythm (F2) ──────────────────────────────────────────────────────

/**
 * Four coarse bands, deliberately named the way a parent would say them rather
 * than by clock hours. The evening band wraps past midnight: reading at 00:30 is
 * a late evening, not an early morning, and giving it its own band would leak a
 * finer-grained sense of *when* than the spec allows (§6.4).
 */
export const RHYTHM_BANDS = [
  { key: 'morning', label: 'Morning', phrase: 'in the morning', fromHour: 5, toHour: 11 },
  { key: 'midday', label: 'Midday', phrase: 'around midday', fromHour: 11, toHour: 15 },
  { key: 'after_school', label: 'After school', phrase: 'after school', fromHour: 15, toHour: 18 },
  { key: 'evening', label: 'Evening', phrase: 'in the evening', fromHour: 18, toHour: 5 },
] as const;

export type RhythmBandKey = (typeof RHYTHM_BANDS)[number]['key'];

/** Share of the month's dwell that lifts a band from faint to mid to solid. */
export const BAND_LEVEL_MID = 0.15;
export const BAND_LEVEL_HIGH = 0.4;

/** Two resume→pause spans closer than this are one sitting interrupted. */
export const SESSION_MERGE_GAP_MS = 60_000;
/**
 * A span longer than this lost its pause event. The collector heartbeats every
 * 30s, so silence far past that means the tab died rather than that a child read
 * for three hours — capping undercounts, which is the defensible direction.
 */
export const SESSION_CAP_MS = 90 * 60_000;

/** Below either threshold there is no pattern yet, and the module says so. */
export const RHYTHM_MIN_SPANS = 3;
export const RHYTHM_MIN_ENGAGED_MS = 15 * 60_000;

/**
 * Typical-session buckets, in minutes. A median is reported as the band that
 * contains it — "10–15 minutes", never "12.4 minutes", because the precision
 * would be fake and would invite treating it as a target (§6.3).
 */
export const SESSION_BUCKETS: readonly (readonly [number, number])[] = [
  [0, 5], [5, 10], [10, 15], [15, 25], [25, 40], [40, 60], [60, 90],
];
