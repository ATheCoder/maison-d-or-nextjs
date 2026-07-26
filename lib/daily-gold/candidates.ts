/**
 * The candidate model (D11, R7.9) — **a candidate is an unpublished row of the
 * real table**, not a staging table.
 *
 * That decision buys simplicity everywhere except one place: both content types
 * carry a *unique ordering column* — `(date, position)` on good news,
 * `(month_day, rank)` on moments — so a candidate necessarily occupies an
 * ordering value while it waits to be reviewed. Three rules follow, and every
 * accept/reject path in Phase 8 is built on them:
 *
 *  1. **The display band is reserved.** Positions 0–9 (ranks 1–10) are what a
 *     family reads. Retrieval parks candidates *past* the band, at position 10+
 *     or rank 11+. Twelve proposals therefore cannot push an authored story out
 *     of the ten, and the ceiling counts published rows only.
 *  2. **Accepting is a reposition, not an update.** The row moves from the
 *     parking band into the lowest free display slot, inside one transaction —
 *     a plain `set published = true` would leave it ordered by arrival and, for
 *     a moment, at a rank the reader never renders.
 *  3. **A candidate is identified by provenance, not by its flag.** A
 *     hand-written row is also unpublished; what distinguishes a candidate is
 *     that it was *retrieved* and never reviewed. `retrieved_at IS NOT NULL AND
 *     reviewed_at IS NULL` is the test, and it stays true across a day being
 *     published, withdrawn and published again.
 *
 * Pure and synchronous — the SQL lives with the actions; this module owns the
 * arithmetic so the two content types cannot drift apart.
 */

/** Good news: the positions a family actually reads (R3.7). */
export const NEWS_DISPLAY_SLOTS = 10;
/** Greatest Moments: the rungs a family actually reads (R4.13). */
export const MOMENT_RANKS = 10;

/** The first position retrieval parks a good-news candidate at. */
export const NEWS_PARK_FROM = NEWS_DISPLAY_SLOTS; // 10
/** The first rank retrieval parks a moment candidate at. */
export const MOMENT_PARK_FROM = MOMENT_RANKS + 1; // 11

/**
 * The lowest free value in `[from, from + count)` — the display slot an
 * accepted candidate moves into, or null when the band is full.
 *
 * Callers pass every value the band currently holds, published or not: a
 * hand-written draft sitting at position 3 owns that slot as surely as a
 * published one does, and moving it aside to make room for a proposal would be
 * the AI overwriting the admin's work.
 */
export function firstFreeSlot(taken: Iterable<number>, from: number, count: number): number | null {
  const used = new Set(taken);
  for (let v = from; v < from + count; v += 1) if (!used.has(v)) return v;
  return null;
}

/** The next free parking value at or past `from` — where a new candidate lands. */
export function nextParkingSlot(taken: Iterable<number>, from: number): number {
  const used = new Set(taken);
  let v = from;
  while (used.has(v)) v += 1;
  return v;
}

/** True for a row that retrieval proposed and nobody has reviewed yet (rule 3). */
export function isCandidate(row: { retrieved_at?: unknown; reviewed_at?: unknown }): boolean {
  return Boolean(row.retrieved_at) && !row.reviewed_at;
}
