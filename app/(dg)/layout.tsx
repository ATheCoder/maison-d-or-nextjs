import { getActiveChild, getSession } from '@/lib/dal';
import DGPageShell from '@/components/dailygold/DGPageShell';
import { ThemeProvider } from '@/components/theme/ThemeContext';

/**
 * The shared chrome for every rail destination outside the edition reader:
 * /family, /parent-observatory, /passport, /treasury.
 *
 * This is a route group, so none of those URLs change — what changes is that
 * the rail, the mobile tab bar and the theme now live in a *layout* segment the
 * four pages have in common. Next.js reuses a shared layout across client
 * navigations between its children, so moving from Treasury to Parents swaps
 * only what sits inside <main> (with loading.tsx covering the gap) instead of
 * unmounting and rebuilding the whole tree. Before this, each page rendered its
 * own <ThemeProvider><DGPageShell> and every rail press tore the rail down and
 * built a new one — which is what read as the page reloading.
 *
 * /daily-gold-edition deliberately stays outside the group: it renders the same
 * chrome itself, but from inside DGInstrumentationProvider (keyed on the reader,
 * flushing on unmount), and the rail has to stay under that provider for its
 * nav_select / shelf_open events to be recorded at all.
 *
 * The reader's stored theme travels with them: `theme_preference` is read here
 * so /treasury and /passport paint in the child's own palette from the first
 * frame, with no flash of the default and no client fetch.
 *
 * The reader is resolved once, here. `getActiveChild` is the non-redirecting,
 * React-cached accessor, so the pages that also need the child (/passport,
 * /treasury, via requireChildContext) pay no second query. Grown-up rooms
 * answer `null` by construction: requireFamily bounces anyone still in child
 * mode to /gate, so the rail there shows the monogram and the app's
 * destinations, with no identity block and no "My World" shelf — exactly what
 * those pages asked for when they passed no child of their own.
 */
export default async function DGLayout({ children }: { children: React.ReactNode }) {
  const child = await getActiveChild();
  // Both accessors are React-cached, so this is the same session read the
  // pages themselves perform — no second query.
  const session = await getSession();

  return (
    <ThemeProvider childId={child?.id ?? null} initialTheme={child?.themePreference ?? null}>
      {/* The safe subset the picker exposes: id, display name, avatar key —
          never the row, which carries pinHash. The viewer is the same idea for
          the account: name and role only, so the chrome can say whose session
          this is without ever holding the session itself. */}
      <DGPageShell
        child={child ? { id: child.id, name: child.displayName, avatar: child.avatar } : null}
        viewer={session ? { name: session.user.name, role: session.user.role === 'admin' ? 'admin' as const : 'guardian' as const } : null}
      >
        {children}
      </DGPageShell>
    </ThemeProvider>
  );
}
