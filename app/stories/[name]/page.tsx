import { getPersonBySlug } from '@/app/(dg)/daily-gold-edition/actions';
import StorybookView from '@/components/dailygold/StorybookView';
import { getActiveChild } from '@/lib/dal';

/**
 * A Golden Story for one remarkable person, read from the remarkable_person
 * table by slug (e.g. /stories/leonardo). People migrated without full art
 * (Tier 2) render with text-only plates — <GoldenStory> shows its parchment
 * placeholder wherever an image_url is null.
 */

// People live in the database and can be updated, so render per-request.
export const dynamic = 'force-dynamic';

export default async function StoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  // No redirect: a signed-out or parent-mode visitor still reads the story.
  // The earn path takes only a boolean — the earn action re-resolves the child
  // from the session itself (spec R6.9). The opaque profile id crosses too, as
  // the analytics carryover's routing hint: it tells the reader's browser whose
  // unsent events are in localStorage, is never put in a payload, and ingest
  // re-resolves identity from the session all the same
  // (docs/daily-gold-analytics-plan.md §1/§4). A deliberate, documented
  // widening of R6.9 — no name, no family, nothing readable leaves the server.
  const [story, child] = await Promise.all([getPersonBySlug(name), getActiveChild()]);

  return <StorybookView story={story} canEarn={!!child} childId={child?.id ?? null} />;
}
