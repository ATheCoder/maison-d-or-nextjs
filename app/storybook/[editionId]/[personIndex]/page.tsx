import { getEditionById } from '@/app/daily-gold-edition/actions';
import StorybookView from '@/components/dailygold/StorybookView';

// The edition is read from the database per request.
export const dynamic = 'force-dynamic';

export default async function StorybookPage({
  params,
}: {
  params: Promise<{ editionId: string; personIndex: string }>;
}) {
  const { editionId, personIndex } = await params;
  const index = Number.parseInt(personIndex ?? '0', 10) || 0;

  const edition = await getEditionById(editionId);
  const story = (edition?.born_today?.[index] as any) ?? null;

  return <StorybookView story={story} editionId={editionId} index={index} />;
}
