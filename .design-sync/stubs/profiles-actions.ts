// design-sync stub for `@/app/profiles/actions`.
// Same reason as the daily-gold-edition stub: the real module is a server-action
// file reaching into the database and auth session.
export async function getProfilesForPicker(): Promise<unknown[]> {
  return [];
}

export async function enterChildProfile(): Promise<{ ok: boolean }> {
  return { ok: true };
}

export async function enterChildProfileAsGuardian(): Promise<{ ok: boolean }> {
  return { ok: true };
}
