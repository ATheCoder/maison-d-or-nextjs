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
import DGThemeSwitcher from '@/components/dailygold/DGThemeSwitcher';

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

  /* Navigation rail (desktop).

     The metrics are 06-gallery-themes.html's .gl-rail, and the rows are its
     direct children on purpose: the design writes destinations and shelf items
     as one column with a hairline in it, not as two grouped lists. */
  .dg-rail {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    width: var(--dg-rail-w);
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 22px 12px 20px;
    border-right: 1px solid var(--border-fine);
    /* visible so the reader-switcher dropdown can extend past the rail edge */
    overflow: visible;
    z-index: 1000;
  }

  /* The house mark. Two spellings, one shown per breakpoint. */
  .dg-rail-mark { padding: 0 8px 16px; }
  .dg-rail-mark-full,
  .dg-rail-mark-short {
    display: block;
    font-weight: 600;
    color: var(--accent-readable);
  }
  .dg-rail-mark-full { font-size: 19px; }
  .dg-rail-mark-short { display: none; }
  .dg-rail-mark-sub { display: block; margin-top: 3px; }

  .dg-rail-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    border: none;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s ease, color 0.2s ease;
    /* worn by <Link> (nav items) and <button> (identity block) alike */
    text-decoration: none;
    color: var(--text-primary);
    box-sizing: border-box;
  }
  /* .gl-nav declares no hover; a shipped rail needs one. */
  .dg-rail-item:hover { background: color-mix(in srgb, var(--dg-gold) 10%, transparent); }
  /* The whole row turns, and the glyph turns with it through currentColor.
     There is deliberately no dot and no bold weight beside this: three signals
     saying "you are here" is two more than the design draws. */
  .dg-rail-active {
    background: color-mix(in srgb, var(--dg-gold) 14%, transparent);
    color: var(--accent-readable);
  }
  .dg-rail-glyph { display: inline-flex; flex-shrink: 0; }
  .dg-rail-label { min-width: 0; }
  .dg-rail-label-short { display: none; }

  /* "My world" is its own divider: the heading carries the hairline, which is
     what lets the folded rail keep the rule and drop the words. */
  .dg-rail-sub {
    margin: 14px 12px 6px;
    padding-top: 12px;
    border-top: 1px solid var(--border-fine);
  }

  /* The foot. The identity block takes the free space; with nobody signed in
     there is no identity block, so the inks take it instead and the foot is
     still a foot. */
  .dg-rail-id {
    position: relative;
    margin-top: auto;
    padding: 12px 4px 0;
    border-top: 1px solid var(--border-fine);
  }
  .dg-rail-id-btn { min-height: 48px; padding: 6px 8px; }
  .dg-rail-av {
    width: 32px; height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 1.5px solid color-mix(in srgb, var(--accent) 50%, transparent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
  }
  .dg-rail-av-key { background: var(--surface-tint); }
  .dg-rail-id-label {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    overflow: hidden;
  }
  .dg-rail-id-name,
  .dg-rail-id-meta {
    display: block;
    max-width: 118px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dg-rail-id-name { font-size: var(--type-caption); font-weight: 600; }
  .dg-rail-id-meta { font-size: var(--type-label-editorial); color: var(--text-faint); }

  .dg-rail-ink { margin-top: auto; padding: 14px 12px 0; }
  .dg-rail-id + .dg-rail-ink { margin-top: 0; }
  .dg-ink { display: flex; align-items: center; }
  /* The 12px dot is the design's; the 24px box around it is not — a swatch is
     a control, and a control owes the pointer 24px (WCAG 2.2 target size). */
  .dg-ink-swatch {
    width: 24px; height: 24px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
  }
  .dg-ink-swatch > span { width: 12px; height: 12px; }

  /* Mobile-only chrome, hidden on desktop */
  .dg-idheader, .dg-tabbar, .dg-theme-float { display: none; }

  /* The folded rail (tablet): a 76px attendant's post. Not the desktop rail
     with its words removed — each row stacks its icon over a micro-label, the
     mark shrinks to its initial, and a hairline stands where the desktop
     writes "My world". Metrics from the mockup's .gl-t-rail-*. */
  @media (max-width: 1023px) {
    .dg-root { --dg-rail-w: 76px; }
    .dg-rail { padding: 18px 6px 24px; align-items: center; }

    .dg-rail-mark { padding: 2px 0 16px; text-align: center; }
    .dg-rail-mark-full { display: none; }
    .dg-rail-mark-short { display: block; font-size: 25px; line-height: 1; }
    .dg-rail-mark-sub {
      /* below every type-* token, like the <=380px tab-label escape hatch:
         64px of wall is a geometry constraint, not a typographic choice */
      font-size: 7.5px;
      letter-spacing: 0.16em;
      line-height: 1.35;
      margin-top: 5px;
    }

    .dg-rail-item {
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      width: 62px;
      min-height: 56px;
      padding: 9px 2px;
    }
    .dg-rail-label { display: none !important; }
    .dg-rail-label-short {
      display: block;
      font-size: 8px;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      line-height: 1.2;
      text-align: center;
      color: var(--text-faint);
    }
    .dg-rail-active .dg-rail-label-short { color: var(--accent-readable); }

    /* The heading keeps its border and loses its words. font-size: 0 takes the
       text from the eye and not from a screen reader, which is the half of it
       that still has room here. */
    .dg-rail-sub {
      width: 30px;
      height: 0;
      margin: 13px 0 9px;
      padding-top: 0;
      font-size: 0;
      line-height: 0;
      overflow: hidden;
    }

    .dg-rail-id { width: 46px; padding: 15px 0 0; }
    .dg-rail-id-btn { justify-content: center; padding: 0; min-height: 44px; }
    .dg-rail-id-label { display: none; }
    .dg-rail-av { width: 28px; height: 28px; font-size: 0.875rem; }

    .dg-rail-ink { padding: 13px 0 0; }
    .dg-ink { flex-direction: column; }
    .dg-ink-swatch { width: 20px; height: 20px; }
  }

  /* Mobile: no rail; identity header + tab bar */
  @media (max-width: 767px) {
    .dg-root { --dg-rail-w: 0px; --dg-tabbar-h: calc(64px + env(safe-area-inset-bottom, 0px)); }
    .dg-rail { display: none; }
    /* The rail carries the seven inks, and here there is no rail. The puck is
       the same picker in its other coat, and this is the only width that
       wants it. */
    .dg-theme-float { display: block; }
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
      /* mirrors the type-label-editorial size (class can't reach this block);
         no uppercase — tab labels stay sentence case */
      font-size: var(--type-label-editorial);
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

      {/* The palette picker's phone coat. Its desktop coat is the ink row at
          the foot of the rail; below 768px there is no rail, so the puck hangs
          here instead — mounted for every destination rather than for the
          edition alone, which is where it used to live (inside DGHero). The
          wrapper is what the breakpoint switches; the component itself has no
          opinion about width. */}
      <div className="dg-theme-float">
        <DGThemeSwitcher />
      </div>

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
