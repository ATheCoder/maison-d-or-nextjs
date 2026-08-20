// @ts-nocheck — untyped .jsx from before checkJs was on; 9 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * dgNavConfig — the single source of truth for Daily Gold navigation
 * (navigation-redesign-spec §4 / §7).
 *
 * Both renderers — DGNavigationRail (desktop) and DGMobileTabBar (mobile) —
 * read from here, so routes can never disagree again. Only destinations that
 * exist in this app are listed: the old rail/bar linked to /home, /academy,
 * /discover, /saved, /library and /journey/*, none of which are routes here.
 *
 * The personal shelf ("My World") is the child's own space, distinct from the
 * app destinations. "My Book" (/assessments/goldprint) and "My Recipes" were
 * dead controls in this app and are removed per spec §9.2 ("it cannot ship as
 * a no-op") until they earn real destinations.
 */

export const DG_DESTINATIONS = [
  // `prefetchFull` asks Link for the whole route rather than the default stop
  // at the loading.tsx boundary, which is all a dynamic route otherwise gets.
  // The paper alone earns it, and only since the reader moved to the layout
  // (ReaderContext): a fully prefetched segment is kept in the client cache and
  // handed back on the next visit, so this is what makes leaving for the
  // Treasury and pressing Today again cost no server render at all. It would
  // have been wrong before — the segment carried one child's hearts, and a kept
  // copy of those is a copy that goes stale the moment they tap one. Now it
  // carries only the day, which is the same answer for everyone.
  { key: 'today', label: 'Today', path: '/daily-gold-edition', icon: 'gold', prefetchFull: true },
  // "Home" (/) is deliberately absent: it is the landing page, not an app
  // destination, so it earns no tab for anyone.
  //
  // `grownUp` marks the rooms behind requireFamily. They are listed for
  // grown-ups and signed-out visitors, and hidden from a session in child
  // mode — a reader's rail carries no doors it cannot open.
  { key: 'family', label: 'Family', path: '/family', icon: 'family', grownUp: true },
  // The parent observatory. Labelled "Parents", not "Observatory": at 320px a
  // mobile tab gets little width, and eleven characters wrap — the same
  // constraint that made "Treasury" out of "My Treasury".
  { key: 'parents', label: 'Parents', path: '/parent-observatory', icon: 'insights', grownUp: true },
];

/**
 * The destinations a given session may see. Child mode (a non-null reader)
 * drops the grown-up rooms; everyone else gets the full list. Both renderers
 * must call this rather than filtering themselves — the rail and the tab bar
 * disagreeing about which rooms exist is the bug this file prevents.
 */
export function dgDestinationsFor(child) {
  return child ? DG_DESTINATIONS.filter((d) => !d.grownUp) : DG_DESTINATIONS;
}

/**
 * Whether a nav item is the page currently being viewed.
 *
 * Lives here rather than in each renderer because the rail and the tab bar
 * disagreeing about the active tab is the same class of bug as them disagreeing
 * about routes — and this file exists so that cannot happen. Both destinations
 * that own a subtree need more than string equality: the edition reader appears
 * under several daily-gold paths, and the observatory's real pages are
 * /parent-observatory/<childId>.
 */
export function isNavItemActive(item, pathname) {
  const path = pathname || '';
  if (item.key === 'today') return path.includes('daily-gold');
  if (item.key === 'parents') return path.startsWith('/parent-observatory');
  return path === item.path;
}

export const DG_SHELF = [
  // `shortLabel` is what the folded rail (768-1023px) writes under the icon:
  // that tier gives a label 62px, and "The Living Atlas" is four wrapped lines
  // in it. Only this item needs one; everywhere else the label already fits.
  { key: 'flags', label: 'The Living Atlas', shortLabel: 'Atlas', path: '/passport', icon: 'flag' },
  // Labelled "Treasury", not "My Treasury": the mobile bar carries five tabs at
  // 0.7rem, and an eleventh character wraps the label at 320px. The page's own
  // title says "My Treasury".
  { key: 'treasury', label: 'Treasury', path: '/treasury', icon: 'treasury' },
];

/** House icon set — 24-box, strokeWidth 1.7, round caps (matches the rest of the app). */
export function DGIcon({ name, size = 20, color = 'currentColor' }) {
  const shared = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true, focusable: false,
  };
  switch (name) {
    case 'gold':
      return <svg {...shared}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case 'family':
      return <svg {...shared}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
    case 'flag':
      return <svg {...shared}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>;
    case 'treasury':
      // Same outline as the save heart the child taps to fill the shelf.
      return <svg {...shared}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
    case 'insights':
      // The observatory's own bar chart. Deliberately not an eye or a
      // telescope: the surface's governing stance is "curiosity, not
      // surveillance" (parent-observatory spec §1), and a watching glyph in the
      // child's own rail would say the opposite of what the page does.
      return <svg {...shared}><line x1="6" y1="20" x2="6" y2="13" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="18" y1="20" x2="18" y2="9" /></svg>;
    default:
      return null;
  }
}
