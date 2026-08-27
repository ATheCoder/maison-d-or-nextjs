'use client';

import { useEffect, useRef, useState } from 'react';
import { Chip, Prose } from '@/components/ds';

/**
 * §5.6 — WCAG contrast for every text/surface pair in use, measured, not
 * asserted. Probe elements under each data-surface scope resolve the semantic
 * vars to real colors in the browser (getComputedStyle on a color property —
 * the only reliable route, since the raised/tint surfaces are color-mix()
 * values a stylesheet reader can't do arithmetic on).
 *
 * Every pair is graded against ITS OWN floor (the PO's correction — non-text
 * was previously shown as failing a 4.5 bar it was never held to):
 *   4.5 — body and all functional small text (AA);
 *   3.0 — metadata (text-faint, which never carries load-bearing
 *         information) and non-text glyphs (WCAG 1.4.11);
 *   decorative — no floor, and therefore never allowed to carry meaning:
 *         bare accent gold and the family mid-tones are rules, ornaments and
 *         display sizes only. Functional small text wears accent-readable.
 * Since the rebalance the dark scopes re-scope text-faint (ink-on-dark-faint)
 * and accent-readable (gold-bright), so those rows now measure real tokens,
 * not stray-class accidents.
 *
 * The page-wide themes need no rows of their own: each [data-theme] selector
 * shares its declaration block with the [data-surface] scope measured here
 * (parchment = the bare :root), so these measurements ARE the theme
 * measurements by construction.
 */
type Scope = 'light' | 'sage' | 'rose' | 'lavender' | 'periwinkle' | 'dark' | 'navy';
type Rgb = [number, number, number];

const SCOPES: Scope[] = ['light', 'sage', 'rose', 'lavender', 'periwinkle', 'dark', 'navy'];
const LIGHTS: Scope[] = ['light', 'sage', 'rose', 'lavender', 'periwinkle'];
const TRIO: Scope[] = ['light', 'dark', 'navy'];

const SCOPE_LABEL: Record<Scope, string> = {
  light: 'Light (parchment)',
  sage: 'Sage — the garden',
  rose: 'Rose — the family',
  lavender: 'Lavender — the evening',
  periwinkle: 'Periwinkle — the sky',
  dark: 'Dark (espresso)',
  navy: 'Navy',
};

const TOKENS = [
  '--text-primary',
  '--text-secondary',
  '--text-faint',
  '--accent',
  '--accent-readable',
  '--surface-page',
  '--surface-raised',
  '--surface-tint',
  '--btn-primary-fg',
  '--btn-primary-bg',
  '--btn-primary-fg-hover',
  '--btn-primary-bg-hover',
  '--btn-ghost-fg-hover',
  '--btn-ghost-bg-hover',
  '--heart-saved',
  '--danger',
  '--danger-readable',
  '--success-readable',
] as const;

// floor: 4.5 = body/functional text (AA), 3 = metadata & non-text (1.4.11),
// 0 = decorative — exempt, and forbidden from carrying meaning.
const PAIRS: { fg: string; bg: string; use: string; floor: 4.5 | 3 | 0; scopes: Scope[] }[] = [
  { fg: '--text-primary', bg: '--surface-page', use: 'Body copy', floor: 4.5, scopes: SCOPES },
  { fg: '--text-secondary', bg: '--surface-page', use: 'Secondary copy, captions', floor: 4.5, scopes: SCOPES },
  { fg: '--text-primary', bg: '--surface-raised', use: 'Body on raised cards', floor: 4.5, scopes: SCOPES },
  { fg: '--text-secondary', bg: '--surface-raised', use: 'Captions on raised cards', floor: 4.5, scopes: SCOPES },
  // Tint exists on every ground since the environments merged into the
  // primitives stamps: the family wash in the atmospheres, sand on parchment,
  // a step into the dark on the interludes — so body-on-tint is graded
  // house-wide. Secondary-on-tint is still only composed on light grounds.
  { fg: '--text-primary', bg: '--surface-tint', use: 'Body on tinted panels, table rows', floor: 4.5, scopes: SCOPES },
  { fg: '--text-secondary', bg: '--surface-tint', use: 'Captions on tinted panels', floor: 4.5, scopes: LIGHTS },
  { fg: '--text-faint', bg: '--surface-page', use: 'Metadata, disabled — never load-bearing', floor: 3, scopes: SCOPES },
  { fg: '--text-faint', bg: '--surface-raised', use: 'Card captions — metadata on raised cards', floor: 3, scopes: SCOPES },
  { fg: '--accent-readable', bg: '--surface-page', use: 'Links, editorial labels, small functional text', floor: 4.5, scopes: SCOPES },
  { fg: '--accent-readable', bg: '--surface-tint', use: 'Links and labels on tinted panels', floor: 4.5, scopes: LIGHTS },
  { fg: '--accent', bg: '--surface-page', use: 'Rules, ornaments, display sizes — decorative only', floor: 0, scopes: SCOPES },
  // Button coats are UI text and held to the 4.5 floor. The coats are house
  // tokens the atmosphere scopes do not repaint, so the light row speaks for
  // all five light grounds; ghost's rest state is text-primary/surface-page.
  { fg: '--btn-primary-fg', bg: '--btn-primary-bg', use: 'Primary button, rest', floor: 4.5, scopes: TRIO },
  { fg: '--btn-primary-fg-hover', bg: '--btn-primary-bg-hover', use: 'Primary button, hover', floor: 4.5, scopes: TRIO },
  { fg: '--btn-ghost-fg-hover', bg: '--btn-ghost-bg-hover', use: 'Ghost button, hover', floor: 4.5, scopes: TRIO },
  // The heart is a glyph, not text: WCAG 1.4.11 non-text contrast, 3.0 floor.
  // The bare variant sits straight on the page; the chip on the raised surface.
  { fg: '--heart-saved', bg: '--surface-page', use: 'Saved heart, bare (non-text)', floor: 3, scopes: SCOPES },
  { fg: '--heart-saved', bg: '--surface-raised', use: 'Saved heart on its chip (non-text)', floor: 3, scopes: SCOPES },
  // Errors are functional: the message under a field is small text held to
  // 4.5 on the ground it sits on; the invalid border is non-text (1.4.11)
  // against both the field's raised fill and the page behind it. The danger
  // tokens are house-wide — the atmospheres do not repaint them (an error
  // does not dress for the room) — so each scope row measures the one
  // terracotta/rose pair against its own grounds.
  { fg: '--danger-readable', bg: '--surface-page', use: 'Error message under a field', floor: 4.5, scopes: SCOPES },
  { fg: '--danger', bg: '--surface-raised', use: 'Invalid field border on its fill (non-text)', floor: 3, scopes: SCOPES },
  { fg: '--danger', bg: '--surface-page', use: 'Invalid field border on the page (non-text)', floor: 3, scopes: SCOPES },
  // Confirmations are functional small text on the same terms errors are, and
  // they get the same house-wide treatment: one token per scope, forest on the
  // light five and sage on the two interludes where forest disappears. There
  // is no non-text tier to grade because there is no success BORDER anywhere
  // in the house — see the token's own note in globals.css §1. Both grounds
  // are measured because a "Saved." line lands on a card as often as on paint.
  { fg: '--success-readable', bg: '--surface-page', use: 'Confirmation message', floor: 4.5, scopes: SCOPES },
  { fg: '--success-readable', bg: '--surface-raised', use: 'Confirmation on a raised card', floor: 4.5, scopes: SCOPES },
];

function parseColor(value: string): Rgb | null {
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const srgb = value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255];
  return null;
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Measured = Record<Scope, Record<string, Rgb | null>>;

export default function ContrastTable() {
  const probeRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);

  useEffect(() => {
    const root = probeRef.current;
    if (!root) return;
    const result = {} as Measured;
    for (const scopeEl of root.querySelectorAll<HTMLElement>('[data-scope]')) {
      const scope = scopeEl.dataset.scope as Scope;
      result[scope] = {};
      for (const token of TOKENS) {
        const span = document.createElement('span');
        span.style.color = `var(${token})`;
        scopeEl.appendChild(span);
        result[scope][token] = parseColor(getComputedStyle(span).color);
        span.remove();
      }
    }
    setMeasured(result);
  }, []);

  return (
    <div>
      <div ref={probeRef} aria-hidden className="pointer-events-none invisible absolute">
        {SCOPES.map((scope) => (
          <div key={scope} data-scope={scope} data-surface={scope === 'light' ? undefined : scope} />
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={{ minWidth: '46rem' }}>
          <thead>
            <tr className="border-b border-fine">
              {['Pair', 'Sample', 'Use', 'Ratio', 'Floor', 'Verdict'].map((h) => (
                <th key={h} className="type-label-editorial py-2 pr-4 font-normal text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          {SCOPES.map((scope) => (
            <tbody key={scope}>
              <tr>
                <td colSpan={6} className="type-body-ui pt-6 pb-2 text-accent-readable">
                  {SCOPE_LABEL[scope]}
                </td>
              </tr>
              {PAIRS.filter((p) => p.scopes.includes(scope)).map((pair) => {
                const fg = measured?.[scope]?.[pair.fg];
                const bg = measured?.[scope]?.[pair.bg];
                const r = fg && bg ? ratio(fg, bg) : null;
                const pass = r != null && pair.floor > 0 ? r >= pair.floor : null;
                // A failure against a pair's own floor is loud (primary ink,
                // 600); decorative rows have no floor to fail.
                const failsFloor = pass === false;
                return (
                  <tr key={pair.fg + pair.bg} className="border-b border-fine">
                    <td className="type-body-ui py-2.5 pr-4 whitespace-nowrap">
                      <span className="text-primary">{pair.fg.slice(2)}</span>
                      <span className="text-faint"> / {pair.bg.slice(2)}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      {/* Scoped wrapper so the vars resolve to this tbody's
                          surface, not the page's — light needs no attribute. */}
                      <span aria-hidden data-surface={scope === 'light' ? undefined : scope} className="inline-block">
                        <Chip
                          className="h-8 min-w-14 justify-center"
                          style={{ backgroundColor: `var(${pair.bg})`, color: `var(${pair.fg})` }}
                        >
                          {pair.fg === '--heart-saved' ? '♥' : 'Aa'}
                        </Chip>
                      </span>
                    </td>
                    <td className="type-caption py-2.5 pr-4">{pair.use}</td>
                    <td className="type-body-ui py-2.5 pr-4 text-primary tabular-nums">
                      {r != null ? `${r.toFixed(2)} : 1` : '—'}
                    </td>
                    <td className="type-body-ui py-2.5 pr-4 text-secondary tabular-nums">
                      {pair.floor > 0 ? `${pair.floor.toFixed(1)} : 1` : '—'}
                    </td>
                    <td
                      className={`type-body-ui py-2.5 ${failsFloor ? 'font-semibold text-primary' : 'text-secondary'}`}
                    >
                      {pair.floor === 0 ? 'Decorative' : pass == null ? '—' : pass ? 'Pass ✓' : 'FAIL ✗'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      <Prose variant="caption" className="mt-4">
        Each pair is graded against its own floor: 4.5:1 for body and all functional small
        text, 3.0:1 for metadata and non-text glyphs (WCAG 1.4.11). text-faint never carries
        information a visitor genuinely needs. Decorative rows — bare gold and the family
        mid-tones — have no floor and may never carry meaning: anything functional at small
        sizes wears accent-readable, and links are underlined so colour is never their only
        marker.
      </Prose>
    </div>
  );
}
