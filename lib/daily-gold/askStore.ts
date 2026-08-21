/**
 * The whole-unit asks (§8.2, §8.5) — "draft this day", "find good news",
 * "propose events for this month-day", "propose five more moments".
 *
 * Three rules shape everything here:
 *
 *  - **Propose, review, accept.** Factual content lands as *unpublished rows
 *    with citations* (D11), never as published copy. The only thing an ask
 *    writes straight into a live field is the freely-generated half of an
 *    edition — and only onto a draft the admin confirmed was safe to overwrite,
 *    which is the caller's check, exactly as `generateBook` does it.
 *  - **A citation is the price of being written.** The daily quote is the one
 *    piece of retrieved text with nowhere to store provenance, so an
 *    unverifiable quote is *reported, not written* (D10). The admin can still
 *    paste it in by hand, which is the distinction the decision draws.
 *  - **Words and paintings are one job.** A text-only run still composes and
 *    stores every scene (R6.2), so the difference between the two modes is
 *    whether the renders happen — never whether the slot ends up usable.
 *
 * Server-only: the Inngest functions import these bodies, so they must not live
 * in a `use server` module.
 */
import 'server-only';
import { NonRetriableError } from 'inngest';
import { and, asc, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/src/db';
import {
  dailyGoldEdition, goodNewsItem, greatestMoment, onThisDayEvent,
  type JobProgress, type JobResult,
} from '@/src/db/schema';
import { runPromptDetailed } from '@/lib/golden-story/brief';
import { parseJsonReply } from '@/lib/golden-story/openrouter';
import { setJobProgress } from '@/lib/golden-story/jobs';
import {
  MOMENT_PARK_FROM, MOMENT_RANKS, NEWS_DISPLAY_SLOTS, NEWS_PARK_FROM, nextParkingSlot,
} from './candidates';
import { draftDayPrompt, type DayDraft } from './write';
import {
  retrieveGoodNews, retrieveHistory, retrieveMoments, retrieveQuote,
  type RetrievalDebug, type RetrievedEvent, type RetrievedMoment, type RetrievedNews,
} from './retrieve';

/** What an ask is asking for. One job kind, four shapes of question. */
export type AskKind = 'day' | 'news' | 'history' | 'moments';

/** The choice made on the ask itself, never remembered as a preference (§8.5). */
export type AskMode = 'words' | 'words+paintings';

export type AskRequest = {
  kind: AskKind;
  /** 'YYYY-MM-DD' for day/news, 'MM-DD' for history/moments. */
  key: string;
  mode: AskMode;
  /** Units — five moments, eight stories. Ignored by the day ask. */
  count: number;
};

/**
 * What the ask body hands back: the slots it wrote scenes for, a summary for
 * the panel, and **every model call it made**.
 *
 * `debug` is deliberately not stored on the job row — it goes back as the
 * Inngest step's return value, so the run view holds the prompt, the raw reply
 * and the reason each discarded item went, while the database keeps only what
 * the admin needs to read. When an ask "does nothing", that view is the only
 * place the answer exists.
 */
export type AskOutcome = { slotKeys: string[]; result: JobResult; debug: RetrievalDebug[] };

// ── Staged progress ──────────────────────────────────────────────────────────

const STAGES: Record<AskKind, [key: string, label: string][]> = {
  day: [
    ['destination', 'Destination & atmosphere'],
    ['quote', 'A quote, with its source'],
    ['news', 'Good news, with citations'],
  ],
  news: [['news', 'Good news, with citations']],
  history: [['events', 'Events, with citations']],
  moments: [['moments', 'Moments, with citations']],
};

/** The initial progress an ask job is created with, so polling reads right from the first tick. */
export function initialAskProgress(req: AskRequest, label: string): JobProgress {
  return {
    ask: { kind: req.kind, mode: req.mode, units: req.count, label },
    stages: STAGES[req.kind].map(([key, l], i) => ({ key, label: l, state: i === 0 ? 'active' : 'pending' })),
  };
}

/** Advance the named stages on a job row, preserving the ask descriptor. */
function stageAdvancer(jobId: number, req: AskRequest, label: string) {
  let progress = initialAskProgress(req, label);
  return async (updates: Record<string, 'active' | 'done' | 'failed'>) => {
    progress = {
      ...progress,
      stages: (progress.stages ?? []).map((s) => (updates[s.key] ? { ...s, state: updates[s.key] } : s)),
    };
    await setJobProgress(jobId, progress);
  };
}

// ── Candidate writes ─────────────────────────────────────────────────────────

const now = () => new Date();

/**
 * Write retrieved good news as unpublished rows parked past the display band
 * (D11). Positions 10 upward, so twelve proposals can never displace an
 * authored story, and accepting is always a move *into* the ten.
 */
async function writeNewsCandidates(date: string, items: RetrievedNews[]): Promise<string[]> {
  if (!items.length) return [];
  const taken = await db
    .select({ position: goodNewsItem.position })
    .from(goodNewsItem)
    .where(eq(goodNewsItem.date, date));
  const used = new Set(taken.map((t) => t.position));

  const slotKeys: string[] = [];
  for (const item of items) {
    const position = nextParkingSlot(used, NEWS_PARK_FROM);
    used.add(position);
    await db.insert(goodNewsItem).values({
      date,
      position,
      headline: item.headline,
      description: item.description,
      location: item.location || null,
      imageScene: item.scene || null,
      published: false,
      sourceUrl: item.source_url,
      sourceTitle: item.source_title,
      sourcePublishedAt: item.source_published_at ? new Date(`${item.source_published_at}T00:00:00Z`) : null,
      retrievedAt: now(),
    });
    if (item.scene) slotKeys.push(`news:${position}`);
  }
  return slotKeys;
}

/**
 * Write retrieved events as unpublished rows. No parking band is needed here:
 * On This Day has no ten-item ceiling and `position` only orders a year's list,
 * so an unreviewed event is simply an unpublished one (R4.4, R4.9).
 */
async function writeEventCandidates(monthDay: string, items: RetrievedEvent[]): Promise<string[]> {
  const slotKeys: string[] = [];
  for (const item of items) {
    const [row] = await db.insert(onThisDayEvent).values({
      monthDay,
      year: item.year,
      // Positions are unique across the whole month-day, so they cannot restart
      // per year — the next free one for the day, as createEvent does it.
      position: sql`(select coalesce(max(position) + 1, 0) from on_this_day_event where month_day = ${monthDay})`,
      headline: item.headline,
      story: item.story,
      location: item.location || null,
      imageScene: item.scene || null,
      maisonRewriteDone: false,
      sourceUrl: item.source_url,
      sourceTitle: item.source_title,
      sourcePublishedAt: item.source_published_at ? new Date(`${item.source_published_at}T00:00:00Z`) : null,
      retrievedAt: now(),
    }).returning({ position: onThisDayEvent.position });
    if (item.scene) slotKeys.push(`history:${item.year}:${row.position}`);
  }
  return slotKeys;
}

/** Write retrieved moments as unpublished rows parked past rank 10 (D11). */
async function writeMomentCandidates(monthDay: string, items: RetrievedMoment[]): Promise<string[]> {
  if (!items.length) return [];
  const taken = await db
    .select({ rank: greatestMoment.rank })
    .from(greatestMoment)
    .where(eq(greatestMoment.monthDay, monthDay));
  const used = new Set(taken.map((t) => t.rank));

  const slotKeys: string[] = [];
  for (const item of items) {
    const rank = nextParkingSlot(used, MOMENT_PARK_FROM);
    used.add(rank);
    await db.insert(greatestMoment).values({
      monthDay,
      rank,
      year: item.year,
      headline: item.headline,
      story: item.story,
      imageScene: item.scene || null,
      published: false,
      sourceUrl: item.source_url,
      sourceTitle: item.source_title,
      sourcePublishedAt: item.source_published_at ? new Date(`${item.source_published_at}T00:00:00Z`) : null,
      retrievedAt: now(),
    });
    if (item.scene) slotKeys.push(`moment:${rank}`);
  }
  return slotKeys;
}

// ── Context the asks need ────────────────────────────────────────────────────

/** Destinations the neighbouring fortnight already visits — so a week isn't all Portugal. */
async function recentDestinations(date: string): Promise<string[]> {
  const from = new Date(`${date}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 14);
  const to = new Date(`${date}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() + 14);

  const rows = await db
    .select({ destination: dailyGoldEdition.destinationCountry })
    .from(dailyGoldEdition)
    .where(and(
      gte(dailyGoldEdition.editionDate, from.toISOString().slice(0, 10)),
      lte(dailyGoldEdition.editionDate, to.toISOString().slice(0, 10)),
      ne(dailyGoldEdition.editionDate, date),
    ));
  return rows.map((r) => r.destination).filter((d): d is string => Boolean(d));
}

/** Quotes the recent editions already use, so the bar doesn't repeat itself (R3.17). */
async function recentQuotes(date: string): Promise<string[]> {
  const from = new Date(`${date}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 30);
  const rows = await db
    .select({ quote: dailyGoldEdition.dailyQuote, author: dailyGoldEdition.dailyQuoteAuthor })
    .from(dailyGoldEdition)
    .where(and(
      gte(dailyGoldEdition.editionDate, from.toISOString().slice(0, 10)),
      lte(dailyGoldEdition.editionDate, date),
    ))
    .orderBy(desc(dailyGoldEdition.editionDate))
    .limit(30);
  return rows
    .filter((r) => r.quote)
    .map((r) => `“${r.quote}” — ${r.author ?? 'unattributed'}`);
}

/** What a month-day already covers, as one-liners the ask is told not to repeat (R4.18). */
async function historyExclusions(monthDay: string): Promise<string[]> {
  const rows = await db
    .select({ year: onThisDayEvent.year, headline: onThisDayEvent.headline })
    .from(onThisDayEvent)
    .where(eq(onThisDayEvent.monthDay, monthDay))
    .orderBy(asc(onThisDayEvent.year));
  return rows.filter((r) => r.headline).map((r) => `${r.year}: ${r.headline}`);
}

async function momentExclusions(monthDay: string): Promise<string[]> {
  const rows = await db
    .select({ year: greatestMoment.year, headline: greatestMoment.headline })
    .from(greatestMoment)
    .where(eq(greatestMoment.monthDay, monthDay))
    .orderBy(asc(greatestMoment.rank));
  return rows.filter((r) => r.headline).map((r) => `${r.year}: ${r.headline}`);
}

// ── The asks ─────────────────────────────────────────────────────────────────

/**
 * Draft a whole day: the destination and its atmosphere written freely, the
 * quote and the good-news column retrieved (§8.3).
 *
 * The edition fields are written directly because the row is a draft nobody can
 * see and the caller has already confirmed overwriting (§8.2). The good news is
 * *not*: it is a factual claim about the world, so it lands as candidates with
 * citations, whatever state the edition is in.
 */
async function runDayAsk(req: AskRequest, jobId: number): Promise<AskOutcome> {
  const date = req.key;
  const advance = stageAdvancer(jobId, req, `Draft ${date}`);

  const existing = await db
    .select({ id: dailyGoldEdition.id, destination: dailyGoldEdition.destinationCountry })
    .from(dailyGoldEdition)
    .where(eq(dailyGoldEdition.editionDate, date))
    .limit(1);
  if (!existing[0]) throw new NonRetriableError('This date has no edition row to write into.');

  // ① The destination and everything that follows from it.
  const debug: RetrievalDebug[] = [];
  const avoid = await recentDestinations(date);
  const dayPrompt = draftDayPrompt(date, avoid, existing[0].destination ?? undefined);
  const { text: raw } = await runPromptDetailed(dayPrompt, { maxTokens: 6000 });
  debug.push({
    stage: 'day draft',
    ask: dayPrompt.user,
    reply: raw.slice(0, 24000),
    citations: [],
    parsed: 1,
    kept: 1,
    dropped: [],
  });
  const draft = parseJsonReply<DayDraft>(raw, `The ${date} day draft`);

  await db.update(dailyGoldEdition).set({
    destinationCountry: draft.destination_country?.slice(0, 200) || null,
    continent: draft.continent?.slice(0, 40) || null,
    destinationDescription: draft.destination_description?.slice(0, 5000) || null,
    childLifeStory: draft.child_life_story?.slice(0, 10000) || null,
    tasteOfDay: draft.taste_of_day?.slice(0, 200) || null,
    soundOfDay: draft.sound_of_day?.slice(0, 200) || null,
    natureDetail: draft.nature_detail?.slice(0, 200) || null,
    tinyPhrase: draft.tiny_phrase?.slice(0, 200) || null,
    tinyPhraseLanguage: draft.tiny_phrase_language?.slice(0, 100) || null,
    tinyPhraseTranslation: draft.tiny_phrase_translation?.slice(0, 300) || null,
    heroScene: draft.hero_scene?.slice(0, 2000) || null,
    destinationScene: draft.destination_scene?.slice(0, 2000) || null,
    tasteScene: draft.taste_scene?.slice(0, 2000) || null,
    soundScene: draft.sound_scene?.slice(0, 2000) || null,
    natureScene: draft.nature_scene?.slice(0, 2000) || null,
    phraseScene: draft.phrase_scene?.slice(0, 2000) || null,
    generatedAt: now(),
    updatedAt: now(),
  }).where(eq(dailyGoldEdition.editionDate, date));

  const slotKeys: string[] = [];
  if (draft.hero_scene?.trim()) slotKeys.push('hero');
  if (draft.destination_scene?.trim()) slotKeys.push('destination');
  // The four senses' own paintings, since the destination wall started hanging
  // them as works rather than as text tiles.
  if (draft.taste_scene?.trim()) slotKeys.push('sense:taste');
  if (draft.sound_scene?.trim()) slotKeys.push('sense:sound');
  if (draft.nature_scene?.trim()) slotKeys.push('sense:nature');
  if (draft.phrase_scene?.trim()) slotKeys.push('sense:phrase');

  await advance({ destination: 'done', quote: 'active' });

  // ② The quote. Retrieved for its attribution, and written only if the source
  // it names is one the request actually read — the edition has nowhere to
  // store a citation, so an unverifiable quote is reported instead of written.
  let quoteNote: string;
  try {
    const quote = await retrieveQuote(date, await recentQuotes(date));
    debug.push(quote.debug);
    const items = quote.items;
    const best = items.find((q) => q.verified) ?? items[0] ?? null;
    if (best?.verified) {
      await db.update(dailyGoldEdition)
        .set({ dailyQuote: best.quote.slice(0, 1000), dailyQuoteAuthor: best.author.slice(0, 200), updatedAt: now() })
        .where(eq(dailyGoldEdition.editionDate, date));
      quoteNote = `Quote by ${best.author}, from ${best.source_title ?? best.source_url}.`;
    } else if (best) {
      quoteNote = `A quote was found but its source could not be confirmed, so it was left out: “${best.quote}” — ${best.author}. `
        + 'Paste it in by hand if you can verify it; otherwise the bar rotates its curated ten.';
    } else {
      quoteNote = 'No quote could be verified — the inspiration bar rotates its curated ten instead.';
    }
  } catch {
    quoteNote = 'The quote search failed. The bar rotates its curated ten, so the day is still complete.';
  }
  await advance({ quote: 'done', news: 'active' });

  // ③ Good news, as candidates — skipped when the column has no room, since a
  // proposal that could never be accepted is a search nobody can use.
  const news = req.count > 0
    ? await retrieveGoodNews(date, req.count)
    : { items: [] as RetrievedNews[], citations: [], discarded: 0, debug: null };
  if (news.debug) debug.push(news.debug);
  slotKeys.push(...await writeNewsCandidates(date, news.items));
  await advance({ news: 'done' });

  return {
    slotKeys,
    debug,
    result: {
      kind: 'day',
      destination: draft.destination_country ?? '',
      newsCandidates: news.items.length,
      unverifiedNews: news.items.filter((i) => !i.verified).length,
      newsSkipped: req.count === 0,
      quoteNote,
    },
  };
}

/** Good news alone — the day editor's "find good news for this date" (R3.6). */
async function runNewsAsk(req: AskRequest, jobId: number): Promise<AskOutcome> {
  const advance = stageAdvancer(jobId, req, `Good news for ${req.key}`);
  const { items, discarded, debug } = await retrieveGoodNews(req.key, req.count);
  const slotKeys = await writeNewsCandidates(req.key, items);
  await advance({ news: 'done' });
  return {
    slotKeys,
    debug: [debug],
    result: {
      kind: 'news',
      newsCandidates: items.length,
      unverifiedNews: items.filter((i) => !i.verified).length,
      discarded,
    },
  };
}

/** One ask per month-day across the twenty-year band (R4.5). */
async function runHistoryAsk(req: AskRequest, jobId: number): Promise<AskOutcome> {
  const advance = stageAdvancer(jobId, req, `Events for ${req.key}`);
  const to = new Date().getUTCFullYear();
  const from = to - 20;
  const { items, discarded, debug } = await retrieveHistory(req.key, from, to, await historyExclusions(req.key), req.count);
  const slotKeys = await writeEventCandidates(req.key, items);
  await advance({ events: 'done' });
  return {
    slotKeys,
    debug: [debug],
    result: {
      kind: 'history',
      eventCandidates: items.length,
      unverifiedEvents: items.filter((i) => !i.verified).length,
      // Almost always a year outside the band: the model reaches for famous
      // history, and this section is the recent past a child can step back
      // through. Reported rather than swallowed, or an empty panel reads as a
      // broken ask (R4.3).
      discarded,
      band: `${from}–${to}`,
    },
  };
}

/** "Propose five more" — appended, never a replacement (R4.17). */
async function runMomentsAsk(req: AskRequest, jobId: number): Promise<AskOutcome> {
  const advance = stageAdvancer(jobId, req, `Moments for ${req.key}`);
  const { items, discarded, debug } = await retrieveMoments(req.key, req.count, await momentExclusions(req.key));
  const slotKeys = await writeMomentCandidates(req.key, items);
  await advance({ moments: 'done' });
  return {
    slotKeys,
    debug: [debug],
    result: {
      kind: 'moments',
      momentCandidates: items.length,
      unverifiedMoments: items.filter((i) => !i.verified).length,
      discarded,
    },
  };
}

/** The body of the ask job's writing step — one entry point per ask kind. */
export function runAsk(req: AskRequest, jobId: number): Promise<AskOutcome> {
  switch (req.kind) {
    case 'day': return runDayAsk(req, jobId);
    case 'news': return runNewsAsk(req, jobId);
    case 'history': return runHistoryAsk(req, jobId);
    case 'moments': return runMomentsAsk(req, jobId);
  }
}

// ── What an ask may ask for ──────────────────────────────────────────────────

/**
 * How many units an ask can usefully request, and what to say about the cap.
 *
 * Moments are capped at the free rungs (R4.17): the ladder renders ten, so
 * proposing twelve would leave two that could never be accepted. Good news is
 * capped the same way against the display band. History has no ceiling — a
 * month-day holds as many events as its twenty years deserve.
 */
export async function askCapacity(kind: AskKind, key: string):
  Promise<{ max: number; note: string | null }> {
  if (kind === 'moments') {
    const rows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(greatestMoment)
      .where(and(eq(greatestMoment.monthDay, key), lte(greatestMoment.rank, MOMENT_RANKS)));
    const free = Math.max(0, MOMENT_RANKS - (rows[0]?.n ?? 0));
    return {
      max: free,
      note: free === 0
        ? 'All ten rungs are taken, so there is nowhere to accept a new moment. Delete one first.'
        : free < MOMENT_RANKS ? `${free} of the ten rungs are free.` : null,
    };
  }
  if (kind === 'news' || kind === 'day') {
    const rows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(goodNewsItem)
      .where(and(eq(goodNewsItem.date, key), sql`${goodNewsItem.position} < ${NEWS_DISPLAY_SLOTS}`));
    const free = Math.max(0, NEWS_DISPLAY_SLOTS - (rows[0]?.n ?? 0));
    return {
      max: free,
      note: free === 0
        ? 'The column already holds ten stories, so a new one could not be accepted into it.'
        : free < NEWS_DISPLAY_SLOTS ? `${free} of the ten column places are free.` : null,
    };
  }
  return { max: 12, note: null };
}
