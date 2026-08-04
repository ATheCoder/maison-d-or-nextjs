// @ts-nocheck — untyped .jsx from before checkJs was on; 1 error to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * The two notes the edition can open with, both about who is holding it rather
 * than about the day (onboarding plan WP-C.3 / WP-D.2).
 *
 * `WelcomeFlourish` is the end of the /welcome wizard: the first time a new
 * reader's paper opens, it says so. Driven by `?welcome=1` alone — nothing is
 * stored and nothing is counted, so dismissing it is just closing it, and
 * re-adding the parameter would show it again. That is the whole intent: a
 * flourish, not a state machine.
 *
 * `SignedOutCta` is the stranger's invitation. It is the honest version of the
 * closed doors below it (no hearts, no flags), so it names what an account
 * actually buys rather than shouting.
 */
import { useState } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';
import { SIGNUP_HREF, LOGIN_HREF } from '@/components/dailygold/SignupInvite';

/** @param {{ name: string }} props */
export function WelcomeFlourish({ name }) {
  const { theme } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div style={{
      // No top margin: as the first element in the page flow it would collapse
      // through the unpadded wrappers and shove the whole themed page down,
      // leaving a white body-band above. The page's banner slot pads instead.
      margin: '0 clamp(1rem, 3vw, 2rem)',
      padding: '1rem 1.15rem',
      borderRadius: 16,
      background: `linear-gradient(135deg, ${theme.accentGold}22 0%, ${theme.accentGold}0D 100%)`,
      border: `1px solid ${theme.accentGold}55`,
      display: 'flex',
      alignItems: 'center',
      gap: '0.9rem',
      animation: 'dgFadeIn 0.5s ease-out',
    }}>
      <span aria-hidden="true" style={{ fontSize: '1.5rem', lineHeight: 1 }}>✨</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: theme.fontHeadline,
          fontStyle: 'italic',
          fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
          color: theme.textHeadline,
          margin: '0 0 0.2rem',
        }}>
          {name}&rsquo;s first edition
        </p>
        <p style={{ fontFamily: theme.fontBody, fontSize: '0.78rem', color: theme.textMuted, margin: 0, lineHeight: 1.5 }}>
          A new paper arrives every morning. Tap a heart to keep something, and the
          world&rsquo;s flags collect themselves as you read.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
          color: theme.textMuted, fontSize: '1.1rem', lineHeight: 1, padding: '0.25rem',
        }}
      >
        ×
      </button>
    </div>
  );
}

// The bar's two homes, chosen by viewport (the Spotify/Pinterest mobile-web
// pattern): a bar stuck to the top of the desktop viewport, and on phones a
// bar docked above the tab bar, where a thumb already is and the masthead
// stays clear. One solid colour either way — content scrolls underneath, so
// any transparency would show it through. z-index sits above the day's content
// but below DGModal (2000) and the invite toast (2500). Theme colours arrive
// as CSS vars from the component, since a <style> block cannot read the hook.
const CTA_CSS = `
  .dg-signedout-cta {
    position: sticky;
    top: 0;
    z-index: 1500;
    padding: 0.55rem clamp(1rem, 3vw, 2rem);
    background: var(--cta-bg);
    border-bottom: 1px solid var(--cta-border);
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .dg-signedout-cta .dg-cta-label-mobile { display: none; }
  @media (max-width: 767px) {
    .dg-signedout-cta {
      position: fixed;
      top: auto;
      bottom: var(--dg-tabbar-h, 0px);
      left: 0;
      right: 0;
      border-bottom: none;
      border-top: 1px solid var(--cta-border);
      box-shadow: 0 -4px 20px rgba(44, 36, 22, 0.08);
      /* Signed out there is no tab bar below, so the bar sits on the screen's
         own edge and owes the home-indicator inset itself. */
      padding: 0.55rem 1rem calc(0.55rem + env(safe-area-inset-bottom, 0px));
      gap: 0.75rem;
      flex-wrap: nowrap;
    }
    /* On a phone the bar is just the button: the text block is desktop
       comfort, and the button's own words carry the invitation. */
    .dg-signedout-cta-sub { display: none; }
    .dg-signedout-cta a:last-child { flex: 1 1 auto; text-align: center; }
    .dg-signedout-cta .dg-cta-label-desktop { display: none; }
    .dg-signedout-cta .dg-cta-label-mobile { display: inline; }
    /* The docked bar floats over the tail of the page; give the shell that
       much extra bottom room so the last section can scroll clear of it. */
    .dg-root:has(.dg-signedout-cta) .dg-shell {
      padding-bottom: calc(var(--dg-tabbar-h, 0px) + 64px + env(safe-area-inset-bottom, 0px));
    }
  }
`;

export function SignedOutCta() {
  const { theme } = useTheme();

  return (
    <>
      <style>{CTA_CSS}</style>
      <div
        className="dg-signedout-cta"
        style={{ '--cta-bg': theme.bgCard, '--cta-border': `${theme.accentGold}44` }}
      >
        <div className="dg-signedout-cta-sub" style={{ flex: '1 1 200px', minWidth: 0 }}>
          <p style={{
            fontFamily: theme.fontHeadline,
            fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
            color: theme.textHeadline,
            margin: 0,
          }}>
            Start your family&rsquo;s collection
          </p>
          <p style={{
            fontFamily: theme.fontBody, fontSize: '0.75rem', color: theme.textMuted,
            margin: 0, lineHeight: 1.4,
          }}>
            Save treasures, earn flags, follow the reading journey.
          </p>
        </div>
        <a
          href={LOGIN_HREF}
          style={{
            flexShrink: 0,
            padding: '0.5rem 0.35rem',
            fontFamily: theme.fontBody,
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: theme.textMuted,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Sign in
        </a>
        <a
          href={SIGNUP_HREF}
          style={{
            flexShrink: 0,
            padding: '0.5rem 1.15rem',
            borderRadius: 10,
            background: theme.accentGold,
            color: '#FFF',
            fontFamily: theme.fontBody,
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="dg-cta-label-desktop">Create an account</span>
          <span className="dg-cta-label-mobile">Start your family&rsquo;s journey</span>
        </a>
      </div>
    </>
  );
}
