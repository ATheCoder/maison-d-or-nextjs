// Compiles app/globals.css (Tailwind v4 source) into a static stylesheet the
// design-sync converter can ship as cfg.cssEntry.
//
// Why this exists: globals.css starts with `@import "tailwindcss"`, which only
// resolves through the Tailwind compiler. Running the repo's own postcss plugin
// keeps the output faithful to what `next build` produces.
//
// Sources scanned for utility classes are pinned explicitly (components/, app/,
// and the authored previews) so the emitted utilities cover every preview card.
//
// Usage: node .design-sync/build-css.mjs
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const IN = join(REPO, 'app/globals.css');
const OUT = join(REPO, '.design-sync/.cache/globals.compiled.css');

const src = readFileSync(IN, 'utf8');
// Pin the content sources: Tailwind v4's auto-detection starts from the CSS
// file's own tree and respects .gitignore, which would miss ds-bundle/.
const withSources = src.replace(
  /@import\s+"tailwindcss";/,
  [
    '@import "tailwindcss";',
    '@source "../components";',
    '@source "../app";',
    '@source "../lib";',
    '@source "../.design-sync/previews";',
  ].join('\n'),
);

const result = await postcss([tailwind()]).process(withSources, { from: IN, to: OUT });
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, result.css);
console.log(`wrote ${OUT} (${(result.css.length / 1024).toFixed(1)} KB)`);
