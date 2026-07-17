import { getFamilyOverview } from './actions';
import FamilyManager from '@/components/auth/FamilyManager';

export const metadata = { title: 'Family — Maison d\'Oré' };
export const dynamic = 'force-dynamic';

export default async function FamilyPage() {
  // getFamilyOverview runs requireFamily() — guardians only, own family only.
  const overview = await getFamilyOverview();
  return <FamilyManager initialOverview={overview} />;
}
