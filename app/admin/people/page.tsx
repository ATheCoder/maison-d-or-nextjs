import { requireAdmin } from '@/lib/dal';
import { listPeople } from './actions';
import PeopleLibrary from '@/components/admin/PeopleLibrary';

export const metadata = { title: 'Remarkable people — Maison d\'Oré' };
export const dynamic = 'force-dynamic';

export default async function PeopleLibraryPage() {
  await requireAdmin();
  const people = await listPeople();
  return <PeopleLibrary people={people} />;
}
