/**
 * How many columns a hung wall gets, given how many works it actually holds.
 *
 * The lead work spans 2x2, and that span is the *entire* rank signal on every
 * wall of this design — biggest work, top-left corner, first. Which makes a
 * fixed column count wrong: beside a 2x2 lead a wall of C columns has exactly
 * 2·(C−2) cells, so a five-column wall holding four people leaves three empty
 * cells sitting in the middle of the hang. A gallery may end a row early; it
 * may not leave a hole beside the lead.
 *
 * So the wall takes the widest column count whose two rows beside the lead the
 * satellites can actually fill:
 *
 *     2·(C−2) ≤ n−1   ⟺   C ≤ (n−1)/2 + 2
 *
 * Exact at n = 3, 5, 7 (and 9 on a four-column wall); otherwise the remainder
 * spills into an honest trailing row, which is what a salon hang does anyway.
 *
 * This is real, not defensive: the days in this corpus carry one to seven
 * people, never the mockup's ten.
 */
export function hangColumns(n: number, max: number): number {
  if (n <= 1) return 2;
  return Math.max(2, Math.min(max, Math.floor((n - 1) / 2) + 2));
}

/**
 * Whether the first work takes the 2x2.
 *
 * Below three works there is no wall to rank: on a two-column hang the lead's
 * double span is the whole width, and a portrait at 3:4 across a full reading
 * column is 1600px of one face — the size stops meaning "first" and starts
 * meaning "only". So a wall of one or two hangs them at equal size, side by
 * side, and lets the reading order speak for itself.
 */
export function hasLead(n: number): boolean {
  return n >= 3;
}
