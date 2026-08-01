import FlagCollectionView from '@/components/dailygold/FlagCollectionView';
import { requireChildContext } from '@/lib/dal';
import { getFlagSeals } from './actions';

// A per-child passport is private and cheap — render it per request rather
// than caching (docs/flag-seal-spec.md R8.4/D4).
export const dynamic = 'force-dynamic';

export const metadata = { title: 'My Flag Collection' };

export default async function PassportPage() {
  // Redirects to /profiles outside child mode; getFlagSeals and the (dg)
  // layout re-resolve the same child through the React-cached getActiveChild,
  // so this costs no extra query.
  await requireChildContext();
  const { seals, earnedCount, totalCountries } = await getFlagSeals();

  return <FlagCollectionView seals={seals} earnedCount={earnedCount} totalCountries={totalCountries} />;
}
