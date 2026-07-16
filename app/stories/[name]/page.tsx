import { getPersonBySlug } from '@/app/daily-gold-edition/actions';
import StorybookView from '@/components/dailygold/StorybookView';

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
  const story = await getPersonBySlug(name);

  return <StorybookView story={story} />;
}
