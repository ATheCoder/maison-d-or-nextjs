import FlagCollectionView from '@/components/dailygold/FlagCollectionView';
import { requireChildContext } from '@/lib/dal';
import { getFlagSeals } from './actions';

export const metadata = { title: 'My Flag Collection' };

export default async function PassportPage() {
  // Redirects to /profiles outside child mode; getFlagSeals and the (dg)
  // layout re-resolve the same child through the React-cached getActiveChild,
  // so this costs no extra query.
  await requireChildContext();
  const { seals, earnedCount, totalCountries } = await getFlagSeals();

  return <FlagCollectionView seals={seals} earnedCount={earnedCount} totalCountries={totalCountries} />;
}
