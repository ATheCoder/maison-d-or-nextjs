import { getFamilyOverview } from './actions';
import FamilyManager from '@/components/auth/FamilyManager';
import DGPageShell from '@/components/dailygold/DGPageShell';
import { ThemeProvider } from '@/components/theme/ThemeContext';

export const metadata = { title: 'Family — Maison d\'Oré' };
export const dynamic = 'force-dynamic';

export default async function FamilyPage() {
  // getFamilyOverview runs requireFamily() — guardians only, own family only.
  const overview = await getFamilyOverview();

  // The nav chrome with no `child`: reaching a grown-up room means child mode
  // was cleared at the gate, so there is no reader to greet and no "My World"
  // shelf to show. The rail already guards both on `child`, and ThemeProvider
  // without a childId simply serves the default palette (persistence is
  // disabled pending auth-plan §8 phase 5), so the shell degrades to the
  // monogram plus the app's destinations.
  return (
    <ThemeProvider>
      <DGPageShell>
        <FamilyManager initialOverview={overview} />
      </DGPageShell>
    </ThemeProvider>
  );
}
