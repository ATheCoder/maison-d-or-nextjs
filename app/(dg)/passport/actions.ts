'use server';

/**
 * Flag-seal earn + read actions (docs/flag-seal-spec.md §5).
 *
 * The child is always resolved from the session via lib/dal.ts — no function
 * here accepts a child id, family id, or email, which is what closes the
 * legacy IDOR (spec L1/§5.3) by construction rather than by validation.
 * Earns are fire-and-forget from the client: every failure path returns
 * `{ status: 'noop' }` and never throws.
 */
import { randomUUID } from 'node:crypto';
import { desc, eq, sql, getTableColumns } from 'drizzle-orm';
import { db } from '@/src/db';
import { flagSeal, type FlagSealRow } from '@/src/db/schema';
import { getActiveChild } from '@/lib/dal';
import { COUNTRIES } from '@/lib/countries';
import { normaliseEarnInput, type FlagSource } from '@/lib/flag-seal-input';

export type EarnResult =
  | {
      status: 'new_seal' | 'already_earned';
      sealId: string;
      countryCode: string;   // normalised uppercase
      countryName: string;   // canonical name from COUNTRIES, never the caller's
      timesEarned: number;
    }
  | { status: 'noop' };      // no child mode, invalid input, or DB failure

export async function earnFlagSeal(input: {
  countryCode: string;
  countryName: string;
  source: FlagSource;
  editionDate?: string;      // 'YYYY-MM-DD'; defaults to server-side today
}): Promise<EarnResult> {
  // Non-redirecting on purpose: this is called fire-and-forget from client
  // effects, where requireChildContext()'s redirect would be wrong (§5.1).
  const child = await getActiveChild();
  if (!child) return { status: 'noop' };

  const today = new Date().toISOString().slice(0, 10);
  const earn = normaliseEarnInput(input, today);
  if (!earn.ok) {
    console.warn(`flag-seal: rejected earn (${earn.reason})`, { input: input?.countryCode, source: input?.source });
    return { status: 'noop' };
  }

  try {
    // One atomic upsert on (child_id, country_code) — no read-then-write
    // (spec R5.1). Array union, the 60-entry cap, and the distinct-day
    // increment all live in the SET clause; `excluded.*` keeps the inserted
    // values typed by their columns. timesEarned counts distinct edition
    // dates, so a repeat on an already-recorded day changes nothing but
    // sources/updatedAt.
    const [row] = await db
      .insert(flagSeal)
      .values({
        id: randomUUID(),
        childId: child.id,
        countryCode: earn.code,
        countryName: earn.displayName,
        firstEarnedDate: earn.editionDate,
        lastEarnedDate: earn.editionDate,
        timesEarned: 1,
        sources: [earn.source],
        editionDates: [earn.editionDate],
      })
      .onConflictDoUpdate({
        target: [flagSeal.childId, flagSeal.countryCode],
        set: {
          // firstEarnedDate and countryName stay as first written (R3.3/R3.4).
          lastEarnedDate: sql`greatest(${flagSeal.lastEarnedDate}, excluded.last_earned_date)`,
          timesEarned: sql`${flagSeal.timesEarned} + (case
            when excluded.edition_dates[1] = any(${flagSeal.editionDates}) then 0 else 1 end)`,
          sources: sql`case
            when excluded.sources[1] = any(${flagSeal.sources}) then ${flagSeal.sources}
            else ${flagSeal.sources} || excluded.sources end`,
          // Only one date ever arrives per earn, so the cap is a one-element
          // shift off the oldest end.
          editionDates: sql`case
            when excluded.edition_dates[1] = any(${flagSeal.editionDates}) then ${flagSeal.editionDates}
            when coalesce(array_length(${flagSeal.editionDates}, 1), 0) >= 60
              then ${flagSeal.editionDates}[2:] || excluded.edition_dates
            else ${flagSeal.editionDates} || excluded.edition_dates end`,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        ...getTableColumns(flagSeal),
        // xmax = 0 ⇔ this row was inserted, not updated.
        inserted: sql<boolean>`(xmax = 0)`,
      });

    return {
      status: row.inserted ? 'new_seal' : 'already_earned',
      sealId: row.id,
      countryCode: row.countryCode,
      countryName: earn.canonicalName,
      timesEarned: row.timesEarned,
    };
  } catch (error) {
    // A throw would surface as an unhandled rejection in the client (R6.4).
    console.error('flag-seal: earn failed', error);
    return { status: 'noop' };
  }
}

/** What the passport renders — no child_id, no row id (spec D-e). */
export type FlagSealRecord = ReturnType<typeof sealToRecord>;

function sealToRecord(row: FlagSealRow) {
  return {
    country_code: row.countryCode,
    country_name: row.countryName,
    first_earned_date: row.firstEarnedDate,
    last_earned_date: row.lastEarnedDate,
    times_earned: row.timesEarned,
    sources: row.sources,
  };
}

export async function getFlagSeals(): Promise<{
  seals: FlagSealRecord[];
  earnedCount: number;
  totalCountries: number;
}> {
  const totalCountries = COUNTRIES.length;
  const child = await getActiveChild();
  if (!child) return { seals: [], earnedCount: 0, totalCountries };

  // All seals for the child — the ceiling is COUNTRIES.length, so no limit
  // (spec R5.11). Most recently discovered first for "recent finds" surfaces;
  // the grid re-orders alphabetically itself.
  const rows = await db
    .select()
    .from(flagSeal)
    .where(eq(flagSeal.childId, child.id))
    .orderBy(desc(flagSeal.firstEarnedDate));

  return { seals: rows.map(sealToRecord), earnedCount: rows.length, totalCountries };
}
