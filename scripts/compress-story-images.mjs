/**
 * Compress a story's images for the web: convert every .png/.jpg in
 * public/stories/<slug>/ to WebP, move the originals to art/originals/<slug>/
 * (as a backup, outside public/ so they aren't served or deployed), and
 * rewrite the story.json image_url fields to point at the .webp files.
 *
 *   npm run compress:story <slug> [<slug> ...]
 *   npm run compress:story -- --all
 *   npm run compress:story -- leonardo --quality 90
 *
 * Notes:
 * - Idempotent: files whose .webp already exists are skipped, so re-running
 *   on an already-compressed story is a no-op.
 * - The .webp extension matters to the template: Plate in GoldenStory.jsx
 *   renders .webp/.png as pipeline art (multiply-blended into the parchment,
 *   no vignette card). Converting a .jpg therefore also switches it to that
 *   treatment.
 * - For brand-new raw generations, prefer the full pipeline
 *   (scripts/prepare-art.py, see docs/golden-story-art-pipeline.md), which
 *   also does knockout/paint processing and already outputs WebP. This script
 *   is for finished art that landed in public/stories/ as PNG/JPG.
 */
import sharp from 'sharp';
import { readdir, readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'public/stories';
const BACKUP = 'art/originals';
const QUALITY = 82; // visually lossless for this art; see docs/golden-story-art-pipeline.md

const args = process.argv.slice(2);
const qIdx = args.indexOf('--quality');
const quality = qIdx !== -1 ? Number(args.splice(qIdx, 2)[1]) : QUALITY;
const slugs = args.includes('--all')
  ? (await readdir(ROOT, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
  : args;

if (!slugs.length || Number.isNaN(quality)) {
  console.error('usage: npm run compress:story <slug> [<slug> ...] | -- --all [--quality N]');
  process.exit(1);
}

let beforeTotal = 0;
let afterTotal = 0;

for (const slug of slugs) {
  const dir = path.join(ROOT, slug);
  const files = await readdir(dir); // throws loudly if the slug doesn't exist
  const images = files.filter((f) => /\.(png|jpe?g)$/i.test(f));
  if (!images.length) {
    console.log(`${slug}: no .png/.jpg files, nothing to do`);
    continue;
  }

  const backupDir = path.join(BACKUP, slug);
  await mkdir(backupDir, { recursive: true });
  const renames = []; // [oldName, newName]

  for (const f of images) {
    const src = path.join(dir, f);
    const out = f.replace(/\.(png|jpe?g)$/i, '.webp');
    if (files.includes(out)) {
      console.log(`SKIP ${slug}/${f}: ${out} already exists`);
      continue;
    }
    const before = (await stat(src)).size;
    await sharp(src).webp({ quality, effort: 6 }).toFile(path.join(dir, out));
    const after = (await stat(path.join(dir, out))).size;
    beforeTotal += before;
    afterTotal += after;
    await rename(src, path.join(backupDir, f));
    renames.push([f, out]);
    console.log(`${slug}/${f} -> ${out}  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
  }

  if (files.includes('story.json') && renames.length) {
    const jsonPath = path.join(dir, 'story.json');
    let text = await readFile(jsonPath, 'utf8');
    for (const [oldName, newName] of renames) text = text.split(oldName).join(newName);
    await writeFile(jsonPath, text);
    console.log(`${slug}/story.json rewritten`);
  }
}

console.log(`\nTOTAL: ${(beforeTotal / 1048576).toFixed(1)}MB -> ${(afterTotal / 1048576).toFixed(1)}MB`);
