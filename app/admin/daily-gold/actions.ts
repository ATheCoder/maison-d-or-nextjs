'use server';
/**
 * The Daily Gold desk (Phase 4). Its job is to answer "what is missing, and
 * what is missing *soonest*" — so every number here is expressed in the
 * reader's terms: what a family will actually see on a given date.
 *
 * Two keying schemes run through this file and must not be conflated (§2.1):
 * `daily_gold_edition` and `good_news_item` are pinned to a calendar date and
 * perish; `on_this_day_event`, `greatest_moment` and a person's birth month-day
 * recur every year. The desk shows both because a family sees both on one page,
 * but they are counted, coloured and linked separately.
 *
 * The desk **creates and navigates. It never generates** — drafting a day is an
 * act inside that day's editor, where its cost is visible (§8.2).
 */
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/src/db';
import {
  dailyGoldEdition,
  goodNewsItem,
  greatestMoment,
  onThisDayEvent,
  remarkablePerson,
  type DailyGoldEditionRow,
} from '@/src/db/schema';
import { requireAdmin } from '@/lib/dal';
import { resolveLocation } from '@/lib/countries';

export type EditionStatus = DailyGoldEditionRow['status'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Today as 'YYYY-MM-DD', in the same UTC terms the reader resolves its date.
 * Not exported — a 'use server' module may only export async functions, and the
 * desk receives today's date as a prop from its server page instead.
 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Date string arithmetic in UTC, so a DST boundary can't drop or repeat a day. */
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** A deterministic id for rows this admin creates, distinct from Base44's hex ids. */
const draftId = (date: string) => `dg-${date}`;

// ── Coverage ─────────────────────────────────────────────────────────────────

/** One calendar date that holds perishable content (R2.2). */
export type DeskDate = {
  date: string;
  destination: string | null;
  /** Resolved from the destination text — the flag seal a family would earn. */
  iso2: string | null;
  status: EditionStatus | null;
  /** More than one row is the 6 June defect: the reader silently picks one (D3). */
  editionCount: number;
  publishedNews: number;
  draftNews: number;
  /** Position 0 is the lead: its missing image is a real defect, row 9's is not. */
  leadHasImage: boolean;
};

/** One month-day of recurring content — a cell in the 366-day grid (R2.3). */
export type AlmanacCell = {
  monthDay: string;
  /** Distinct years that hold at least one published event. */
  historyYears: number;
  momentsFilled: number;
  peopleCount: number;
};

export type DeskCoverage = {
  dates: DeskDate[];
  almanac: AlmanacCell[];
  liveDates: number;
  newestLiveDate: string | null;
  almanacDaysCovered: number;
  peopleMissingCountryCode: number;
  peopleTotal: number;
};

/**
 * Everything the desk renders, in five grouped queries. The tables are small
 * (tens of editions, hundreds of rows) so this is one round of aggregates
 * rather than anything paginated.
 */
export async function getDeskCoverage(): Promise<DeskCoverage> {
  await requireAdmin();

  const [editions, news, history, moments, people] = await Promise.all([
    db
      .select({
        date: dailyGoldEdition.editionDate,
        rows: sql<number>`count(*)::int`,
        // The row a reader would get: newest by createdAt.
        destination: sql<string | null>`(array_agg(${dailyGoldEdition.destinationCountry} order by ${dailyGoldEdition.createdAt} desc, ${dailyGoldEdition.id} desc))[1]`,
        status: sql<EditionStatus>`(array_agg(${dailyGoldEdition.status} order by ${dailyGoldEdition.createdAt} desc, ${dailyGoldEdition.id} desc))[1]`,
      })
      .from(dailyGoldEdition)
      .groupBy(dailyGoldEdition.editionDate),

    db
      .select({
        date: goodNewsItem.date,
        published: sql<number>`count(*) filter (where ${goodNewsItem.published})::int`,
        drafts: sql<number>`count(*) filter (where not ${goodNewsItem.published})::int`,
        leadHasImage: sql<boolean>`coalesce(bool_or(${goodNewsItem.position} = 0 and ${goodNewsItem.published} and coalesce(${goodNewsItem.imageUrl}, '') <> ''), false)`,
      })
      .from(goodNewsItem)
      .groupBy(goodNewsItem.date),

    db
      .select({
        monthDay: onThisDayEvent.monthDay,
        years: sql<number>`count(distinct ${onThisDayEvent.year})::int`,
      })
      .from(onThisDayEvent)
      .where(eq(onThisDayEvent.maisonRewriteDone, true))
      .groupBy(onThisDayEvent.monthDay),

    db
      .select({
        monthDay: greatestMoment.monthDay,
        filled: sql<number>`count(*)::int`,
      })
      .from(greatestMoment)
      .where(eq(greatestMoment.published, true))
      .groupBy(greatestMoment.monthDay),

    db
      .select({
        monthDay: sql<string>`to_char(${remarkablePerson.birthDate}, 'MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(remarkablePerson)
      .where(and(eq(remarkablePerson.published, true), sql`${remarkablePerson.birthDate} is not null`))
      .groupBy(sql`to_char(${remarkablePerson.birthDate}, 'MM-DD')`),
  ]);

  const newsByDate = new Map(news.map((n) => [n.date, n]));
  const dateKeys = new Set<string>([...editions.map((e) => e.date), ...news.map((n) => n.date)]);

  const dates: DeskDate[] = [...dateKeys]
    .sort()
    .reverse()
    .map((date) => {
      const e = editions.find((x) => x.date === date);
      const n = newsByDate.get(date);
      return {
        date,
        destination: e?.destination ?? null,
        iso2: e?.destination ? resolveLocation(e.destination) : null,
        status: e?.status ?? null,
        editionCount: e?.rows ?? 0,
        publishedNews: n?.published ?? 0,
        draftNews: n?.drafts ?? 0,
        leadHasImage: n?.leadHasImage ?? false,
      };
    });

  const historyBy = new Map(history.map((h) => [h.monthDay, h.years]));
  const momentsBy = new Map(moments.map((m) => [m.monthDay, m.filled]));
  const peopleBy = new Map(people.map((p) => [p.monthDay, p.count]));

  const almanac: AlmanacCell[] = allMonthDays().map((monthDay) => ({
    monthDay,
    historyYears: historyBy.get(monthDay) ?? 0,
    momentsFilled: momentsBy.get(monthDay) ?? 0,
    peopleCount: peopleBy.get(monthDay) ?? 0,
  }));

  const liveDatesList = dates.filter((d) => d.status === 'ready').map((d) => d.date);

  const [{ missing, total }] = await db
    .select({
      missing: sql<number>`count(*) filter (where ${remarkablePerson.countryCode} is null)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(remarkablePerson);

  return {
    dates,
    almanac,
    liveDates: liveDatesList.length,
    newestLiveDate: liveDatesList.length ? liveDatesList.slice().sort().at(-1)! : null,
    almanacDaysCovered: almanac.filter((c) => c.historyYears > 0 || c.momentsFilled > 0).length,
    peopleMissingCountryCode: missing,
    peopleTotal: total,
  };
}

/** Every 'MM-DD' including 29 February — the grid is 366 cells, always. */
function allMonthDays(): string[] {
  const daysIn = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const out: string[] = [];
  for (let m = 0; m < 12; m += 1) {
    for (let d = 1; d <= daysIn[m]; d += 1) {
      out.push(`${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  }
  return out;
}

// ── The week ahead ───────────────────────────────────────────────────────────

export type WeekDay = {
  date: string;
  /** null when no edition row exists at all. */
  status: EditionStatus | null;
  publishedNews: number;
  draftNews: number;
  peopleCount: number;
  historyYears: number;
  momentsFilled: number;
  isToday: boolean;
};

/**
 * Today → +6 days in the reader's own terms (R2.1). Today being empty is the
 * loudest thing on the screen, so it is always the first cell.
 */
export async function getWeekAhead(from?: string): Promise<WeekDay[]> {
  await requireAdmin();
  const start = from && DATE_RE.test(from) ? from : today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const monthDays = days.map((d) => d.slice(5));

  const [editions, news, history, moments, people] = await Promise.all([
    db
      .select({
        date: dailyGoldEdition.editionDate,
        status: sql<EditionStatus>`(array_agg(${dailyGoldEdition.status} order by ${dailyGoldEdition.createdAt} desc, ${dailyGoldEdition.id} desc))[1]`,
      })
      .from(dailyGoldEdition)
      .where(inArray(dailyGoldEdition.editionDate, days))
      .groupBy(dailyGoldEdition.editionDate),
    db
      .select({
        date: goodNewsItem.date,
        published: sql<number>`count(*) filter (where ${goodNewsItem.published})::int`,
        drafts: sql<number>`count(*) filter (where not ${goodNewsItem.published})::int`,
      })
      .from(goodNewsItem)
      .where(inArray(goodNewsItem.date, days))
      .groupBy(goodNewsItem.date),
    db
      .select({ monthDay: onThisDayEvent.monthDay, years: sql<number>`count(distinct ${onThisDayEvent.year})::int` })
      .from(onThisDayEvent)
      .where(and(inArray(onThisDayEvent.monthDay, monthDays), eq(onThisDayEvent.maisonRewriteDone, true)))
      .groupBy(onThisDayEvent.monthDay),
    db
      .select({ monthDay: greatestMoment.monthDay, filled: sql<number>`count(*)::int` })
      .from(greatestMoment)
      .where(and(inArray(greatestMoment.monthDay, monthDays), eq(greatestMoment.published, true)))
      .groupBy(greatestMoment.monthDay),
    db
      .select({
        monthDay: sql<string>`to_char(${remarkablePerson.birthDate}, 'MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(remarkablePerson)
      .where(and(
        eq(remarkablePerson.published, true),
        // inArray, not `= any(${monthDays})`: drizzle expands a JS array in a
        // raw sql template into separate parameters, which makes `any((...))`
        // a row constructor rather than an array, and Postgres rejects it.
        inArray(sql`to_char(${remarkablePerson.birthDate}, 'MM-DD')`, monthDays),
      ))
      .groupBy(sql`to_char(${remarkablePerson.birthDate}, 'MM-DD')`),
  ]);

  const t = today();
  return days.map((date) => {
    const md = date.slice(5);
    const n = news.find((x) => x.date === date);
    return {
      date,
      status: editions.find((x) => x.date === date)?.status ?? null,
      publishedNews: n?.published ?? 0,
      draftNews: n?.drafts ?? 0,
      peopleCount: people.find((x) => x.monthDay === md)?.count ?? 0,
      historyYears: history.find((x) => x.monthDay === md)?.years ?? 0,
      momentsFilled: moments.find((x) => x.monthDay === md)?.filled ?? 0,
      isToday: date === t,
    };
  });
}

// ── Duplicates ───────────────────────────────────────────────────────────────

export type DuplicateField = { field: string; label: string; newer: string | null; older: string | null };
export type DuplicateEdition = {
  date: string;
  /** Newest first — index 0 is the row a family actually sees. */
  ids: string[];
  differing: DuplicateField[];
};

// The fields worth diffing: everything a family can see. `generated_at` and the
// timestamps are provenance, not content, so a difference there is not a
// conflict to resolve.
const COMPARED: { field: keyof DailyGoldEditionRow; label: string }[] = [
  { field: 'destinationCountry', label: 'Destination' },
  { field: 'continent', label: 'Continent' },
  { field: 'destinationDescription', label: 'Destination description' },
  { field: 'destinationImageUrl', label: 'Destination image' },
  { field: 'heroImageUrl', label: 'Masthead image' },
  { field: 'childLifeStory', label: 'A child in…' },
  { field: 'tasteOfDay', label: 'Taste of the day' },
  { field: 'soundOfDay', label: 'Sound of the day' },
  { field: 'natureDetail', label: 'Nature detail' },
  { field: 'tinyPhrase', label: 'Tiny phrase' },
  { field: 'tinyPhraseLanguage', label: 'Tiny phrase language' },
  { field: 'tinyPhraseTranslation', label: 'Tiny phrase translation' },
  { field: 'dailyQuote', label: 'Daily quote' },
  { field: 'dailyQuoteAuthor', label: 'Quote author' },
  { field: 'status', label: 'Status' },
];

/**
 * Dates holding more than one edition row, with the fields they disagree on
 * (R2.6). The reader silently takes the newest by createdAt, so without this
 * screen an older row is invisible *and* un-editable — which is exactly the
 * 6 June defect.
 */
export async function findDuplicateEditions(): Promise<DuplicateEdition[]> {
  await requireAdmin();

  const dupeDates = await db
    .select({ date: dailyGoldEdition.editionDate })
    .from(dailyGoldEdition)
    .groupBy(dailyGoldEdition.editionDate)
    .having(sql`count(*) > 1`);
  if (!dupeDates.length) return [];

  const rows = await db
    .select()
    .from(dailyGoldEdition)
    .where(inArray(dailyGoldEdition.editionDate, dupeDates.map((d) => d.date)))
    .orderBy(asc(dailyGoldEdition.editionDate), desc(dailyGoldEdition.createdAt), desc(dailyGoldEdition.id));

  const asText = (v: unknown) => (v == null || v === '' ? null : String(v));

  return dupeDates.map(({ date }) => {
    const group = rows.filter((r) => r.editionDate === date);
    const [newer, ...rest] = group;
    const differing: DuplicateField[] = [];
    for (const { field, label } of COMPARED) {
      const a = asText(newer[field]);
      // A field differs if *any* shadowed row disagrees with the visible one.
      const older = rest.map((r) => asText(r[field])).find((v) => v !== a);
      if (older !== undefined) differing.push({ field: String(field), label, newer: a, older });
    }
    return { date, ids: group.map((r) => r.id), differing };
  });
}

// ── Prepare ──────────────────────────────────────────────────────────────────
// Prepare creates a row and never writes content (R2.5). A draft edition is an
// empty shell with status 'draft', invisible to every reader until published.

/**
 * Insert a draft edition for one date if it has none, then open its editor.
 * Idempotent: a second call on a date that already has a row navigates without
 * creating a second one, because a duplicate is the defect this desk reports.
 */
export async function prepareDate(date: string): Promise<{ ok: false; error: string } | never> {
  await requireAdmin();
  if (!DATE_RE.test(date ?? '')) return { ok: false, error: 'That is not a valid date.' };

  const existing = await db
    .select({ id: dailyGoldEdition.id })
    .from(dailyGoldEdition)
    .where(eq(dailyGoldEdition.editionDate, date))
    .limit(1);

  if (!existing[0]) {
    await db
      .insert(dailyGoldEdition)
      .values({ id: draftId(date), editionDate: date, status: 'draft' })
      .onConflictDoNothing();
    revalidatePath('/admin/daily-gold');
  }
  redirect(`/admin/daily-gold/${date}`);
}

export type PrepareWeekResult = { ok: true; created: string[]; skipped: string[] } | { ok: false; error: string };

/**
 * Insert a draft for each of seven dates that has no edition row, and **skip
 * the ones that do** (R2.5) — a second row for a date silently shadows the
 * first, which is the very defect this screen reports. One transaction, and the
 * caller is told exactly what happened.
 */
export async function prepareWeek(from?: string): Promise<PrepareWeekResult> {
  await requireAdmin();
  const start = from && DATE_RE.test(from) ? from : today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const created: string[] = [];
  const skipped: string[] = [];

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ date: dailyGoldEdition.editionDate })
      .from(dailyGoldEdition)
      .where(inArray(dailyGoldEdition.editionDate, days));
    const have = new Set(existing.map((e) => e.date));

    const toInsert = days.filter((d) => !have.has(d));
    for (const d of days) (have.has(d) ? skipped : created).push(d);

    if (toInsert.length) {
      await tx
        .insert(dailyGoldEdition)
        .values(toInsert.map((d) => ({ id: draftId(d), editionDate: d, status: 'draft' as const })))
        .onConflictDoNothing();
    }
  });

  revalidatePath('/admin/daily-gold');
  return { ok: true, created, skipped };
}

/**
 * Delete one shadowed edition row by id — the "resolve" half of R2.6.
 * Refuses to delete the last row for a date: that would be deleting the day's
 * content, not resolving a duplicate.
 */
export async function deleteEditionRow(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (typeof id !== 'string' || !id.trim()) return { ok: false, error: 'Missing edition id.' };

  const rows = await db
    .select({ id: dailyGoldEdition.id, date: dailyGoldEdition.editionDate })
    .from(dailyGoldEdition)
    .where(eq(dailyGoldEdition.id, id))
    .limit(1);
  if (!rows[0]) return { ok: false, error: 'That edition no longer exists.' };

  const siblings = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(dailyGoldEdition)
    .where(eq(dailyGoldEdition.editionDate, rows[0].date));
  if ((siblings[0]?.n ?? 0) < 2) {
    return { ok: false, error: 'This is the only edition for that date — open it and edit it instead.' };
  }

  await db.delete(dailyGoldEdition).where(eq(dailyGoldEdition.id, id));
  revalidatePath('/admin/daily-gold');
  revalidatePath('/daily-gold-edition');
  return { ok: true };
}
