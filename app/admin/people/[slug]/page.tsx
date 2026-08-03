import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/dal';
import { getPersonForEditor, getStoryBrief, getPersonJobs } from '../actions';
import { getSlotData } from '../imageActions';
import PersonEditor from '@/components/admin/PersonEditor';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Edit ${slug} — Maison d'Oré` };
}

export default async function PersonEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const person = await getPersonForEditor(slug);
  if (!person) notFound();
  // The brief (golden thread / character sheet), any in-flight jobs, and the
  // slot data (scenes + overrides) — so the editor picks up a generation
  // started before a reload or in another tab and can build its image slots.
  const [brief, jobs, slotData] = await Promise.all([
    getStoryBrief(slug), getPersonJobs(slug), getSlotData(slug),
  ]);
  return <PersonEditor initialPerson={person} initialBrief={brief} initialJobs={jobs} initialSlotData={slotData} />;
}
