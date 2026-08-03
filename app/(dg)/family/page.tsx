import { getFamilyOverview } from './actions';
import FamilyManager from '@/components/auth/FamilyManager';

export const metadata = { title: 'Family — Maison d\'Oré' };

export default async function FamilyPage() {
  // getFamilyOverview runs requireFamily() — guardians only, own family only.
  const overview = await getFamilyOverview();

  // The nav chrome comes from the (dg) layout, which resolves no `child` here:
  // reaching a grown-up room means child mode was cleared at the gate, so there
  // is no reader to greet and no "My World" shelf to show. The rail already
  // guards both on `child`, so the shell degrades to the monogram plus the
  // app's destinations.
  return <FamilyManager initialOverview={overview} />;
}
