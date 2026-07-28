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
  { key: 'today', label: 'Today', path: '/daily-gold-edition', icon: 'gold' },
  { key: 'stories', label: 'Home', path: '/', icon: 'home' },
  { key: 'family', label: 'Family', path: '/family', icon: 'family' },
];

export const DG_SHELF = [
  { key: 'flags', label: 'My Flags', path: '/passport', icon: 'flag' },
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
    case 'home':
      return <svg {...shared}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    case 'family':
      return <svg {...shared}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
    case 'flag':
      return <svg {...shared}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>;
    case 'treasury':
      // Same outline as the save heart the child taps to fill the shelf.
      return <svg {...shared}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
    default:
      return null;
  }
}
