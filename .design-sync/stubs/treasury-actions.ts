// design-sync stub for `@/app/treasury/actions`.
// The real module is a Next.js server-action file — it imports drizzle/pg,
// none of which can be bundled into a browser IIFE. Previews get inert saves:
// the heart renders, and a tap reports a failure it can show.
export type ToggleSaveResult =
  | { status: 'saved' }
  | { status: 'unsaved' }
  | { status: 'error'; reason: 'no_child' | 'invalid_input' | 'db_error' };

export async function toggleSavedItem(): Promise<ToggleSaveResult> {
  return { status: 'error', reason: 'no_child' };
}

export async function getSavedItems(): Promise<unknown[]> {
  return [];
}

export async function getSavedKeys(): Promise<string[] | null> {
  return null;
}
