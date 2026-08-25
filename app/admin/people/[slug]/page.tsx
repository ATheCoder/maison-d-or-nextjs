import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/dal';
import { getPersonForEditor, getStoryBrief, getPersonJobs, getFactCheck } from '../actions';
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
  // The brief (golden thread / character sheet), any in-flight jobs, the slot
  // data (scenes + overrides), and the stored fact-check report — so the editor
  // picks up a generation started before a reload or in another tab, can build
  // its image slots, and opens with the last accuracy pass already in hand
  // (docs/golden-stories-bible.md). A null report is a normal state: most of
  // the library predates the bible and is exempt by decision.
  const [brief, jobs, slotData, factCheck] = await Promise.all([
    getStoryBrief(slug), getPersonJobs(slug), getSlotData(slug), getFactCheck(slug),
  ]);
  return (
    <PersonEditor
      initialPerson={person}
      initialBrief={brief}
      initialJobs={jobs}
      initialSlotData={slotData}
      initialFactCheck={factCheck}
    />
  );
}
