// design-sync stub for `@/app/(dg)/passport/actions`.
// The real module is a Next.js server-action file — it imports drizzle/pg,
// none of which can be bundled into a browser IIFE. Previews get inert earns.
export type FlagSource = 'born_today' | 'on_this_day' | 'destination' | 'good_news';

export type EarnResult =
  | { status: 'new_seal' | 'already_earned'; sealId: string; countryCode: string; countryName: string; timesEarned: number }
  | { status: 'noop' };

export async function earnFlagSeal(): Promise<EarnResult> {
  return { status: 'noop' };
}

export async function getFlagSeals(): Promise<{ seals: unknown[]; earnedCount: number; totalCountries: number }> {
  return { seals: [], earnedCount: 0, totalCountries: 193 };
}
