// @ts-nocheck — untyped .jsx from before checkJs was on; 6 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * DGPageShell — the navigation chrome for every page in the (dg) group: the
 * desktop rail, the mobile tab bar, the identity header, and the shell padding
 * that keeps content clear of all three.
 *
 * There used to be two of these. The edition reader lived outside the group
 * with a near-identical frame of its own (DGChromeFrame, in the file now
 * called DGAppChrome), because its rail has to sit under DGInstrumentationProvider
 * and the group's layout did not mount one. The two copies drifted — different
 * tab-bar and identity-header conditions, a background the other did not have
 * — and each layout awaited the reader separately, which is what made the
 * edition paint two skeletons back to back. The provider now lives in the
 * shared chrome, so this is the only frame.
 *
 * Must render inside ThemeProvider — the rail, the bar and the shell colours
 * all come from the active palette.
 */
import DGNavigationRail from '@/components/dailygold/DGNavigationRail';
import DGMobileTabBar from '@/components/dailygold/DGMobileTabBar';
import DGIdentityHeader from '@/components/dailygold/DGIdentityHeader';

/**
 * The shared shell stylesheet. One place owns the responsive layout system:
 * the rail-width / tab-bar-height variables, the three breakpoint tiers,
 * focus visibility, and reduced-motion handling. Page-specific layout (the
 * edition's section band) stays with the page that uses it.
 */
export const NAV_SHELL_CSS = `
  .dg-root {
    --dg-rail-w: 224px;
    --dg-tabbar-h: 0px;
    min-height: 100vh;
    overflow-x: clip;
  }
  .dg-shell {
    padding-left: var(--dg-rail-w);
    padding-bottom: var(--dg-tabbar-h);
    min-height: 100vh;
  }

  /* Navigation rail (desktop) */
  .dg-rail {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    width: var(--dg-rail-w);
    display: flex;
    flex-direction: column;
    padding: 1.5rem 0.75rem;
    border-right: 1px solid color-mix(in srgb, var(--dg-gold) 15%, transparent);
    /* visible so the reader-switcher dropdown can extend past the rail edge */
    overflow: visible;
    z-index: 1000;
  }
  .dg-rail-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 44px;
    padding: 0.55rem 0.9rem;
    border: none;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s ease;
    /* worn by <Link> (nav items) and <button> (identity block) alike */
    text-decoration: none;
    color: inherit;
    box-sizing: border-box;
  }
  .dg-rail-item:hover { background: color-mix(in srgb, var(--dg-gold) 10%, transparent); }
  .dg-rail-active { background: color-mix(in srgb, var(--dg-gold) 14%, transparent); }

  /* Mobile-only chrome, hidden on desktop */
  .dg-idheader, .dg-tabbar { display: none; }

  /* Compact rail: icons only */
  @media (max-width: 1023px) {
    .dg-root { --dg-rail-w: 84px; }
    .dg-rail { padding: 1.5rem 0.5rem; }
    .dg-rail-item { justify-content: center; padding: 0.55rem; }
    .dg-rail-label { display: none !important; }
    /* in flow the dot would consume gap + width and knock the icon off centre,
       so pin it to the right edge instead — same signal, no layout cost */
    .dg-rail-dot {
      position: absolute;
      right: 7px;
      top: 50%;
      transform: translateY(-50%);
      margin-left: 0 !important;
    }
  }

  /* Mobile: no rail; identity header + tab bar */
  @media (max-width: 767px) {
    .dg-root { --dg-rail-w: 0px; --dg-tabbar-h: calc(64px + env(safe-area-inset-bottom, 0px)); }
    .dg-rail { display: none; }
    .dg-idheader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      position: sticky;
      top: 0;
      z-index: 900;
      padding: 0.35rem 1rem;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .dg-tabbar {
      display: flex;
      align-items: stretch;
      justify-content: space-around;
      position: fixed;
      left: 0; right: 0; bottom: 0;
      padding: 0.25rem 0.5rem calc(0.25rem + env(safe-area-inset-bottom, 0px));
      z-index: 1000;
    }
    /* One line, always: a wrapped tab label makes the bar two rows tall and
       pushes the icons off their baseline. */
    .dg-tab-label {
      font-size: 0.7rem;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
  }

  /* Narrow phones. With a reader signed in the bar carries six tabs — the three
     destinations, the observatory, and the two shelf items — so a 320px screen
     gives each about 50px. At 0.7rem "Treasury" alone needs ~46px of that and
     wraps; shrinking the type is what keeps every tab legible and one line. */
  @media (max-width: 380px) {
    .dg-tabbar { padding-left: 0.25rem; padding-right: 0.25rem; }
    .dg-tabbar > a { padding-left: 0.1rem !important; padding-right: 0.1rem !important; }
    .dg-tab-label { font-size: 0.6rem; letter-spacing: 0; }
  }

  /* Keyboard focus is visible everywhere on the page */
  .dg-root :focus-visible {
    outline: 2px solid var(--dg-gold);
    outline-offset: 2px;
    border-radius: 4px;
  }

  @keyframes dgFadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* Calm by default for those who ask for it */
  @media (prefers-reduced-motion: reduce) {
    .dg-root *, .dg-root *::before, .dg-root *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

/**
 * `paper` marks the edition reader. It used to carry two look-and-feel
 * differences between the two shells this file replaces; one remains:
 *
 * - The identity header hung on the edition always, and elsewhere only for
 *   grown-ups. So /treasury and /passport in child mode still have no header;
 *   giving them the reader's switcher is the obvious unification, and just as
 *   obviously a UI decision rather than a refactor.
 *
 * (The reader's background gradients — a faint brown wash over the page
 * ground — were dropped 2026-08-17 so the edition matches the flat
 * --surface-page every other room paints.)
 *
 * @param {{
 *   child?: { id: string, name: string, avatar: string } | null,
 *   viewer?: { name: string, role: 'admin' | 'guardian' } | null,
 *   paper?: boolean,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function DGPageShell({ child = null, viewer = null, paper = false, children }) {
  return (
    <div
      className="dg-root"
      style={{
        '--dg-gold': 'var(--accent)',
        // Signed out there is no tab bar, so the shell must not reserve room
        // for one — the signed-out CTA docks at the true bottom instead.
        ...(viewer ? null : { '--dg-tabbar-h': '0px' }),
        backgroundColor: 'var(--surface-page)',
        fontFamily: 'var(--face-sans)',
        color: 'var(--text-primary)',
      }}
    >
      <style>{NAV_SHELL_CSS}</style>

      <DGNavigationRail child={child} viewer={viewer} />
      {/* A stranger gets no tab bar: every destination on it is login-gated,
          and the signed-out CTA bar takes its place at the bottom edge. Only
          the edition is reachable signed out, so this is the reader's rule
          applied to a shell the other four never hit it with. */}
      {viewer && <DGMobileTabBar child={child} />}

      <main className="dg-shell">
        {/* Chrome, not reading: the identity header names the reader (or the
            signed-in grown-up), not the day, so it stays out of the page and
            out of the tracked regions. On mobile the rail is gone, which is
            what makes it the only thing naming the account at all. */}
        {(paper || !child) && <DGIdentityHeader child={child} viewer={viewer} />}
        {children}
      </main>
    </div>
  );
}
