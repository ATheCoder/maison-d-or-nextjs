'use server';

/**
 * The parent observatory's read side (docs/parent-observatory-spec.md §2, §5).
 *
 * This is the mirror image of the analytics *write* trust model. Ingest never
 * accepts a child id — the client reports what, never who. Here a guardian
 * legitimately names a child, because they are looking at a dashboard and the
 * app cannot guess which one. So `childProfileId` is the one sanctioned
 * client-supplied child id in the codebase (auth-plan §1), and it is spent
 * immediately as a lookup key inside a family-scoped WHERE: a foreign or
 * invented id matches no row and the whole page collapses to null.
 *
 * Null is the only failure. A guardian who mistypes a URL, a child profile that
 * was just deleted and a database that is down all return the same value, and
 * the page turns that into a redirect back to the index. Nothing here raises —
 * a sibling contract test asserts that statically, over the raw source.
 *
 * `getActiveChild` is deliberately absent. This is a parent surface reached
 * *from* a child's page; if it read the session's active child, opening the
 * observatory from Rhaenyra's paper would silently pin it to Rhaenyra even
 * after a guardian clicked Darius.
 */
import {
  and, asc, count, countDistinct, desc, eq, gt, gte, inArray, isNotNull, lt, max, ne, or, sql,
} from 'drizzle-orm';
import { db } from '@/src/db';
import {
  analyticsEvent, childProfile, flagSeal, goodNewsItem, remarkablePerson,
} from '@/src/db/schema';
import { requireFamily } from '@/lib/dal';
import {
  daysBetweenKeys, lastNDayKeys, safeTimeZone, shortDateForKey, startOfZonedDay,
  weekRangeLabel, zonedDayKey,
} from '@/lib/family-time';
import {
  EDITION_PAPER_SECTIONS, FIRST_EVER_WINDOW_DAYS, FLAG_MILESTONE_LIMIT, GOOD_NEWS_DISPLAY_LIMIT,
  HIDDEN_SECTIONS, MONTH_DAYS, RECAP_DAY_LIMIT, RHYTHM_MIN_ENGAGED_MS, RHYTHM_MIN_SPANS, TOP_CONTENT_LIMIT, WEEK_DAYS,
} from '@/lib/observatory/constants';
import {
  buildShelf, buildWeekBars, conversationStarters, editionStreak, foldBands, milestoneFeed,
  recapBreakdown, rhythmSentence, sectionLabel, sessionSpans, typicalSession,
  type Milestone, type RhythmBand, type ShelfBook, type Starter, type WeekBar,
} from '@/lib/observatory/derive';
import { shareOf, toMinutes } from '@/lib/observatory/format';

export type ObservatoryChild = { id: string; displayName: string; avatar: string };

export type SectionMeter = { section: string; label: string; ms: number; minutes: number; share: number };

export type ObservatoryData = {
  child: ObservatoryChild;
  timezone: string;
  todayKey: string;
  week: {
    bars: WeekBar[];
    totalMs: number;
    sections: SectionMeter[];
    editionsOpened: number;
    streak: number;
  };
  rhythm: { bands: RhythmBand[]; sentence: string } | null;
  themes: {
    sections: SectionMeter[];
    // `ms` travels alongside `minutes` so the card can say "under a minute"
    // rather than rebuilding a duration from an already-rounded figure.
    topContent: { key: string; label: string; ms: number; minutes: number; opens: number }[];
  };
  bookshelf: ShelfBook[];
  milestones: Milestone[];
  recap: {
    availableDays: { day: string; label: string }[];
    selected: {
      day: string;
      visited: number;
      total: number;
      opened: { key: string; label: string; ms: number; minutes: number }[];
    } | null;
  };
  starters: Starter[];
};

/**
 * The masthead's stage: the child pills and the week line.
 *
 * This is the fast half of the page — one indexed read plus date arithmetic —
 * and it is what ObservatoryLedger streams first, so the switcher shows every
 * child while the heavy per-child read below is still running. `weekLabel` is
 * computed here rather than carried on ObservatoryData precisely so the
 * masthead does not have to wait for that read.
 */
export async function getObservatoryIndex(): Promise<{ children: ObservatoryChild[]; weekLabel: string }> {
  const { family: fam } = await requireFamily('/parent-observatory');
  const tz = safeTimeZone(fam.timezone);
  const weekKeys = lastNDayKeys(tz, WEEK_DAYS, new Date());
  const weekLabel = weekRangeLabel(weekKeys[0], weekKeys[weekKeys.length - 1]);
  try {
    const rows = await db
      .select({ id: childProfile.id, displayName: childProfile.displayName, avatar: childProfile.avatar })
      .from(childProfile)
      .where(eq(childProfile.familyId, fam.id))
      .orderBy(asc(childProfile.createdAt));
    return { children: rows, weekLabel };
  } catch (error) {
    console.error('observatory: index read failed', error);
    return { children: [], weekLabel };
  }
}

/**
 * One child's observatory, or null.
 *
 * Note the shape of the first ten lines: `requireFamily` and the ownership
 * check run *outside* the try. `redirect()` works by throwing NEXT_REDIRECT
 * (Next 16 `redirect` reference), so a catch-all around the guardian gate would
 * swallow it — a child-mode session would silently fall through to `null`, the
 * page would bounce it to the index, and the index would bounce it back. The
 * try starts only once authorization has already succeeded.
 */
export async function getObservatory(
  childProfileId: string,
  editionDate?: string,
): Promise<ObservatoryData | null> {
  const target = String(childProfileId ?? '');
  const { family: fam } = await requireFamily(`/parent-observatory/${encodeURIComponent(target)}`);

  // The verification. `familyId` is compared, never accepted: an id belonging to
  // another household matches nothing here and is indistinguishable from a typo.
  const owned = await db
    .select({ id: childProfile.id, displayName: childProfile.displayName, avatar: childProfile.avatar })
    .from(childProfile)
    .where(and(eq(childProfile.id, target), eq(childProfile.familyId, fam.id)))
    .limit(1);
  const child = owned[0];
  if (!child) return null;

  try {
    const tz = safeTimeZone(fam.timezone);
    const now = new Date();
    const todayKey = zonedDayKey(tz, now);
    const weekKeys = lastNDayKeys(tz, WEEK_DAYS, now);
    const weekStart = startOfZonedDay(tz, now, -(WEEK_DAYS - 1));
    const monthStart = startOfZonedDay(tz, now, -(MONTH_DAYS - 1));

    // Day and hour buckets are computed where the rows are; `tz` binds as a
    // parameter, so a zone name can never reach the query as text.
    const dwellMs = sql<string>`coalesce(sum(${analyticsEvent.durationMs}), 0)`;
    const tzDay = sql<string>`((${analyticsEvent.occurredAt} at time zone ${tz})::date)::text`;
    const tzHour = sql<number>`extract(hour from ${analyticsEvent.occurredAt} at time zone ${tz})::int`;
    const tzDays = sql<number>`count(distinct ((${analyticsEvent.occurredAt} at time zone ${tz})::date))`;
    /**
     * Group by output ordinal, not by repeating the bucket expression.
     *
     * Drizzle renders the same fragment differently in the two clauses — the
     * column is unqualified in SELECT but qualified in GROUP BY, and `tz` binds
     * to a *different* placeholder each time ($1 vs $6). Postgres compares
     * grouping expressions structurally, so two distinct parameters never match
     * and it rejects the query with "occurred_at must appear in the GROUP BY
     * clause". The ordinal refers to the already-computed first output column,
     * which is what was meant all along.
     */
    const byFirstColumn = sql`1`;

    /**
     * Engaged time: section dwell plus story-page dwell.
     *
     * Cross-reference: this MUST stay identical to the totalMs computed in
     * app/analytics/actions.ts:317-318, including the exclusion of
     * `content_close` — a modal opened from a section accumulates inside that
     * section's own dwell, so counting it again would double the minutes. With
     * the same predicate, the same timezone boundary and the same rounding,
     * today's bar here equals the child card's "Today's Exploration" by
     * construction rather than by coincidence.
     */
    const engaged = or(
      and(eq(analyticsEvent.eventType, 'section_view'), isNotNull(analyticsEvent.section)),
      and(eq(analyticsEvent.eventType, 'story_page_view'), isNotNull(analyticsEvent.contentId)),
    );
    const mine = eq(analyticsEvent.childId, child.id);

    const [
      weekDayRows, weekSectionRows, weekEditionRows,
      hourRows, sessionRows, monthSectionRows, topContentRows,
      storyPageRows, storyTitleRows, storyFinishedRows,
      flagRows, firstSectionRows, editionDayRows,
    ] = await Promise.all([
      // ── F1 ────────────────────────────────────────────────────────────────
      db.select({ day: tzDay, dwell: dwellMs })
        .from(analyticsEvent)
        .where(and(mine, gte(analyticsEvent.occurredAt, weekStart), engaged))
        .groupBy(byFirstColumn),

      db.select({ section: analyticsEvent.section, dwell: dwellMs })
        .from(analyticsEvent)
        .where(and(
          mine, gte(analyticsEvent.occurredAt, weekStart),
          eq(analyticsEvent.eventType, 'section_view'), isNotNull(analyticsEvent.section),
        ))
        .groupBy(analyticsEvent.section)
        .orderBy(desc(dwellMs)),

      db.select({ editions: countDistinct(analyticsEvent.editionDate) })
        .from(analyticsEvent)
        .where(and(mine, gte(analyticsEvent.occurredAt, weekStart), isNotNull(analyticsEvent.editionDate))),

      // ── F2 ────────────────────────────────────────────────────────────────
      db.select({ hour: tzHour, dwell: dwellMs })
        .from(analyticsEvent)
        .where(and(mine, gte(analyticsEvent.occurredAt, monthStart), engaged))
        .groupBy(byFirstColumn),

      // The one place raw timestamps are read. They are folded into span
      // lengths below and never reach the DTO — no per-event time is ever
      // shown to a parent (spec §6.4). Newest-first with a cap, because a
      // rhythm is about recent habit and the row budget allows 5 000 a day.
      db.select({ type: analyticsEvent.eventType, at: analyticsEvent.occurredAt })
        .from(analyticsEvent)
        .where(and(
          mine, gte(analyticsEvent.occurredAt, monthStart),
          inArray(analyticsEvent.eventType, ['session_resume', 'session_pause']),
        ))
        .orderBy(desc(analyticsEvent.occurredAt))
        .limit(3000),

      // ── F3 ────────────────────────────────────────────────────────────────
      db.select({ section: analyticsEvent.section, dwell: dwellMs })
        .from(analyticsEvent)
        .where(and(
          mine, gte(analyticsEvent.occurredAt, monthStart),
          eq(analyticsEvent.eventType, 'section_view'), isNotNull(analyticsEvent.section),
        ))
        .groupBy(analyticsEvent.section)
        .orderBy(desc(dwellMs)),

      // Stories are excluded — they have the bookshelf, and listing a book here
      // too would read as two different activities (the reference read makes
      // the same exclusion, app/analytics/actions.ts:218-223).
      db.select({
        contentType: analyticsEvent.contentType,
        contentId: analyticsEvent.contentId,
        label: max(analyticsEvent.label),
        dwell: dwellMs,
        opens: count(),
      })
        .from(analyticsEvent)
        .where(and(
          mine, gte(analyticsEvent.occurredAt, monthStart),
          eq(analyticsEvent.eventType, 'content_close'),
          isNotNull(analyticsEvent.contentType), isNotNull(analyticsEvent.contentId),
          ne(analyticsEvent.contentType, 'story'),
        ))
        .groupBy(analyticsEvent.contentType, analyticsEvent.contentId)
        .orderBy(desc(dwellMs))
        .limit(TOP_CONTENT_LIMIT),

      // ── F4 · the whole retained history, not a window ─────────────────────
      // A book read over three weeks is one book; a 30-day cut would show it as
      // half-read forever. A story page's `label` is its page number, so
      // distinct labels are distinct pages.
      db.select({
        contentId: analyticsEvent.contentId,
        pagesRead: countDistinct(analyticsEvent.label),
        dwell: dwellMs,
        sittings: tzDays,
        lastDay: sql<string>`max((${analyticsEvent.occurredAt} at time zone ${tz})::date)::text`,
      })
        .from(analyticsEvent)
        .where(and(mine, eq(analyticsEvent.eventType, 'story_page_view'), isNotNull(analyticsEvent.contentId)))
        .groupBy(analyticsEvent.contentId),

      // Page events cannot carry a title; open and close both can, so a book
      // abandoned mid-read is still named.
      db.select({ contentId: analyticsEvent.contentId, label: max(analyticsEvent.label) })
        .from(analyticsEvent)
        .where(and(
          mine, inArray(analyticsEvent.eventType, ['content_open', 'content_close']),
          eq(analyticsEvent.contentType, 'story'), isNotNull(analyticsEvent.contentId),
        ))
        .groupBy(analyticsEvent.contentId),

      db.select({
        contentId: analyticsEvent.contentId,
        day: sql<string>`min((${analyticsEvent.occurredAt} at time zone ${tz})::date)::text`,
      })
        .from(analyticsEvent)
        .where(and(mine, eq(analyticsEvent.eventType, 'story_finished'), isNotNull(analyticsEvent.contentId)))
        .groupBy(analyticsEvent.contentId),

      // ── F5 ────────────────────────────────────────────────────────────────
      // flag_seal is the durable source of truth for earns (analytics plan §2),
      // and this child is already family-verified above.
      db.select({ countryName: flagSeal.countryName, day: flagSeal.firstEarnedDate })
        .from(flagSeal)
        .where(eq(flagSeal.childId, child.id))
        .orderBy(desc(flagSeal.firstEarnedDate))
        .limit(FLAG_MILESTONE_LIMIT),

      db.select({
        section: analyticsEvent.section,
        day: sql<string>`min((${analyticsEvent.occurredAt} at time zone ${tz})::date)::text`,
      })
        .from(analyticsEvent)
        .where(and(mine, eq(analyticsEvent.eventType, 'section_view'), isNotNull(analyticsEvent.section)))
        .groupBy(analyticsEvent.section),

      // Feeds both the streak (needs the whole chain) and the recap's day list.
      db.selectDistinct({ day: analyticsEvent.editionDate })
        .from(analyticsEvent)
        .where(and(mine, isNotNull(analyticsEvent.editionDate)))
        .orderBy(desc(analyticsEvent.editionDate))
        .limit(400),
    ]);

    // ── F1 ──────────────────────────────────────────────────────────────────
    const bars = buildWeekBars(
      weekKeys,
      weekDayRows.map((row) => ({ day: row.day, ms: Number(row.dwell ?? 0) })),
      todayKey,
    );
    const weekTotalMs = bars.reduce((sum, bar) => sum + bar.ms, 0);
    const weekSections = toMeters(weekSectionRows);
    const editionDays = editionDayRows.flatMap((row) => (row.day ? [row.day] : []));
    const streak = editionStreak(editionDays, todayKey);

    // ── F2 ──────────────────────────────────────────────────────────────────
    const spans = sessionSpans(sessionRows.map((row) => ({
      type: row.type as 'session_resume' | 'session_pause',
      at: row.at.getTime(),
    })));
    const monthEngagedMs = hourRows.reduce((sum, row) => sum + Number(row.dwell ?? 0), 0);
    const { bands, topPhrase } = foldBands(
      hourRows.map((row) => ({ hour: Number(row.hour ?? 0), ms: Number(row.dwell ?? 0) })),
    );
    // Below either threshold there is no habit yet, only noise dressed as one.
    const sentence = spans.length >= RHYTHM_MIN_SPANS && monthEngagedMs >= RHYTHM_MIN_ENGAGED_MS
      ? rhythmSentence(child.displayName, typicalSession(spans), topPhrase)
      : null;

    // ── F3 ──────────────────────────────────────────────────────────────────
    const monthSections = toMeters(monthSectionRows);
    const topContent = topContentRows.flatMap((row) => {
      const label = row.label?.trim();
      if (!row.contentId || !label) return [];
      return [{
        key: `${row.contentType}:${row.contentId}`,
        label,
        ms: Number(row.dwell ?? 0),
        minutes: toMinutes(Number(row.dwell ?? 0)),
        opens: Number(row.opens ?? 0),
      }];
    });

    // ── F4 ──────────────────────────────────────────────────────────────────
    const storyTitles = new Map(storyTitleRows.flatMap((row) => (
      row.contentId ? [[row.contentId, row.label] as const] : []
    )));
    const finishedDays = new Map(storyFinishedRows.flatMap((row) => (
      row.contentId && row.day ? [[row.contentId, row.day] as const] : []
    )));
    /**
     * The book covers, keyed by the very slug the reading events already carry
     * (`remarkablePerson.slug` is the story's identity, StorybookView:79).
     *
     * A second round trip rather than a join, because the shelf's slugs aren't
     * known until the grouped read above returns, and it is bounded by how many
     * books one child has ever opened. `published` is deliberately not filtered:
     * the row is already naming the book from the child's own history, and
     * showing a title with its cover blanked would only look broken.
     */
    const storySlugs = [...new Set(storyPageRows.flatMap((row) => (row.contentId ? [row.contentId] : [])))];
    const covers = new Map(storySlugs.length === 0 ? [] : (
      await db
        .select({ slug: remarkablePerson.slug, imageUrl: remarkablePerson.imageUrl })
        .from(remarkablePerson)
        .where(inArray(remarkablePerson.slug, storySlugs))
    ).flatMap((row) => (row.imageUrl ? [[row.slug, row.imageUrl] as const] : [])));
    const bookshelf = buildShelf(
      storyPageRows.flatMap((row) => (row.contentId && row.lastDay ? [{
        storyId: row.contentId,
        title: storyTitles.get(row.contentId) ?? null,
        pagesReached: Number(row.pagesRead ?? 0),
        sittings: Number(row.sittings ?? 0),
        ms: Number(row.dwell ?? 0),
        lastDay: row.lastDay,
        finishedDay: finishedDays.get(row.contentId) ?? null,
        coverUrl: covers.get(row.contentId) ?? null,
      }] : [])),
      todayKey,
    );

    // ── F5 ──────────────────────────────────────────────────────────────────
    const milestones = milestoneFeed({
      todayKey,
      flags: flagRows.map((row) => ({ countryName: row.countryName, day: row.day })),
      finishedStories: bookshelf
        .filter((book) => book.state === 'finished')
        .flatMap((book) => {
          const day = finishedDays.get(book.storyId);
          return day ? [{ title: book.title, day }] : [];
        }),
      // Only recent first-evers. The 12-month purge can delete the rows that
      // proved an old section was visited, which would let it resurface as
      // "first" years later; a 30-day window makes that impossible (plan §8).
      firstSections: firstSectionRows.flatMap((row) => (
        row.section && row.day
          && !HIDDEN_SECTIONS.includes(row.section)
          && daysBetweenKeys(row.day, todayKey) <= FIRST_EVER_WINDOW_DAYS
          ? [{ section: row.section, day: row.day }]
          : []
      )),
      streak,
    });

    // ── F6 · second phase, because the day list decides what to ask for ─────
    const availableDays = editionDays.slice(0, RECAP_DAY_LIMIT);
    const requested = typeof editionDate === 'string' ? editionDate : '';
    const selectedDay = availableDays.includes(requested) ? requested : availableDays[0] ?? null;

    let recapSelected: ObservatoryData['recap']['selected'] = null;
    if (selectedDay) {
      const [recapContentRows, recapSectionRows, goodNewsRows] = await Promise.all([
        db.select({
          contentType: analyticsEvent.contentType,
          contentId: analyticsEvent.contentId,
          label: max(analyticsEvent.label),
          dwell: dwellMs,
        })
          .from(analyticsEvent)
          .where(and(
            mine, eq(analyticsEvent.eventType, 'content_close'),
            eq(analyticsEvent.editionDate, selectedDay), isNotNull(analyticsEvent.contentId),
          ))
          .groupBy(analyticsEvent.contentType, analyticsEvent.contentId)
          .orderBy(desc(dwellMs))
          .limit(8),

        // `durationMs > 0` because a section scrolled past in under a second was
        // not visited; the collector already discards those segments.
        db.selectDistinct({ section: analyticsEvent.section })
          .from(analyticsEvent)
          .where(and(
            mine, eq(analyticsEvent.eventType, 'section_view'),
            eq(analyticsEvent.editionDate, selectedDay),
            gt(analyticsEvent.durationMs, 0), isNotNull(analyticsEvent.section),
          )),

        // Was there a Good News column in that day's paper at all?
        db.select({ id: goodNewsItem.id })
          .from(goodNewsItem)
          .where(and(
            eq(goodNewsItem.date, selectedDay),
            eq(goodNewsItem.published, true),
            lt(goodNewsItem.position, GOOD_NEWS_DISPLAY_LIMIT),
          ))
          .limit(1),
      ]);

      const printed = goodNewsRows.length > 0
        ? [...EDITION_PAPER_SECTIONS]
        : EDITION_PAPER_SECTIONS.filter((section) => section !== 'good_news');
      const breakdown = recapBreakdown(
        printed,
        recapSectionRows.flatMap((row) => (row.section ? [row.section] : [])),
      );

      recapSelected = {
        day: selectedDay,
        visited: breakdown.visited,
        total: breakdown.total,
        opened: recapContentRows.flatMap((row) => {
          if (!row.contentId) return [];
          // A story's close event carries no label, so its title comes from the
          // open/close pair collected for the bookshelf.
          const label = (row.contentType === 'story'
            ? storyTitles.get(row.contentId) ?? row.label
            : row.label)?.trim();
          if (!label) return [];
          const ms = Number(row.dwell ?? 0);
          return [{ key: `${row.contentType}:${row.contentId}`, label, ms, minutes: toMinutes(ms) }];
        }),
      };
    }

    return {
      child,
      timezone: tz,
      todayKey,
      week: {
        bars,
        totalMs: weekTotalMs,
        sections: weekSections,
        editionsOpened: Number(weekEditionRows[0]?.editions ?? 0),
        streak,
      },
      rhythm: sentence ? { bands, sentence } : null,
      themes: { sections: monthSections, topContent },
      bookshelf,
      milestones,
      recap: {
        availableDays: availableDays.map((day) => ({ day, label: shortDateForKey(day) })),
        selected: recapSelected,
      },
      starters: conversationStarters({
        name: child.displayName,
        topContent,
        shelf: bookshelf,
        flags: flagRows.map((row) => ({ countryName: row.countryName, day: row.day })),
      }),
    };
  } catch (error) {
    console.error('observatory: read failed', error);
    return null;
  }
}

/**
 * Grouped section dwell → meter rows, longest first.
 *
 * Groups summing to zero are dropped: the collector discards sub-second
 * segments, so a zero here is a leftover instantaneous row rather than a
 * section the child sat with, and showing it as "under a minute" would promote
 * noise to attention.
 */
function toMeters(rows: readonly { section: string | null; dwell: unknown }[]): SectionMeter[] {
  const parsed = rows.flatMap((row) => (
    row.section && !HIDDEN_SECTIONS.includes(row.section)
      ? [{ section: row.section, ms: Number(row.dwell ?? 0) }]
      : []
  )).filter((row) => row.ms > 0);
  const total = parsed.reduce((sum, row) => sum + row.ms, 0);
  return parsed.map((row) => ({
    section: row.section,
    label: sectionLabel(row.section),
    ms: row.ms,
    minutes: toMinutes(row.ms),
    share: shareOf(row.ms, total),
  }));
}
