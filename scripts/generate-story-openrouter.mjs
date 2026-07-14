#!/usr/bin/env node
/**
 * Generate a complete Golden Story — text, art prompts and images — for a
 * historical figure, in the shape of public/stories/leonardo/story.json.
 *
 * OpenRouter variant of scripts/generate-story.mjs: same models, one key.
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
 * Pipeline (see docs/golden-story-specification.md; prompt blocks adapted from
 * docs/golden-story-art-pipeline.md):
 *   1. Claude writes the story + one SUBJECT scene per image slot (structured JSON).
 *   2. Prompts are assembled from the fixed STYLE / STRIP-BLEED / SINGLE-BLEED /
 *      PAPER / OPAQUE blocks.
 *   3. gpt-image-2 renders PNGs straight into public/stories/<slug>/ — no
 *      prepare-art.py, no background removal. Art destined for the site's
 *      multiply blend is prompted onto plain white, which the blend melts into
 *      the parchment; opaque slots (cover, modern, final chapter spread) get
 *      blend:"normal" in story.json, mirroring public/stories/leonardo/story.json.
 *   4. story.json is written pointing at the PNGs.
 *
 * Needs OPENROUTER_API_KEY.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OPENROUTER = 'https://openrouter.ai/api/v1';
const WRITER_MODEL = 'anthropic/claude-opus-4.8';
const IMAGE_MODEL = 'openai/gpt-image-2';

// ---------------------------------------------------------------------------
// Fixed prompt blocks — adapted from docs/golden-story-art-pipeline.md for
// direct rendering with NO post-processing. The images ship as-is, so art that
// the site renders with mix-blend-mode: multiply must sit on plain flat WHITE
// (#FFFFFF): multiply makes pure white vanish into the page's own parchment
// (this is how the leonardo PNGs work — their corners are pure white).
// Keep every block except the per-slot SUBJECT byte-identical across a story.
// ---------------------------------------------------------------------------

const STYLE = `Richly detailed children's storybook illustration in classic European picture-book style: layered watercolor and gouache washes over fine brown-ink linework, painterly texture with deep warm shadows. Full-color but aged, warm palette — terracotta, chestnut brown, ochre, sage and olive green, dusty blue-grey, cream — bathed in glowing golden-hour light. Not monochrome, not sepia-toned, not line art.`;

// The childhood landscape strip: it sits at the bottom of the page with the
// text above it, so the bottom edge bleeds off the page fully painted, the
// top must dissolve into white where it meets the text, and the sides are
// left to the model — they're cropped by the page edge either way.
const STRIP_BLEED = `The painting fills the entire frame and stays fully finished all the way to the bottom edge, bleeding off the bottom with no fading, no vignette and no white margin there. Toward the top edge the paint becomes progressively paler, looser and unfinished — thin dry washes dissolving into plain white paper, so the top of the frame ends in pure flat white (#FFFFFF) with no texture, no gradients and no shadows. The left and right edges may either stay fully painted to the edge or dissolve softly into white — both are fine. Never a circle, oval or medallion shape. No frame, no border, no text, no lettering, no signature.`;

// Single-leaf chapter plates (page_span "single"): the leaf overlays the
// title + narrative in the top-left, so the art is anchored bottom-right,
// bleeding off the right and bottom edges with NO fading there, and dissolves
// into white only toward the top and left where the text sits.
const SINGLE_BLEED = `The painting is anchored to the bottom-right of the frame: the subject and richest detail sit in the lower right, and the paint stays fully finished all the way to the right edge and the bottom edge, bleeding off those two edges with no fading, no vignette and no white margin there. Only toward the top edge and the left edge does the paint become progressively paler, looser and unfinished — thin dry washes dissolving into plain white paper, leaving the upper-left region of the frame as pure flat white (#FFFFFF) with no texture, no gradients and no shadows. Never a circle, oval or medallion shape. No frame, no border, no text, no lettering, no signature.`;

// The cover: fully opaque, the CSS gradient overlay carries the title.
const COVER_BLEED = `Full-bleed scene filling the entire frame edge to edge, rich background detail, muted warm tones, darker toward the top and bottom edges. No blank margins, no vignette, no frame, no border, no text, no signature.`;

// Other blend:"normal" slots (modern spread, final image-only chapter):
// opaque edge-to-edge art shown as-is.
const OPAQUE = `Full-bleed scene filling the entire frame edge to edge with rich detail everywhere — no blank margins, no vignette, no frame, no border, no text, no lettering, no signature.`;

// Spot art (timeline, treasures) rendered with the multiply blend: subject on
// flat pure white so only the paint prints onto the page.
const PAPER = `Painted directly on a plain white background: a single uniform flat color (#FFFFFF) with no paper texture, no gradients and no shadows in the empty areas. The scene fills almost the entire frame; only at the outer edges does the paint break up and dissolve into untouched white with soft, irregular, feathered watercolor edges — never a circle, oval, or any geometric medallion shape, and never a small image floating in empty space. No frame, no border, no text, no lettering, no signature.`;

// ---------------------------------------------------------------------------
// Story brief — what Claude writes. Counts are enforced by instruction (the
// structured-outputs schema can't express minItems).
// ---------------------------------------------------------------------------

const CHAPTERS = 4;
const TIMELINE = 5;
const TREASURES = 6;
const LESSONS = 4;

const str = { type: 'string' };
const obj = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const BRIEF_SCHEMA = obj({
  name: str,
  role: str,
  field: str,
  country: str,
  birth_date: str,
  death_year: str,
  famous_quote: str,
  golden_thread: str,
  character_sheet: str,
  cover_scene: str,
  story_childhood_title: str,
  story_childhood: str,
  childhood_scene: str,
  story_takeaway: str,
  chapters: { type: 'array', items: obj({ title: str, narrative: str, scene: str }) },
  modern: obj({ title: str, narrative: str, scene: str }),
  timeline: { type: 'array', items: obj({ year: str, caption: str, scene: str }) },
  after_treasures: obj({ title: str, narrative: str, scene: str }),
  treasures: { type: 'array', items: obj({ name: str, scene: str }) },
  lessons: { type: 'array', items: obj({ icon_name: str, lesson: str }) },
});

const WRITER_SYSTEM = `You write "Golden Story" picture-book biographies for Maison d'Ore (ages 5-10, read aloud at bedtime).

Writing rules (from the house specification):
- Every story page is 40-70 words, never more than 75. Sentences of 6-9 words, never more than 12. One small idea per page, never two.
- Break narratives into short stanzas with \\n and \\n\\n line breaks, like a picture book (see rhythm example below).
- Vocabulary a 6-8 year old understands; explain any hard word naturally.
- Never lecture, never "you should". Invite wonder instead.
- Pick one "golden thread" — a single defining human quality (Leonardo: curiosity; Curie: perseverance) — and let it quietly shape every page.
- Emotional curve across the chapters: wonder → curiosity → challenge → hope → achievement.
- Exactly ${CHAPTERS} chapters, ${TIMELINE} timeline milestones (chronological, real years), ${TREASURES} treasures (their most famous works/contributions), ${LESSONS} lessons (icon_name is one lowercase word like "curiosity").

Rhythm example (a chapter narrative):
"Leonardo noticed things\\nothers did not see.\\n\\nThe patterns in leaves.\\nThe shape of clouds.\\n\\nSometimes people thought\\nhe was strange.\\nHe didn't mind."

Field meanings:
- role: short poetic epithet, e.g. "Painter, Inventor & Endless Dreamer".
- story_childhood_title: e.g. "A Little Boy in Vinci". story_childhood: the birth/childhood page.
- story_takeaway: one line, e.g. "Stay curious, and the whole world becomes your workshop."
- modern: "If {Name} Were 10 Today" page — 2 short paragraphs imagining them as a child now.
- after_treasures: the legacy page introducing the treasures ("Gifts That Live On").
- character_sheet: ONE sentence fixing the protagonist's look as a child — age, hair, eyes, clothing authentic to their era, e.g. "Marie as a 10-year-old girl with braided dark blonde hair, grey eyes, a simple charcoal wool dress with a white collar."

Scene descriptions (cover_scene, childhood_scene, chapters[].scene, modern.scene, timeline[].scene, after_treasures.scene, treasures[].scene) are SUBJECT blocks for an image model:
- 1-2 sentences, concrete nouns, one emotional moment, era-authentic clothing, objects and architecture.
- NO style words (no "watercolor", "storybook", "warm palette" — a fixed style block is added separately). No text or lettering in the scene.
- Whenever the protagonist appears as a child, start the scene with the character_sheet sentence VERBATIM, then the action. For adult scenes, describe the same person grown up, keeping hair/eye color consistent.
- childhood_scene: a wide figure-less landscape of their birthplace region. modern.scene: the same child in today's world. treasures[].scene: the object/work itself, no people. timeline scenes: small vignette moments.
- The LAST chapter is rendered as a wordless full-page painting (its narrative is written but not displayed): make its scene the single most dramatic, emotional image of the story, carrying the challenge-into-hope turn on from the chapter before it.`;

// ---------------------------------------------------------------------------
// OpenRouter chat completions (streamed SSE, so long generations don't hit
// undici's 5-minute headers timeout).
// ---------------------------------------------------------------------------

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const orHeaders = () => ({
  Authorization: `Bearer ${OPENROUTER_API_KEY}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://maisondore.com',
  'X-Title': 'Maison d\'Ore Golden Story',
});

async function writeBrief(personName) {
  const res = await fetch(`${OPENROUTER}/chat/completions`, {
    method: 'POST',
    headers: orHeaders(),
    body: JSON.stringify({
      model: WRITER_MODEL,
      max_tokens: 16000,
      reasoning: { enabled: true },
      stream: true,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'golden_story_brief', strict: true, schema: BRIEF_SCHEMA },
      },
      messages: [
        { role: 'system', content: WRITER_SYSTEM },
        { role: 'user', content: `Create the Golden Story brief for ${personName}.` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data: ')) continue; // skip SSE comments/keepalives
      const payload = line.slice(6);
      if (payload === '[DONE]') continue;
      const event = JSON.parse(payload);
      if (event.error) throw new Error(`openrouter stream error: ${JSON.stringify(event.error).slice(0, 300)}`);
      text += event.choices?.[0]?.delta?.content ?? '';
    }
  }
  if (!text) throw new Error('no text in model response');
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Slot table: one entry per image, mirroring the leonardo layout: white-paper
// multiply plates for chapters 1-3 / childhood / after-treasures / spots, and
// opaque blend:"normal" art for the cover, modern spread and final chapter.
// ---------------------------------------------------------------------------

function buildSlots(brief) {
  const scene = (file, size, text, tail) => ({ file, size, prompt: `${STYLE}\n\nNew scene: ${text}\n\n${tail}` });
  const last = brief.chapters.length - 1;
  return [
    scene('cover.png', '1024x1536', brief.cover_scene, COVER_BLEED),
    scene('strip-childhood.png', '1536x640', brief.childhood_scene, STRIP_BLEED),
    ...brief.chapters.map((c, i) => scene(`chapter-${i + 1}.png`, '1024x1536', c.scene, i === last ? OPAQUE : SINGLE_BLEED)),
    scene('modern.png', '1536x1024', brief.modern.scene, OPAQUE),
    scene('after-treasures.png', '1024x1536', brief.after_treasures.scene, SINGLE_BLEED),
    ...brief.timeline.map((t, i) => scene(`timeline-${i + 1}.png`, '1024x1024', t.scene, PAPER)),
    ...brief.treasures.map((t, i) => scene(`treasure-${i + 1}.png`, '1024x1024', t.scene, PAPER)),
  ];
}

// ---------------------------------------------------------------------------
// gpt-image-2 via OpenRouter's images endpoint
// ---------------------------------------------------------------------------

async function renderImage(prompt, size, quality) {
  const res = await fetch(`${OPENROUTER}/images`, {
    method: 'POST',
    headers: orHeaders(),
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size, quality, output_format: 'png', n: 1 }),
  });
  if (!res.ok) throw new Error(`openrouter images ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { data } = await res.json();
  return Buffer.from(data[0].b64_json, 'base64');
}

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
// Outputs
// ---------------------------------------------------------------------------

const img = (slug, file) => `/stories/${slug}/${file}`;

// Layout fields (page_span / blend / fade) mirror public/stories/leonardo/story.json.
function toStoryJson(brief, slug) {
  const last = brief.chapters.length - 1;
  return {
    name: brief.name,
    role: brief.role,
    field: brief.field,
    country: brief.country,
    birth_date: brief.birth_date,
    death_year: brief.death_year,
    story_title: brief.name,
    famous_quote: brief.famous_quote,
    image_url: img(slug, 'cover.png'),
    story_childhood_title: brief.story_childhood_title,
    childhood_image_url: img(slug, 'strip-childhood.png'),
    story_childhood: brief.story_childhood,
    story_takeaway: brief.story_takeaway,
    modern: {
      page_span: 'both',
      blend: 'normal',
      title: brief.modern.title,
      narrative: brief.modern.narrative,
      image_url: img(slug, 'modern.png'),
    },
    chapters: brief.chapters.map((c, i) => (i === last
      ? {
          number: i + 1,
          page_span: 'image',
          blend: 'normal',
          image_url: img(slug, `chapter-${i + 1}.png`),
        }
      : {
          number: i + 1,
          page_span: 'single',
          title: c.title,
          narrative: c.narrative,
          image_url: img(slug, `chapter-${i + 1}.png`),
        })),
    timeline: brief.timeline.map((t, i) => ({
      year: t.year,
      caption: t.caption,
      image_url: img(slug, `timeline-${i + 1}.png`),
      blend: 'multiply',
    })),
    after_treasures: {
      page_span: 'single',
      title: brief.after_treasures.title,
      narrative: brief.after_treasures.narrative,
      image_url: img(slug, 'after-treasures.png'),
      fade: false,
    },
    treasures: brief.treasures.map((t, i) => ({
      name: t.name,
      image_url: img(slug, `treasure-${i + 1}.png`),
    })),
    lessons: brief.lessons.map((l) => ({ icon_name: l.icon_name, lesson: l.lesson })),
  };
}

function toPromptsMd(brief, slots) {
  const rows = slots.map((s) => `## ${s.file} (${s.size})\n\n${s.prompt}\n`);
  return `# Image prompts — ${brief.name}\n\nGolden thread: ${brief.golden_thread}\nCharacter sheet: ${brief.character_sheet}\n\nRegenerate any image with its prompt below (size is a generation parameter, not prompt text) and save the PNG straight into public/stories/<slug>/ — no post-processing needed. Or re-render single slots via: npm run generate:story:openrouter -- "<Name>" --reuse-brief --only <slot>.\n\n${rows.join('\n')}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

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
if (!OPENROUTER_API_KEY && !(reuseBrief && promptsOnly)) {
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
  brief = await writeBrief(personName);
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
