#!/usr/bin/env node
/**
 * Generate a complete Golden Story — text, art prompts and images — for a
 * historical figure, in the shape of public/stories/leonardo/story.json.
 *
 * Thin CLI over lib/golden-story/ (the writer, prompt blocks, slot table,
 * renderer and story.json assembly now live in the shared module so the editor
 * and this script produce byte-identical output). Node's built-in TypeScript
 * stripping loads the .ts module directly — no build step.
 *
 * OpenRouter variant: same models, one key.
 *   text   anthropic/claude-opus-4.8   (chat completions + structured outputs)
 *   images openai/gpt-image-2          (POST /api/v1/images)
 *
 * Usage:
 *   node --env-file=.env --env-file-if-exists=.env.local scripts/generate-story-openrouter.mjs "Marie Curie"
 *   node ... scripts/generate-story-openrouter.mjs "Marie Curie" --prompts-only   # no image API calls
 *   node ... scripts/generate-story-openrouter.mjs "Marie Curie" --reuse-brief    # skip the writer, reuse art/raw/<slug>/brief.json
 *   node ... scripts/generate-story-openrouter.mjs "Marie Curie" --quality high   # image quality (default medium)
 *   node ... scripts/generate-story-openrouter.mjs "Marie Curie" --only cover,chapter-1,timeline-1   # render only these slots
 *
 * Needs OPENROUTER_API_KEY.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { writeBrief } from '../lib/golden-story/brief.ts';
import { buildSlots, toPromptsMd } from '../lib/golden-story/prompts.ts';
import { renderImage } from '../lib/golden-story/images.ts';
import { toStoryJson } from '../lib/golden-story/storyJson.ts';

// ---------------------------------------------------------------------------
// Local rendering: write PNGs straight into public/stories/<slug>/ with retry
// and bounded concurrency (the editor renders to R2 instead — Phase 6).
// ---------------------------------------------------------------------------

async function renderAll(slots, outDir, quality, concurrency = 3) {
  const queue = [...slots.entries()];
  const failed = [];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [i, slot] = next;
      const dest = path.join(outDir, slot.file);
      for (let attempt = 1; ; attempt++) {
        try {
          const png = await renderImage(slot.prompt, slot.size, quality);
          await writeFile(dest, png);
          console.log(`  [${i + 1}/${slots.length}] ${slot.file}`);
          break;
        } catch (err) {
          if (attempt >= 2) {
            console.error(`  [${i + 1}/${slots.length}] FAILED ${slot.file}: ${err.message}`);
            failed.push(slot.file);
            break;
          }
          console.warn(`  retrying ${slot.file}: ${err.message}`);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return failed;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const WRITER_MODEL = 'anthropic/claude-opus-4.8';
const IMAGE_MODEL = 'openai/gpt-image-2';

const args = process.argv.slice(2);
const personName = args.find((a) => !a.startsWith('--'));
const promptsOnly = args.includes('--prompts-only');
const reuseBrief = args.includes('--reuse-brief');
const quality = args.includes('--quality') ? args[args.indexOf('--quality') + 1] : 'medium';
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;

if (!personName) {
  console.error('Usage: generate-story-openrouter.mjs "<Person Name>" [--prompts-only] [--reuse-brief] [--quality low|medium|high]');
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY && !(reuseBrief && promptsOnly)) {
  console.error('OPENROUTER_API_KEY is not set.');
  process.exit(1);
}

const slug = personName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const rawDir = path.join('art', 'raw', slug);
const outDir = path.join('public', 'stories', slug);
const briefPath = path.join(rawDir, 'brief.json');

await mkdir(rawDir, { recursive: true });
await mkdir(outDir, { recursive: true });

let brief;
if (reuseBrief) {
  brief = JSON.parse(await readFile(briefPath, 'utf8'));
  console.log(`Reusing brief: ${briefPath}`);
} else {
  console.log(`Writing story for ${personName} (${WRITER_MODEL} via OpenRouter)...`);
  // Explicitly the flip-book. This CLI writes to public/stories/<slug>/ in the
  // story.json shape <GoldenStory> consumes, and buildSlots/toStoryJson below
  // both speak that book — the Book Edition is generated from the admin editor,
  // where its rooms can be edited and its art slots opened.
  brief = await writeBrief(personName, 'classic');
  await writeFile(briefPath, JSON.stringify(brief, null, 2));
  console.log(`  golden thread: ${brief.golden_thread}`);
}

const slots = buildSlots(brief);
await writeFile(path.join(rawDir, 'prompts.md'), toPromptsMd(brief, slots));
await writeFile(path.join(outDir, 'story.json'), JSON.stringify(toStoryJson(brief, slug), null, 2) + '\n');
console.log(`Wrote ${outDir}/story.json and ${rawDir}/prompts.md (${slots.length} image slots)`);

if (promptsOnly) {
  console.log('--prompts-only: skipping image generation.');
  process.exit(0);
}

let toRender = slots;
if (only) {
  toRender = slots.filter((s) => only.includes(s.file.replace(/\.png$/, '')));
  const known = slots.map((s) => s.file.replace(/\.png$/, ''));
  const unknown = only.filter((name) => !known.includes(name));
  if (unknown.length) {
    console.error(`Unknown slot(s): ${unknown.join(', ')}\nAvailable: ${known.join(', ')}`);
    process.exit(1);
  }
}

console.log(`Rendering ${toRender.length} images (${IMAGE_MODEL} via OpenRouter, quality=${quality})...`);
const failed = await renderAll(toRender, outDir, quality);
if (failed.length) {
  console.error(`\n${failed.length} image(s) failed: ${failed.join(', ')}`);
  console.error('Re-run with --reuse-brief --only <failed slots> to retry without rewriting the text.');
  process.exit(1);
}

console.log(`\nDone. Story at ${outDir}/story.json — brief and prompts kept in ${rawDir}/ for regeneration.`);
