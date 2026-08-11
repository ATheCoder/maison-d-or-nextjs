'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * §5.6 — WCAG contrast for every text/surface pair in use, measured, not
 * asserted. Probe elements under each data-surface scope resolve the semantic
 * vars to real colors in the browser (getComputedStyle on a color property —
 * the only reliable route, since the raised surfaces are color-mix() values
 * a stylesheet reader can't do arithmetic on). §1.3 sets the floor: body
 * pairs must clear AA 4.5; labels/metadata are reported against AA-Large 3.0.
 * text-faint and accent are deliberately shown on the dark scopes too — the
 * scopes don't re-scope them, and the table should say so out loud rather
 * than hide the pairs a stray class would actually produce.
 */
type Scope = 'light' | 'dark' | 'navy';
type Rgb = [number, number, number];

const SCOPES: Scope[] = ['light', 'dark', 'navy'];

const TOKENS = [
  '--text-primary',
  '--text-secondary',
  '--text-faint',
  '--accent',
  '--surface-page',
  '--surface-raised',
  '--surface-tint',
  '--btn-primary-fg',
  '--btn-primary-bg',
  '--btn-primary-fg-hover',
  '--btn-primary-bg-hover',
  '--btn-ghost-fg-hover',
  '--btn-ghost-bg-hover',
] as const;

const PAIRS: { fg: string; bg: string; use: string; body: boolean; scopes: Scope[] }[] = [
  { fg: '--text-primary', bg: '--surface-page', use: 'Body copy', body: true, scopes: SCOPES },
  { fg: '--text-secondary', bg: '--surface-page', use: 'Secondary copy, captions', body: true, scopes: SCOPES },
  { fg: '--text-primary', bg: '--surface-raised', use: 'Body on raised cards', body: true, scopes: SCOPES },
  { fg: '--text-secondary', bg: '--surface-raised', use: 'Captions on raised cards', body: true, scopes: SCOPES },
  { fg: '--text-primary', bg: '--surface-tint', use: 'Body on tinted panels, table rows', body: true, scopes: ['light'] },
  { fg: '--text-secondary', bg: '--surface-tint', use: 'Captions on tinted panels', body: true, scopes: ['light'] },
  { fg: '--text-faint', bg: '--surface-page', use: 'Metadata, disabled', body: false, scopes: SCOPES },
  { fg: '--accent', bg: '--surface-page', use: 'Editorial labels, links', body: false, scopes: SCOPES },
  // Button coats are UI text and held to the same 4.5 floor. Ghost's rest
  // state is the text-primary/surface-page row above; only the fills are new.
  { fg: '--btn-primary-fg', bg: '--btn-primary-bg', use: 'Primary button, rest', body: true, scopes: SCOPES },
  { fg: '--btn-primary-fg-hover', bg: '--btn-primary-bg-hover', use: 'Primary button, hover', body: true, scopes: SCOPES },
  { fg: '--btn-ghost-fg-hover', bg: '--btn-ghost-bg-hover', use: 'Ghost button, hover', body: true, scopes: SCOPES },
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
        <div data-scope="light" />
        <div data-scope="dark" data-surface="dark" />
        <div data-scope="navy" data-surface="navy" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={{ minWidth: '40rem' }}>
          <thead>
            <tr className="border-b border-fine">
              {['Pair', 'Use', 'Ratio', 'AA 4.5', 'AA-Large 3.0'].map((h) => (
                <th key={h} className="type-label-editorial py-2 pr-4 font-normal text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          {SCOPES.map((scope) => (
            <tbody key={scope}>
              <tr>
                <td colSpan={5} className="type-body-ui pt-6 pb-2 text-accent">
                  {scope === 'light' ? 'Light (parchment)' : scope === 'dark' ? 'Dark (espresso)' : 'Navy'}
                </td>
              </tr>
              {PAIRS.filter((p) => p.scopes.includes(scope)).map((pair) => {
                const fg = measured?.[scope]?.[pair.fg];
                const bg = measured?.[scope]?.[pair.bg];
                const r = fg && bg ? ratio(fg, bg) : null;
                const aa = r != null ? r >= 4.5 : null;
                const aaLarge = r != null ? r >= 3 : null;
                // Body pairs are held to §1.3's AA floor: a failure there is
                // loud (primary ink, 600); elsewhere it's information.
                const failsFloor = pair.body && aa === false;
                return (
                  <tr key={pair.fg + pair.bg} className="border-b border-fine">
                    <td className="type-body-ui py-2.5 pr-4 whitespace-nowrap">
                      <span
                        aria-hidden
                        className="mr-2 inline-block h-3 w-3 rounded-sm border border-fine align-middle"
                        style={{ backgroundColor: `var(${pair.bg})` }}
                      >
                        <span
                          className="mx-auto mt-0.5 block h-1.5 w-1.5 rounded-sm"
                          style={{ backgroundColor: `var(${pair.fg})` }}
                        />
                      </span>
                      <span className="text-primary">{pair.fg.slice(2)}</span>
                      <span className="text-faint"> / {pair.bg.slice(2)}</span>
                    </td>
                    <td className="type-caption py-2.5 pr-4">{pair.use}</td>
                    <td className="type-body-ui py-2.5 pr-4 text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {r != null ? `${r.toFixed(2)} : 1` : '—'}
                    </td>
                    <td
                      className={`type-body-ui py-2.5 pr-4 ${failsFloor ? 'font-semibold text-primary' : 'text-secondary'}`}
                    >
                      {aa == null ? '—' : aa ? 'Pass ✓' : pair.body ? 'FAIL ✗' : 'Below ✗'}
                    </td>
                    <td className="type-body-ui py-2.5 text-secondary">
                      {aaLarge == null ? '—' : aaLarge ? 'Pass ✓' : 'Below ✗'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      <p className="type-caption mt-4 max-w-[38rem]">
        Body pairs must clear AA 4.5:1 (§1.3). text-faint and accent are held to AA-Large —
        they never carry body copy — and are listed on the dark scopes because the scopes do
        not re-scope them: what the table shows is what a stray class would render.
      </p>
    </div>
  );
}
