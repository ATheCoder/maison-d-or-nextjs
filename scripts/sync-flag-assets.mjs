/**
 * Copy the SVG flag for every country in lib/countries.ts from the flag-icons
 * package (devDependency) into public/flags/, where FlagSealMedallion serves
 * them as /flags/<iso2-lowercase>.svg. public/flags/ is committed, so a
 * production install without devDependencies still ships every flag.
 *
 *   node scripts/sync-flag-assets.mjs            # copy + prune orphans
 *   node scripts/sync-flag-assets.mjs --check    # exit 1 if out of sync
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES } from '../lib/countries.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'node_modules', 'flag-icons', 'flags', '4x3');
const outDir = join(root, 'public', 'flags');
const check = process.argv.includes('--check');

if (!existsSync(srcDir)) {
  console.error(`flag-icons not installed — expected ${srcDir}. Run \`npm install\` first.`);
  process.exit(1);
}

const wanted = new Map(COUNTRIES.map((c) => [`${c.code.toLowerCase()}.svg`, c]));
const existing = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.svg')) : [];

const missingSource = [];
const stale = [];
for (const [file] of wanted) {
  const src = join(srcDir, file);
  if (!existsSync(src)) { missingSource.push(file); continue; }
  const dest = join(outDir, file);
  if (!existsSync(dest) || readFileSync(src, 'utf8') !== readFileSync(dest, 'utf8')) stale.push(file);
}
const orphans = existing.filter((f) => !wanted.has(f));

if (missingSource.length) {
  console.error(`No source SVG in flag-icons for: ${missingSource.join(', ')}`);
  process.exit(1);
}

if (check) {
  if (stale.length || orphans.length) {
    if (stale.length) console.error(`Missing/outdated in public/flags: ${stale.join(', ')}`);
    if (orphans.length) console.error(`Orphans in public/flags (not in COUNTRIES): ${orphans.join(', ')}`);
    process.exit(1);
  }
  console.log(`public/flags is in sync (${wanted.size} flags).`);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
for (const file of stale) copyFileSync(join(srcDir, file), join(outDir, file));
for (const file of orphans) { unlinkSync(join(outDir, file)); console.log(`removed orphan ${file}`); }

const totalBytes = readdirSync(outDir)
  .filter((f) => f.endsWith('.svg'))
  .reduce((sum, f) => sum + statSync(join(outDir, f)).size, 0);
console.log(`${wanted.size} flags in public/flags (${stale.length} copied, ${orphans.length} pruned), ${(totalBytes / 1024).toFixed(0)} KB total.`);
