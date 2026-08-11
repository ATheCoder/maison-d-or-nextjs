'use client';

import { useSyncExternalStore } from 'react';

/**
 * §5.1 — the raw palette as swatches, name + hex. The one place in app code
 * where raw --palette-* names may appear (§1.2 bans them from components;
 * displaying the palette IS this page's job). The hex labels are read from
 * the computed stylesheet at mount instead of being duplicated here: §5 says
 * the values get tuned by eye in globals.css, and a hardcoded copy would go
 * stale silently — and would put hex literals back into component code.
 */
const GROUPS: { title: string; note: string; names: string[] }[] = [
  {
    title: 'Foundation',
    note: 'Warm, aged, never sterile white.',
    names: ['ivory', 'parchment', 'sand', 'walnut', 'espresso', 'navy'],
  },
  {
    title: 'Accents',
    note: 'Gold leads; terracotta, rose and lavender are seasoning — max one per view.',
    names: ['gold', 'gold-bright', 'forest', 'sage', 'terracotta', 'sea', 'rose', 'lavender'],
  },
  {
    title: 'Ink',
    note: 'Text is warm-dark, never pure black.',
    names: ['ink', 'ink-muted', 'ink-faint', 'ink-on-dark', 'ink-on-dark-muted'],
  },
];

// The stylesheet only changes with a reload, so the store never notifies and
// the snapshot is computed once and cached (a stable reference, as the hook
// requires). Server snapshot is empty — hexes appear on hydration.
const EMPTY: Record<string, string> = {};
let hexCache: Record<string, string> | null = null;
const subscribe = () => () => {};
function readHexes(): Record<string, string> {
  if (!hexCache) {
    const styles = getComputedStyle(document.documentElement);
    hexCache = {};
    for (const group of GROUPS) {
      for (const name of group.names) {
        hexCache[name] = styles.getPropertyValue(`--palette-${name}`).trim().toUpperCase();
      }
    }
  }
  return hexCache;
}

export default function Swatches() {
  const hex = useSyncExternalStore(subscribe, readHexes, () => EMPTY);

  return (
    <div className="space-y-10">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="type-body-ui text-primary">{group.title}</p>
          <p className="type-caption mt-1 mb-4">{group.note}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {group.names.map((name) => (
              <div key={name}>
                <div
                  className="h-16 rounded-sm border border-fine"
                  style={{ backgroundColor: `var(--palette-${name})` }}
                />
                <p className="type-body-ui mt-2 text-primary">{name}</p>
                <p className="type-caption" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {hex[name] ?? '…'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
