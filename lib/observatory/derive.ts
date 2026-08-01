/**
 * Everything the observatory *infers* rather than reads (plan §3).
 *
 * All of it is pure, and deliberately so: session spans, band folding, streaks
 * and story states are where a plausible-looking off-by-one becomes a sentence
 * a parent believes about their child. A wrong "set aside" tells someone their
 * daughter gave up on a book she read this morning. That is worth a test suite
 * that needs no database.
 *
 * Nothing here ever sees a timestamp finer than an hour band or a day key —
 * per-event times stay on the server (spec §6.4), and the shapes below are the
 * boundary that enforces it.
 */
import {
  BAND_LEVEL_HIGH,
  BAND_LEVEL_MID,
  BOOKSHELF_ACTIVE_DAYS,
  MILESTONE_LIMIT,
  RHYTHM_BANDS,
  SESSION_BUCKETS,
  SESSION_CAP_MS,
  SESSION_MERGE_GAP_MS,
  STARTER_LIMIT,
  STREAK_MILESTONE_MIN,
  type RhythmBandKey,
} from './constants';
import { formatMinutes, pluralise, toMinutes } from './format';
import { dayMonthForKey, daysBetweenKeys, longDateForKey, shortWeekdayForKey, weekdayForKey } from '../family-time';
import { SECTION_LABELS, type AnalyticsSection } from '../analytics-events';

/** A section's display name, falling back to its raw id rather than to blank. */
export function sectionLabel(section: string): string {
  return SECTION_LABELS[section as AnalyticsSection] ?? section;
}

// ── F1 · the week's bars ─────────────────────────────────────────────────────

export type DayDwell = { day: string; ms: number };
export type WeekBar = {
  day: string;
  label: string;
  minutes: number;
  ms: number;
  isToday: boolean;
  /** Solid rather than faint: the mock highlights both the peak and today. */
  isHighlight: boolean;
  /** Percentage of the tallest bar, for the track height. */
  height: number;
};

/**
 * Turn a sparse grouped result into exactly one bar per day.
 *
 * Days with no rows are real zeroes — a child who did not read on Tuesday has a
 * flat Tuesday, not a missing one — so the zero-fill walks the key list rather
 * than the result set.
 */
export function buildWeekBars(dayKeys: readonly string[], rows: readonly DayDwell[], todayKey: string): WeekBar[] {
  const byDay = new Map(rows.map((row) => [row.day, row.ms]));
  const peak = Math.max(0, ...dayKeys.map((key) => byDay.get(key) ?? 0));
  return dayKeys.map((key) => {
    const ms = byDay.get(key) ?? 0;
    const isToday = key === todayKey;
    return {
      day: key,
      label: isToday ? 'Today' : shortWeekdayForKey(key),
      minutes: toMinutes(ms),
      ms,
      isToday,
      isHighlight: ms > 0 && (isToday || ms === peak),
      height: peak > 0 ? Math.round((ms / peak) * 100) : 0,
    };
  });
}

// ── F2 · reading rhythm ──────────────────────────────────────────────────────

export type SessionMark = { type: 'session_resume' | 'session_pause'; at: number };

/**
 * Pair resume→pause into sittings, in milliseconds.
 *
 * Three corrections, each for a real shape in the data:
 *  - a resume with no pause after it never closes, so it is dropped entirely
 *    rather than run to "now" (that would invent time nobody spent);
 *  - a second resume while one is open means the pause was lost — the earlier
 *    open wins, and the 90-minute cap keeps the damage bounded;
 *  - two sittings a few seconds apart are one sitting with a blink in it, so
 *    gaps under a minute are merged before anything is measured.
 */
export function sessionSpans(marks: readonly SessionMark[]): number[] {
  const ordered = [...marks].sort((a, b) => a.at - b.at);

  const intervals: { start: number; end: number }[] = [];
  let open: number | null = null;
  for (const mark of ordered) {
    if (mark.type === 'session_resume') {
      if (open === null) open = mark.at;
      continue;
    }
    if (open === null) continue; // a pause with nothing open — carryover from a lost session
    if (mark.at > open) intervals.push({ start: open, end: mark.at });
    open = null;
  }

  const merged: { start: number; end: number }[] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval.start - last.end < SESSION_MERGE_GAP_MS) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  return merged
    .map((interval) => Math.min(interval.end - interval.start, SESSION_CAP_MS))
    .filter((ms) => ms > 0);
}

export type HourDwell = { hour: number; ms: number };
export type RhythmBand = { key: RhythmBandKey; label: string; level: 0 | 1 | 2 | 3 };

const inBand = (hour: number, fromHour: number, toHour: number): boolean => (
  fromHour < toHour ? hour >= fromHour && hour < toHour : hour >= fromHour || hour < toHour
);

/**
 * Fold 24 hourly totals into the four bands a parent would name.
 *
 * Levels are shares, not absolute minutes: the bars answer "when does she
 * read", never "how much", so a quiet month and a busy one with the same shape
 * look the same. Any band with time in it gets at least level 1 — showing an
 * empty bar for a band the child actually used would be the dishonest kind of
 * rounding.
 */
export function foldBands(rows: readonly HourDwell[]): { bands: RhythmBand[]; topPhrase: string | null } {
  const totals = RHYTHM_BANDS.map((band) => (
    rows.reduce((sum, row) => (inBand(row.hour, band.fromHour, band.toHour) ? sum + row.ms : sum), 0)
  ));
  const total = totals.reduce((sum, ms) => sum + ms, 0);

  const bands = RHYTHM_BANDS.map((band, i): RhythmBand => {
    const ms = totals[i];
    if (ms <= 0 || total <= 0) return { key: band.key, label: band.label, level: 0 };
    const share = ms / total;
    return {
      key: band.key,
      label: band.label,
      level: share >= BAND_LEVEL_HIGH ? 3 : share >= BAND_LEVEL_MID ? 2 : 1,
    };
  });

  const peak = Math.max(...totals);
  const topIndex = peak > 0 ? totals.indexOf(peak) : -1;
  return { bands, topPhrase: topIndex >= 0 ? RHYTHM_BANDS[topIndex].phrase : null };
}

/**
 * The median sitting, reported as the bucket that contains it.
 *
 * A median rather than a mean because one 90-minute Saturday should not move
 * the sentence a parent reads about a normal Tuesday.
 */
export function typicalSession(spans: readonly number[]): { lowMin: number; highMin: number } | null {
  if (spans.length === 0) return null;
  const sorted = [...spans].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianMs = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const medianMin = medianMs / 60_000;

  const bucket = SESSION_BUCKETS.find(([, high]) => medianMin < high)
    ?? SESSION_BUCKETS[SESSION_BUCKETS.length - 1];
  return { lowMin: bucket[0], highMin: bucket[1] };
}

/**
 * The rhythm sentence.
 *
 * Uses the child's name, never a pronoun: `child_profile` stores none, and the
 * mock's "she" would be a guess about a real person. The bottom bucket is
 * phrased "under 5 minutes" rather than "0–5", which reads like a measurement
 * of failure.
 */
export function rhythmSentence(
  name: string,
  typical: { lowMin: number; highMin: number } | null,
  topPhrase: string | null,
): string | null {
  if (!typical) return null;
  const length = typical.lowMin === 0
    ? `under ${typical.highMin} minutes`
    : `${typical.lowMin}–${typical.highMin} minutes`;
  return topPhrase
    ? `${name} usually reads ${length}, mostly ${topPhrase}.`
    : `${name} usually reads ${length}.`;
}

// ── F4 · the bookshelf ───────────────────────────────────────────────────────

export type StoryRow = {
  storyId: string;
  title: string | null;
  pagesReached: number;
  sittings: number;
  ms: number;
  lastDay: string;
  finishedDay: string | null;
  /** The book's cover art, or null when the person has none on file. */
  coverUrl: string | null;
};

export type ShelfState = 'reading' | 'finished' | 'set_aside';

export type ShelfBook = {
  storyId: string;
  title: string;
  state: ShelfState;
  stateLabel: string;
  /** "7 pages in · 2 sittings · 12 min" — every figure here is literally true. */
  meta: string;
  /** 0–100. Relative attention on this child's own shelf; see buildShelf. */
  fill: number;
  pagesReached: number;
  ms: number;
  /** The cover the child saw, or null — the card paints a spine instead. */
  coverUrl: string | null;
};

/** Reading now, then finished, then set aside — a parent's order of interest. */
const STATE_RANK: Record<ShelfState, number> = { reading: 0, finished: 1, set_aside: 2 };

export function storyState(row: StoryRow, todayKey: string): ShelfState {
  if (row.finishedDay) return 'finished';
  return daysBetweenKeys(row.lastDay, todayKey) <= BOOKSHELF_ACTIVE_DAYS ? 'reading' : 'set_aside';
}

/**
 * Build the shelf rows, including the progress track.
 *
 * **The track is not fraction-of-book, and cannot be.** A story's page count is
 * unknowable from the data: page numbering is orientation-dependent
 * (components/dailygold/GoldenStory.jsx:606-610 — a leaf in portrait, a spread
 * in landscape) and no page-count column exists. The mock's "14 of 22 pages" is
 * therefore not reproducible honestly, so the fill encodes *relative attention
 * within this child's own shelf* instead — the longest-read book is full, the
 * others are proportional — and every real number lives in the meta line where
 * it cannot be misread as progress. A finished book is always full.
 */
export function buildShelf(rows: readonly StoryRow[], todayKey: string): ShelfBook[] {
  const maxMs = Math.max(0, ...rows.map((row) => row.ms));

  return rows
    .map((row): ShelfBook => {
      const state = storyState(row, todayKey);
      const pages = pluralise(row.pagesReached, 'page');
      const meta = state === 'finished'
        ? [pages, `finished ${longDateForKey(row.finishedDay ?? row.lastDay)}`, pluralise(row.sittings, 'sitting')]
        : state === 'reading'
          ? [`${pages} in`, pluralise(row.sittings, 'sitting'), formatMinutes(row.ms)]
          : [`${pages} in`, `last read ${dayMonthForKey(row.lastDay)}`];

      return {
        storyId: row.storyId,
        title: row.title?.trim() || 'A story',
        state,
        stateLabel: state === 'finished' ? 'Finished' : state === 'reading' ? 'Reading' : 'Set aside',
        meta: meta.filter(Boolean).join(' · '),
        fill: state === 'finished' ? 100 : maxMs > 0 ? Math.max(4, Math.round((row.ms / maxMs) * 100)) : 0,
        pagesReached: row.pagesReached,
        ms: row.ms,
        coverUrl: row.coverUrl?.trim() || null,
      };
    })
    .sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || b.ms - a.ms);
}

// ── F5 · milestones ──────────────────────────────────────────────────────────

/**
 * Consecutive *editions* opened, ending today or yesterday.
 *
 * Counted along the edition_date chain, not along days the child was active:
 * catching up on Sunday with Friday's paper keeps a streak alive, which is the
 * honest reading of "opened the paper in a row". Allowing yesterday as the
 * anchor means a streak does not appear broken all morning before today's read.
 */
export function editionStreak(editionDays: readonly string[], todayKey: string): number {
  const days = new Set(editionDays);
  const yesterday = shiftKey(todayKey, -1);
  let cursor = days.has(todayKey) ? todayKey : days.has(yesterday) ? yesterday : null;
  if (!cursor) return 0;

  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = shiftKey(cursor, -1);
  }
  return count;
}

/** Local re-implementation of a one-day step, to keep this module import-light. */
function shiftKey(key: string, delta: number): string {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  return new Date(Date.UTC(year, month - 1, day) + delta * 86_400_000).toISOString().slice(0, 10);
}

export type Milestone = {
  kind: 'flag' | 'story_finished' | 'first_section' | 'streak';
  prefix: string;
  emphasis: string | null;
  day: string;
  when: string;
  tone: 'gold' | 'sage';
};

export type MilestoneInput = {
  todayKey: string;
  flags: readonly { countryName: string; day: string }[];
  finishedStories: readonly { title: string; day: string }[];
  firstSections: readonly { section: string; day: string }[];
  streak: number;
};

/**
 * The celebration feed, newest first.
 *
 * Time never appears as an achievement here — no "read 30 minutes" badge — per
 * spec §4 F5; minutes are context elsewhere on the page and nothing more. Days
 * render as weekday names, never as clock times.
 */
export function milestoneFeed(input: MilestoneInput): Milestone[] {
  const items: Milestone[] = [
    ...input.flags.map((flag): Milestone => ({
      kind: 'flag',
      prefix: 'Earned the flag of ',
      emphasis: flag.countryName,
      day: flag.day,
      when: weekdayForKey(flag.day),
      tone: 'gold',
    })),
    ...input.finishedStories.map((story): Milestone => ({
      kind: 'story_finished',
      prefix: 'Finished ',
      emphasis: story.title,
      day: story.day,
      when: weekdayForKey(story.day),
      tone: 'gold',
    })),
    ...input.firstSections.map((first): Milestone => ({
      kind: 'first_section',
      prefix: 'First visit to ',
      emphasis: sectionLabel(first.section),
      day: first.day,
      when: weekdayForKey(first.day),
      tone: 'sage',
    })),
  ];

  if (input.streak >= STREAK_MILESTONE_MIN) {
    items.push({
      kind: 'streak',
      prefix: `${input.streak} editions opened in a row`,
      emphasis: null,
      day: input.todayKey,
      when: '',
      tone: 'gold',
    });
  }

  return items
    .filter((item) => item.day && (item.emphasis === null || item.emphasis.trim().length > 0))
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
    .slice(0, MILESTONE_LIMIT);
}

// ── F6 · edition recap ───────────────────────────────────────────────────────

export type RecapBreakdown = { visited: number; total: number; skipped: string[] };

/**
 * How much of one day's paper the child actually opened.
 *
 * The denominator is what was *printed* that day, so good_news drops out when
 * nothing was published (components/dailygold/DailyGoldEditionPage.jsx:225) —
 * otherwise a child would be shown as skipping a section that never existed.
 */
export function recapBreakdown(
  paperSections: readonly string[],
  visitedSections: readonly string[],
): RecapBreakdown {
  const visited = new Set(visitedSections);
  const seen = paperSections.filter((section) => visited.has(section));
  return {
    visited: seen.length,
    total: paperSections.length,
    skipped: paperSections.filter((section) => !visited.has(section)).map(sectionLabel),
  };
}

// ── F7 · conversation starters ───────────────────────────────────────────────

export type Starter = { text: string; why: string };

export type StarterInput = {
  name: string;
  topContent: readonly { label: string | null; ms: number }[];
  shelf: readonly ShelfBook[];
  flags: readonly { countryName: string; day: string }[];
};

/**
 * Template-rendered openers, zero LLM (spec §4 F7).
 *
 * The rule is that every one of these must be reconstructible from a row a
 * parent could be shown anyway — if it cannot be generated honestly, the module
 * renders nothing rather than reaching. Uses the child's name throughout for
 * the same reason rhythmSentence does: there is no pronoun to know.
 */
export function conversationStarters(input: StarterInput): Starter[] {
  const starters: Starter[] = [];

  const topic = input.topContent.find((item) => item.label?.trim() && item.ms > 0);
  if (topic?.label) {
    starters.push({
      text: `Ask ${input.name} about ${topic.label.trim()}.`,
      why: `${formatMinutes(topic.ms)} with it this month.`,
    });
  }

  const reading = input.shelf.find((book) => book.state === 'reading' && book.pagesReached > 0);
  if (reading) {
    starters.push({
      text: `Ask how ${reading.title} is going.`,
      why: `${input.name} is ${pluralise(reading.pagesReached, 'page')} in.`,
    });
  }

  const flag = input.flags.find((item) => item.countryName.trim() && weekdayForKey(item.day));
  if (flag) {
    starters.push({
      text: `Ask about the flag of ${flag.countryName.trim()}.`,
      why: `Earned ${weekdayForKey(flag.day)}.`,
    });
  }

  return starters.slice(0, STARTER_LIMIT);
}
