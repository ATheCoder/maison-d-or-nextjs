// design-sync stub for `@/app/daily-gold-edition/actions`.
// The real module is a Next.js server-action file — it imports drizzle/pg and
// `server-only`, none of which can be bundled into a browser IIFE. Preview
// cards get inert resolvers; components worth a rich preview take props.
export async function getEditionByDate(): Promise<null> {
  return null;
}

export async function getAvailableDates(): Promise<string[]> {
  return [];
}

export async function getPeopleForDate(): Promise<unknown[]> {
  return [];
}

export async function getGoodNewsForDate(): Promise<unknown[]> {
  return [];
}

export async function getOnThisDayForDate(): Promise<unknown[]> {
  return [];
}

export async function getGreatestMomentsForDate(): Promise<unknown[]> {
  return [];
}
