import TreasuryView from '@/components/treasury/TreasuryView';
import DGPageShell from '@/components/dailygold/DGPageShell';
import { ThemeProvider } from '@/components/theme/ThemeContext';
import { requireChildContext } from '@/lib/dal';
import { getSavedItems } from './actions';

// A child's treasury is private and cheap — render it per request rather than
// caching (same reasoning as /passport, docs/flag-seal-spec.md R8.4/D4).
export const dynamic = 'force-dynamic';

export const metadata = { title: 'My Treasury' };

export default async function TreasuryPage() {
  // Redirects to /profiles outside child mode; getSavedItems re-resolves the
  // same child through the React-cached getActiveChild, so this costs no
  // extra query.
  const { child } = await requireChildContext();
  const items = await getSavedItems();

  return (
    <ThemeProvider childId={child.id}>
      {/* The nav chrome's child is the same safe subset the picker exposes:
          id, display name, avatar key — never the row (it carries pinHash). */}
      <DGPageShell child={{ id: child.id, name: child.displayName, avatar: child.avatar }}>
        <TreasuryView items={items} childName={child.displayName} />
      </DGPageShell>
    </ThemeProvider>
  );
}
