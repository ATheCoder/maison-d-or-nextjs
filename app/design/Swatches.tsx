'use client';

import { useSyncExternalStore } from 'react';
import { Prose, Swatch } from '@/components/ds';

/**
 * §5.1 — the raw palette as swatches, name + hex. The one place in app code
 * where raw --palette-* names may appear (§1.2 bans them from components;
 * displaying the palette IS this page's job). The hex labels are read from
 * the computed stylesheet at mount instead of being duplicated here: §5 says
 * the values get tuned by eye in globals.css, and a hardcoded copy would go
 * stale silently — and would put hex literals back into component code.
 */
const GROUPS: { title: string; note: string; names: string[]; triads?: boolean }[] = [
  {
    title: 'Foundation',
    note: 'Warm, aged, never sterile white. The Maison breathes through the light surfaces; espresso and navy are cinematic interludes, never the dominant experience.',
    names: ['ivory', 'parchment', 'sand', 'walnut', 'espresso', 'navy'],
  },
  {
    title: 'Accents',
    note: 'Gold means discovery, precious moments and important actions; gold-deep is its AA-readable ink for links and small labels. Forest, terracotta and sea season imagery and small details.',
    names: ['gold', 'gold-bright', 'gold-deep', 'forest', 'terracotta', 'sea'],
  },
  {
    title: 'Atmosphere families',
    note: 'Sage (nature, the garden, grounding), rose (family, tenderness, memory), lavender (imagination, evening, gentle mystery) and periwinkle (the sky, weather, open curiosity) as complete families — pale surface, main accent, deep readable tone. One dominant atmospheric accent per section; supporting colours may appear in imagery and very small details.',
    names: [
      'sage-pale', 'sage', 'sage-deep',
      'rose-pale', 'rose', 'rose-deep',
      'lavender-pale', 'lavender', 'lavender-deep',
      'periwinkle-pale', 'periwinkle', 'periwinkle-deep',
    ],
    triads: true,
  },
  {
    title: 'Ink',
    note: 'Text is warm-dark, never pure black.',
    names: ['ink', 'ink-muted', 'ink-faint', 'ink-on-dark', 'ink-on-dark-muted', 'ink-on-dark-faint'],
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
          <Prose variant="caption" measure={false} className="mt-1 mb-4">
            {group.note}
          </Prose>
          {/* Triad groups hold three columns at every width, so each row
              reads as one family: pale → accent → deep. */}
          <div className={`grid gap-4 ${group.triads ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
            {group.names.map((name) => (
              <Swatch
                key={name}
                color={`var(--palette-${name})`}
                label={name}
                caption={hex[name] ?? '…'}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
