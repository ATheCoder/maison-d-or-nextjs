/**
 * Retrieval (§8.3, D7) — the AI gathers its own facts, and every candidate
 * arrives with somewhere to check it.
 *
 * No training corpus contains a dated event from this week, so ungrounded
 * generation of "today's good news" is confabulation by construction. Each
 * function here runs one grounded request through the OpenRouter web plugin and
 * returns candidates alongside the sources the request actually cited.
 *
 * **The two provenance fields are not the same thing.** A candidate carries a
 * `source_url` the *model* wrote, and the request carries a citation list the
 * *engine* recorded. `verify` below crosses them: a claim whose URL appears in
 * the citation list is checkable, and one whose URL does not is marked
 * unverifiable rather than quietly dropped (R3.19) — an item with no citation
 * is publishable by hand but never by accepting a proposal (D10).
 *
 * Server-side: these call OpenRouter. They perform no writes — turning
 * candidates into rows is app/admin/daily-gold/aiActions.ts's job.
 */
import { runPromptDetailed, type ChatPrompt, type RunOptions } from '@/lib/golden-story/brief';
import { parseJsonReply, type Citation } from '@/lib/golden-story/openrouter';
import { DG_VOICE, DG_FIELDS } from './write';

// ── The shape a candidate comes back in ──────────────────────────────────────

/** What every retrieved item carries, whatever the content type. */
export type Provenance = {
  /** The source the model says it is reporting from. */
  source_url: string | null;
  source_title: string | null;
  /** When that source published, 'YYYY-MM-DD' — compared against the edition date. */
  source_published_at: string | null;
  /** True when `source_url` appears in the request's own citation list. */
  verified: boolean;
};

export type RetrievedNews = Provenance & {
  headline: string;
  description: string;
  location: string;
  scene: string;
};

export type RetrievedEvent = Provenance & {
  year: number;
  headline: string;
  story: string;
  location: string;
  scene: string;
};

export type RetrievedMoment = Provenance & {
  year: number;
  headline: string;
  story: string;
  scene: string;
};

export type RetrievedQuote = Provenance & {
  quote: string;
  author: string;
};

/**
 * What a retrieval run returns: its candidates, what it read to get them, and
 * **how many it threw away**.
 *
 * The discard count exists because "the search found nothing" and "the search
 * found six things and I rejected all of them" are different facts that would
 * otherwise reach the admin as the same empty panel. R3.21 makes an empty
 * result a first-class *answer*; it does not make an unexplained one
 * acceptable, and On This Day discards for a specific, fixable reason — the
 * model reaching for famous history outside the twenty-year band.
 */
export type Retrieval<T> = { items: T[]; citations: Citation[]; discarded: number; debug: RetrievalDebug };

/**
 * What one model call actually said — returned so the Inngest run view can show
 * it (lib/inngest/functions.ts hands it back as the step's output).
 *
 * Retrieval is the one part of this feature that cannot be reasoned about from
 * the code alone: the failure is always "the model said something other than
 * what I expected", and without the reply in front of you the only symptom is
 * an empty panel. `dropped` carries a line per discarded item saying *why* it
 * went, which is the difference between "the search found nothing" and "the
 * search found six things from 1969".
 */
export type RetrievalDebug = {
  /** Which part of the ask this call was. */
  stage: string;
  /** The user prompt, as sent. */
  ask: string;
  /** The model's reply, verbatim (truncated — a step output is not a log file). */
  reply: string;
  /** The sources the request actually read. */
  citations: { url: string; title: string | null }[];
  /** Items the reply contained, and how many survived. */
  parsed: number;
  kept: number;
  dropped: string[];
};

const REPLY_LIMIT = 24000;

/** Keep what passes; record one readable line for everything that does not. */
function sift<T>(rows: T[], reject: (item: T) => string | null): { items: T[]; dropped: string[] } {
  const items: T[] = [];
  const dropped: string[] = [];
  for (const row of rows) {
    const why = reject(row);
    if (why) dropped.push(why);
    else items.push(row);
  }
  return { items, dropped };
}

// ── Where good news is allowed to come from (R3.20) ──────────────────────────

/**
 * The curated outlet allowlist. Two kinds of source, deliberately:
 * dedicated good-news desks (which is where these stories are actually
 * reported), and general outlets with real editorial standards (so the column
 * is not built entirely out of one house's taste).
 *
 * Scoping the search this way is cheaper than filtering afterwards and it is
 * the only defence against a content farm that has learned what "uplifting
 * news" ranks for.
 */
export const GOOD_NEWS_OUTLETS = [
  'positive.news',
  'goodnewsnetwork.org',
  'reasonstobecheerful.world',
  'optimistdaily.com',
  'goodgoodgood.co',
  'theguardian.com',
  'bbc.co.uk',
  'bbc.com',
  'reuters.com',
  'apnews.com',
  'npr.org',
  'nationalgeographic.com',
  'smithsonianmag.com',
  'sciencealert.com',
  'nature.com',
];

// ── Shared plumbing ──────────────────────────────────────────────────────────

type JsonSchema = { type: string; [k: string]: unknown };
const str: JsonSchema = { type: 'string' };
const num: JsonSchema = { type: 'number' };
const obj = (properties: Record<string, JsonSchema>): JsonSchema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const arrayOf = (items: JsonSchema): JsonSchema => ({ type: 'array', items });

/** The three provenance fields every item is asked for, in one place. */
const PROVENANCE_PROPS = {
  source_url: str,
  source_title: str,
  source_published_at: str,
};

const PROVENANCE_RULES = `For every item you must give:
- source_url: the full URL of the page you actually read the fact on. Never a search page, never a homepage, never a guess.
- source_title: that page's headline.
- source_published_at: the date that page was published, as YYYY-MM-DD. Use an empty string if the page does not state one.
If you cannot find a real source for an item, leave the item out. A short list of real things is the correct answer; padding it is not.`;

/** Scene blocks are SUBJECT text only — the style block is added elsewhere. */
const SCENE_RULE = 'scene: one or two sentences of concrete nouns describing what a painting of this would show. No style words (no "oil painting", no "warm light"), no text or lettering in the scene, nobody in distress.';

const trimmed = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

/** 'YYYY-MM-DD' or null — the model is asked for one but writes prose sometimes. */
function isoDate(v: unknown): string | null {
  const s = trimmed(v, 40);
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return m[0].slice(0, 10);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

function url(v: unknown): string | null {
  const s = trimmed(v, 2000);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? s : null;
  } catch { return null; }
}

/**
 * Cross the model's claimed source against what the engine actually cited.
 *
 * Matching is by origin + path, ignoring query strings and trailing slashes:
 * engines routinely append tracking parameters to the URL they hand the model,
 * and treating that as a different page would mark honest citations
 * unverifiable — which teaches the admin to ignore the flag.
 */
export function verify(claimed: string | null, citations: Citation[]): boolean {
  if (!claimed) return false;
  const key = (u: string) => {
    try {
      const p = new URL(u);
      return `${p.origin}${p.pathname.replace(/\/+$/, '')}`.toLowerCase();
    } catch { return u.toLowerCase(); }
  };
  const want = key(claimed);
  return citations.some((c) => key(c.url) === want);
}

function provenanceOf(raw: Record<string, unknown>, citations: Citation[]): Provenance {
  const source_url = url(raw.source_url);
  return {
    source_url,
    source_title: trimmed(raw.source_title, 500) || null,
    source_published_at: isoDate(raw.source_published_at),
    verified: verify(source_url, citations),
  };
}

/** Parse a grounded reply's JSON, tolerating the odd fence the model adds. */
function parseItems(stage: string, text: string): Record<string, unknown>[] {
  const parsed = parseJsonReply<{ items?: unknown }>(text, `The ${stage} reply`);
  return Array.isArray(parsed?.items) ? parsed.items as Record<string, unknown>[] : [];
}

async function retrieve(stage: string, prompt: ChatPrompt, maxTokens: number, web: RunOptions['web']) {
  const { text, citations } = await runPromptDetailed(prompt, { maxTokens, web });
  const raw = parseItems(stage, text);
  return {
    raw,
    citations,
    // Filled in by the caller once it knows what it kept.
    debug: {
      stage,
      ask: prompt.user,
      reply: text.slice(0, REPLY_LIMIT),
      citations: citations.map((c) => ({ url: c.url, title: c.title })),
      parsed: raw.length,
      kept: 0,
      dropped: [] as string[],
    } satisfies RetrievalDebug,
  };
}

/** Stamp what survived onto the debug record. */
function withOutcome(debug: RetrievalDebug, kept: number, dropped: string[]): RetrievalDebug {
  return { ...debug, kept, dropped };
}

// ── Good news (R3.6, R3.20, R3.21) ───────────────────────────────────────────

const NEWS_SCHEMA = obj({
  items: arrayOf(obj({
    headline: str,
    description: str,
    location: str,
    scene: str,
    ...PROVENANCE_PROPS,
  })),
});

/**
 * Find real, recent good news for one edition date.
 *
 * Scoped two ways (R3.20): to the outlet allowlist, and to the days around the
 * edition — a 2019 feel-good story presented as today's news is this content
 * type's most likely failure, and the window is the cheap half of catching it
 * (the other half is the admin seeing `source_published_at` beside the claim).
 *
 * **Finding nothing is a correct answer** (R3.21). The prompt says so, and an
 * empty list is returned as an empty list rather than an error.
 */
export async function retrieveGoodNews(date: string, count: number): Promise<Retrieval<RetrievedNews>> {
  const window = 7;
  const from = new Date(`${date}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - window);

  const prompt: ChatPrompt = {
    system: DG_VOICE,
    user: `Find up to ${count} genuinely good news stories published between ${from.toISOString().slice(0, 10)} and ${date}, for the ${date} edition of Daily Gold.

What counts as good news here: something real that actually improved — a species recovering, a treatment working, a place restored, a person helped, a discovery made, a record set in kindness or endurance. Spread them across different countries and different subjects; five variations on one theme is a worse column than three unrelated stories.

What does not count: opinion pieces, "study suggests", product launches, celebrity news, anything political or contested, anything with a victim in it, and anything whose good part is only that something bad stopped.

For each story write:
- headline: ${DG_FIELDS['news.headline'].guidance}
- description: ${DG_FIELDS['news.description'].guidance}
- location: "City, Country" or just the country — where it happened. Empty string if it happened nowhere in particular.
- ${SCENE_RULE}

${PROVENANCE_RULES}

If you cannot find ${count} that are real, recent and genuinely good, return fewer. Returning an empty list is a correct answer and is better than filling the column.`,
    schema: NEWS_SCHEMA,
  };

  const { raw, citations, debug } = await retrieve('good news', prompt, 6000, {
    maxResults: 10,
    includeDomains: GOOD_NEWS_OUTLETS,
    searchPrompt: `Good news published in the week ending ${date}.`,
  });

  const mapped = raw.map((r): RetrievedNews => ({
    headline: trimmed(r.headline, 500),
    description: trimmed(r.description, 5000),
    location: trimmed(r.location, 200),
    scene: trimmed(r.scene, 2000),
    ...provenanceOf(r, citations),
  }));

  const { items, dropped } = sift(mapped, (i) => (
    !i.headline ? 'an item with no headline'
      : !i.description ? `“${i.headline}” — no story text`
        : null));

  return { items, citations, discarded: dropped.length, debug: withOutcome(debug, items.length, dropped) };
}

// ── On This Day (R4.5, R4.19) ────────────────────────────────────────────────

const EVENTS_SCHEMA = obj({
  items: arrayOf(obj({
    year: num,
    headline: str,
    story: str,
    location: str,
    scene: str,
    ...PROVENANCE_PROPS,
  })),
});

/**
 * One ask per month-day, scoped to the rolling twenty-year band (R4.5).
 *
 * `exclusions` are the events the day already holds, so a second ask proposes
 * different things rather than the same five again (the pattern
 * `suggestPersons` established for people). Nothing already in the table seeds
 * the *content* of the prompt — there is no source-note step; exclusions are a
 * list of what not to repeat, not a brief to elaborate on.
 *
 * The band is what gets asked about, never what stays: a published 2007 event
 * survives the window moving past it (R4.3).
 */
export async function retrieveHistory(
  monthDay: string,
  from: number,
  to: number,
  exclusions: string[],
  count: number,
): Promise<Retrieval<RetrievedEvent>> {
  const [mm, dd] = monthDay.split('-').map(Number);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayName = `${dd} ${MONTHS[mm - 1]}`;

  const avoid = exclusions.length
    ? `\n\nThe day already covers these — propose different events:\n${exclusions.map((e) => `- ${e}`).join('\n')}`
    : '';

  const prompt: ChatPrompt = {
    system: DG_VOICE,
    user: `Find up to ${count} things that happened on ${dayName} **in the years ${from} to ${to}**, worth telling a child of seven.

TWO HARD RULES, and an event that breaks either one is worse than no event at all:

1. The year must be between ${from} and ${to} inclusive. This is a section about the *recent* past — the twenty years a child can step back through, most of them within their parents' memory. Anything older is somebody else's job: a separate "Greatest Moments" section covers all of history, so the moon landing, the fall of the Berlin Wall and the signing of Magna Carta are already handled and will be thrown away if you return them here. Do not reach for the famous anniversary; reach for ${from}-${to}.
2. The date must be exactly ${dayName} — not the day before, not "that week", and not the anniversary of something older being commemorated on this day. A wrong date is the failure that matters most, because the whole section is keyed by it. Verify the day against the source before you include an event.

Good candidates, all from ${from}-${to}: a discovery announced, a spacecraft arriving, a species brought back, a record broken, a building or park opened, a treaty signed to protect something, a piece of music or a film first heard or seen. Spread them across different years where you can; several events in one year is fine too.

Not candidates: wars, attacks, disasters, crashes, deaths, anything where the story needs a victim to make sense. A year with nothing worth telling a seven-year-old should simply be left out.

For each event write:
- year: the four-digit year, as a number. **Between ${from} and ${to} inclusive — check this number before you write it.** If the event you have in mind is older than ${from}, leave it out rather than adjusting the year.
- headline: ${DG_FIELDS['event.headline'].guidance}
- story: ${DG_FIELDS['event.story'].guidance}
- location: "City, Country" or the country — empty string if it happened in space or nowhere in particular.
- ${SCENE_RULE}

${PROVENANCE_RULES}${avoid}`,
    schema: EVENTS_SCHEMA,
  };

  const { raw, citations, debug } = await retrieve('events', prompt, 8000, {
    maxResults: 10,
    searchPrompt: `Notable events that happened on ${dayName} between ${from} and ${to}, recent years only.`,
  });

  const mapped = raw.map((r): RetrievedEvent => ({
    year: Number(r.year),
    headline: trimmed(r.headline, 500),
    story: trimmed(r.story, 10000),
    location: trimmed(r.location, 200),
    scene: trimmed(r.scene, 2000),
    ...provenanceOf(r, citations),
  }));

  // Out-of-band years are dropped rather than filed: the band is exactly what
  // this ask covers, and a 1969 row landing here belongs to Greatest Moments.
  // Each drop is named, because "nothing came back" and "everything came back
  // from the wrong century" need different answers from the admin.
  const { items, dropped } = sift(mapped, (i) => (
    !i.headline ? 'an item with no headline'
      : !i.story ? `“${i.headline}” — no story text`
        : !Number.isInteger(i.year) ? `“${i.headline}” — unusable year`
          : i.year < from || i.year > to
            ? `${i.year} “${i.headline}” — outside ${from}–${to}, so it belongs to Greatest Moments`
            : null));

  return { items, citations, discarded: dropped.length, debug: withOutcome(debug, items.length, dropped) };
}

// ── Greatest Moments (R4.14, R4.17, R4.18) ───────────────────────────────────

const MOMENTS_SCHEMA = obj({
  items: arrayOf(obj({
    year: num,
    headline: str,
    story: str,
    scene: str,
    ...PROVENANCE_PROPS,
  })),
});

/**
 * The most important things that ever happened on a month-day — all of history,
 * BC included (R4.10).
 *
 * Year drift is this content type's standard failure, which is why the prompt
 * insists on the year coming from the source and why the review panel puts the
 * year next to the citation rather than under it.
 */
export async function retrieveMoments(
  monthDay: string,
  count: number,
  exclusions: string[],
): Promise<Retrieval<RetrievedMoment>> {
  const [mm, dd] = monthDay.split('-').map(Number);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayName = `${dd} ${MONTHS[mm - 1]}`;

  const avoid = exclusions.length
    ? `\n\nThe ladder already holds these — propose different moments:\n${exclusions.map((e) => `- ${e}`).join('\n')}`
    : '';

  const prompt: ChatPrompt = {
    system: DG_VOICE,
    user: `Propose ${count} of the most important things that have ever happened on ${dayName}, in any year of recorded history.

Any year at all: ancient, medieval, modern. Give a BC year as a negative number (411 BC is -411). The date must be exactly ${dayName}, and the year must come from the source rather than from memory — a moment filed under the wrong year is the failure this content type makes most often.

Reach for the things a family would be glad to know happened on their day: a discovery, a first flight, a piece of music performed, a treaty of peace, a monument raised, a voyage begun, a right won. Nothing frightening and nothing built on a catastrophe.

For each moment write:
- year: a number; negative for BC.
- headline: ${DG_FIELDS['moment.headline'].guidance}
- story: ${DG_FIELDS['moment.story'].guidance}
- ${SCENE_RULE}

${PROVENANCE_RULES}${avoid}`,
    schema: MOMENTS_SCHEMA,
  };

  const { raw, citations, debug } = await retrieve('moments', prompt, 8000, {
    maxResults: 10,
    searchPrompt: `The most historically significant events that occurred on ${dayName}, any year.`,
  });

  const mapped = raw.map((r): RetrievedMoment => ({
    year: Number(r.year),
    headline: trimmed(r.headline, 500),
    story: trimmed(r.story, 10000),
    scene: trimmed(r.scene, 2000),
    ...provenanceOf(r, citations),
  }));

  const { items, dropped } = sift(mapped, (i) => (
    !i.headline ? 'an item with no headline'
      : !i.story ? `“${i.headline}” — no story text`
        // Year 0 does not exist in the calendar these years are counted in, so
        // it is always a parse failure rather than a real date.
        : !Number.isInteger(i.year) || i.year === 0 ? `“${i.headline}” — unusable year`
          : null));

  return { items, citations, discarded: dropped.length, debug: withOutcome(debug, items.length, dropped) };
}

// ── The daily quote (§8.3) ───────────────────────────────────────────────────

const QUOTE_SCHEMA = obj({
  items: arrayOf(obj({ quote: str, author: str, ...PROVENANCE_PROPS })),
});

/**
 * Retrieve one quotation *and its attribution* — the attribution being the
 * point. Misattribution is the most common generation failure of all, and the
 * bar happily rotates ten curated quotes instead, so an unverifiable result
 * here is left for the admin rather than written in.
 */
export async function retrieveQuote(date: string, exclusions: string[] = []): Promise<Retrieval<RetrievedQuote>> {
  const avoid = exclusions.length
    ? `\n\nRecent editions already used these — choose something else:\n${exclusions.map((e) => `- ${e}`).join('\n')}`
    : '';

  const prompt: ChatPrompt = {
    system: DG_VOICE,
    user: `Find one short quotation for the ${date} edition of Daily Gold's inspiration bar.

${DG_FIELDS.daily_quote.guidance}

It must be genuinely that person's words. Check the wording against a source that actually quotes them — most quotations that circulate online are misattributed, and the attribution is the part a parent will be embarrassed by. If the best you can do is "widely attributed to", leave it out and return an empty list.

- quote: the words, without quotation marks.
- author: the person's name as a family would recognise it.

${PROVENANCE_RULES}${avoid}`,
    schema: QUOTE_SCHEMA,
  };

  const { raw, citations, debug } = await retrieve('quote', prompt, 2000, {
    maxResults: 6,
    searchPrompt: 'A verified quotation with its original source.',
  });

  const mapped = raw.map((r): RetrievedQuote => ({
    quote: trimmed(r.quote, 1000),
    author: trimmed(r.author, 200),
    ...provenanceOf(r, citations),
  }));

  const { items, dropped } = sift(mapped, (i) => (
    !i.quote ? 'an empty quote'
      : !i.author ? `“${i.quote.slice(0, 40)}…” — no attribution` : null));

  return { items, citations, discarded: dropped.length, debug: withOutcome(debug, items.length, dropped) };
}
