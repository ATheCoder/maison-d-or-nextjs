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
import { SIGNUP_HREF } from '@/components/dailygold/SignupInvite';

/** @param {{ name: string }} props */
export function WelcomeFlourish({ name }) {
  const { theme } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div style={{
      margin: 'clamp(0.75rem, 2vw, 1.25rem) clamp(1rem, 3vw, 2rem) 0',
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

export function SignedOutCta() {
  const { theme } = useTheme();

  return (
    <div style={{
      margin: 'clamp(0.75rem, 2vw, 1.25rem) clamp(1rem, 3vw, 2rem) 0',
      padding: '1rem 1.15rem',
      borderRadius: 16,
      background: theme.bgCard,
      border: `1px solid ${theme.accentGold}44`,
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <p style={{
          fontFamily: theme.fontHeadline,
          fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
          color: theme.textHeadline,
          margin: '0 0 0.2rem',
        }}>
          Start your family&rsquo;s collection
        </p>
        <p style={{ fontFamily: theme.fontBody, fontSize: '0.78rem', color: theme.textMuted, margin: 0, lineHeight: 1.5 }}>
          Save treasures, earn flags, follow the reading journey.
        </p>
      </div>
      <a
        href={SIGNUP_HREF}
        style={{
          flexShrink: 0,
          padding: '0.65rem 1.3rem',
          borderRadius: 12,
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
        Create an account
      </a>
    </div>
  );
}
