import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/dal';
import DayEditor from '@/components/admin/DayEditor';
import { getDayForEditor } from '../dayActions';

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return { title: `${date} — Daily Gold` };
}

export default async function DayEditorPage({ params }: { params: Promise<{ date: string }> }) {
  await requireAdmin();
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  // A date with no edition row is a legitimate destination, not a 404: the
  // editor offers to prepare it. Only a malformed date is missing.
  const day = await getDayForEditor(date);
  if (!day) notFound();

  return <DayEditor day={day} />;
}
