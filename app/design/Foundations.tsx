'use client';

import { useSyncExternalStore } from 'react';
import Button from '@/components/ds/Button';
import HeartToggle from '@/components/ds/HeartToggle';
import TextLink from '@/components/ds/TextLink';

/**
 * §5 addendum — the decided third of the §7 foundations list, written down:
 * radius, links and motion were built into the primitives from the start;
 * this section only documents them. Same honesty rule as Swatches: the
 * radius values are read from the computed stylesheet and the motion is
 * demonstrated by the primitives themselves, so tuning globals.css
 * re-documents this page on its own. The one transcription is the timing
 * table — hover/press durations live inside media queries and pseudo-states
 * the computed style can't reach, so those numbers quote btn-motion
 * (globals.css §4) and must move with it.
 */
const RADII = [
  { token: 'radius-sm', className: 'rounded-sm', use: 'chips, swatches, small tags' },
  { token: 'radius-md', className: 'rounded-md', use: 'buttons, fields, cards, asides' },
  { token: 'radius-lg', className: 'rounded-lg', use: 'floating panels — reserved; nothing wears it yet' },
] as const;

const TIMING = [
  { move: 'Settle', value: '400ms', note: 'release, and every return to rest — unhurried to let go' },
  { move: 'Hover', value: '140ms', note: 'arrives fast, with a 1px lift — quick to answer' },
  { move: 'Press', value: '60ms', note: 'drops below the baseline, sheds the lift — tighter to the page' },
  { move: 'Ease', value: 'cubic-bezier(0.22, 1, 0.36, 1)', note: 'the house curve — the date picker and gold-ink reveal already speak it' },
] as const;

// The stylesheet only changes with a reload, so the store never notifies and
// the snapshot is computed once and cached. Server snapshot is empty — the
// pixel values appear on hydration.
const EMPTY: Record<string, string> = {};
let radiusCache: Record<string, string> | null = null;
const neverNotify = () => () => {};
function readRadii(): Record<string, string> {
  if (!radiusCache) {
    const styles = getComputedStyle(document.documentElement);
    radiusCache = {};
    for (const { token } of RADII) {
      radiusCache[token] = styles.getPropertyValue(`--${token}`).trim();
    }
  }
  return radiusCache;
}

// Unlike the stylesheet, reduced-motion is live — a visitor can flip it in
// system settings mid-session, and documentation that tells the truth about
// the current session is the point of the probe.
const RM_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(RM_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
const readReducedMotion = () => window.matchMedia(RM_QUERY).matches;

export default function Foundations() {
  const radius = useSyncExternalStore(neverNotify, readRadii, () => EMPTY);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);

  return (
    <div className="space-y-12">
      <div>
        <p className="type-body-ui text-primary">Border radius</p>
        <p className="type-caption mt-1 mb-4 max-w-[38rem]">
          Three steps, soft enough to feel hand-finished, never round enough to go
          friendly-app. Labelled buttons must not become pills; the only full circles
          are icon toggles like the heart, which have no label to stretch.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {RADII.map(({ token, className, use }) => (
            <div key={token}>
              <div className={`h-16 border border-fine bg-surface-raised ${className}`} />
              <p className="type-body-ui mt-2 text-primary">{token}</p>
              <p className="type-caption" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {radius[token] ?? '…'} &middot; {use}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="type-body-ui text-primary">Links</p>
        <p className="type-caption mt-1 mb-4 max-w-[38rem]">
          One dress, worn by prose TextLink and the Button link variant alike. The
          underline is load-bearing — colour is never a link&rsquo;s only marker. The
          ink is the AA accent-readable token, so it re-scopes with the ground:
          gold-deep on the light surfaces, gold-bright on espresso and navy, the
          family&rsquo;s deep tone inside an atmosphere.
        </p>
        <div className="rounded-md border border-fine bg-surface-raised p-5">
          <p className="type-body max-w-[38rem] text-secondary">
            At rest a link is already underlined — like{' '}
            <TextLink href="#">this passage to the library</TextLink> — on hover the
            ink deepens to the reading ink and the line thickens, and keyboard focus
            draws the house ring. Visited stays unstyled: the Maison does not
            remember where you have been.
          </p>
        </div>
      </div>

      <div>
        <p className="type-body-ui text-primary">Motion</p>
        <p className="type-caption mt-1 mb-4 max-w-[38rem]">
          The house choreography is asymmetric on purpose: quick to answer, unhurried
          to let go. Every moving thing shares the same ease.
        </p>
        <div className="mb-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {TIMING.map(({ move, value, note }) => (
            <div key={move} className="flex items-baseline gap-3">
              <p className="type-body-ui w-14 shrink-0 text-primary">{move}</p>
              <p className="type-caption" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <span className="text-accent-readable">{value}</span> &middot; {note}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button>Hover, press, hold</Button>
          <Button variant="ghost">Feel the timing</Button>
          <Button loading>Gathering wonder</Button>
          <HeartToggle variant="chip" aria-label="Save this" />
        </div>
        <p className="type-caption mt-5 max-w-[38rem]">
          This browser is currently asking for{' '}
          <span className="text-primary">{reducedMotion ? 'reduced' : 'full'}</span>{' '}
          motion. Under reduced motion nothing goes dead — state changes still land,
          they just stop travelling: transitions collapse to 0s, the lift and press
          stop moving, the primary&rsquo;s sheen and the heart&rsquo;s burst are
          withheld, and the loading star stops turning and winks instead.
        </p>
      </div>
    </div>
  );
}
