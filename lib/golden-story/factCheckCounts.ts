/**
 * The verdict tally for a fact-check report.
 *
 * Its own module, with no imports beyond a type, because both sides of the
 * feature need it and they cannot import each other: the job that stores the
 * report runs on the server next to the OpenRouter client, and the panel that
 * shows it is a client component. Two copies of eight lines would drift, and
 * when they did, the count on the button would disagree with the count in the
 * job result over the same report — the kind of contradiction that costs the
 * whole panel its credibility.
 */
import type { FactCheckReport } from '@/src/db/schema';

export type FactCheckCounts = {
  wrong: number;
  unsupported: number;
  unverifiable: number;
  supported: number;
  total: number;
  /** False when the book has never been checked — a normal state, not an error. */
  checked: boolean;
};

export function factCheckCounts(report: FactCheckReport | null | undefined): FactCheckCounts {
  const claims = report?.claims ?? [];
  return {
    wrong: claims.filter((c) => c.verdict === 'wrong').length,
    unsupported: claims.filter((c) => c.verdict === 'unsupported').length,
    unverifiable: claims.filter((c) => c.verdict === 'unverifiable').length,
    supported: claims.filter((c) => c.verdict === 'supported').length,
    total: claims.length,
    checked: !!report,
  };
}
