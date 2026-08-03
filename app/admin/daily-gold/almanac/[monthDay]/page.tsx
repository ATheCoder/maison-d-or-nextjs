import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/dal';
import AlmanacEditor from '@/components/admin/AlmanacEditor';
import { getAlmanacDay } from '../../almanacActions';

export async function generateMetadata({ params }: { params: Promise<{ monthDay: string }> }) {
  const { monthDay } = await params;
  return { title: `${monthDay} — Almanac` };
}

export default async function AlmanacEditorPage({ params }: { params: Promise<{ monthDay: string }> }) {
  await requireAdmin();
  const { monthDay } = await params;

  // getAlmanacDay validates the shape and the calendar range; a month-day with
  // nothing authored is a legitimate destination, so only a malformed one 404s.
  const day = await getAlmanacDay(monthDay);
  if (!day) notFound();

  return <AlmanacEditor day={day} />;
}
