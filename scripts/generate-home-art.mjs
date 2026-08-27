/**
 * The homepage's art, and the prompts that made it.
 *
 *   node --env-file=.env --env-file-if-exists=.env.local scripts/generate-home-art.mjs [key ...]
 *
 * The landing page used to pull its single hero from a base44 URL that no
 * longer belongs to this project. These five plates replace it, and they are
 * generated rather than sourced so the page's photography can be re-cut when
 * the palette moves — which is the whole reason the prompts live in the repo
 * instead of in a chat log. Every prompt names the §1 palette by hex, and
 * every one of them forbids text: the type on this page is the page's job.
 *
 * Output lands in public/site/ as WebP (quality 82, the same visually-lossless
 * setting scripts/compress-story-images.mjs uses); the raw PNG is kept beside
 * it under art/originals/site/ the same way the story pipeline keeps its own.
 * Re-running skips a plate whose .webp already exists — pass its key to force
 * a re-cut, or delete the file.
 */
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = 'public/site';
const ORIGINALS = 'art/originals/site';
const QUALITY = 82;

const OPENROUTER = 'https://openrouter.ai/api/v1';
const IMAGE_MODEL = 'openai/gpt-image-2';

/* The house's own words for its light, repeated into every prompt so the five
   plates agree with each other and with globals.css §1 rather than each
   drifting toward whatever "warm and editorial" means on its own. */
const HOUSE =
  'Shot on medium-format film: natural light, shallow depth of field, fine grain, ' +
  'gentle vignette, unhurried editorial composition. Warm and desaturated throughout — ' +
  'parchment cream #FBF2E9, ivory #FFFBF4, sand #EFE0D0, walnut brown #5E4327, ' +
  'espresso #2C1F16, with antique gold #B4863C used sparingly as the only bright note. ' +
  'No people, no text, no lettering, no logos, no signage, no modern or branded objects.';

const PLATES = {
  /* The hero stands in the right half of a full-height split, so the prompt
     asks for the empty upper wall the headline needs on the other side of the
     fold — the composition is part of the brief, not something to crop for
     later. */
  hero: {
    size: '1024x1536',
    quality: 'high',
    alt:
      "A sunlit corner of an old Mediterranean house — olive branches in a terracotta " +
      "vessel on a walnut table, linen curtain diffusing the afternoon",
    prompt:
      'A quiet sunlit corner of an old Mediterranean house. A sprig of fresh olive ' +
      'branches stands in an unglazed terracotta vessel on a walnut side table, set ' +
      'against a limewashed parchment-cream wall. A sheer linen curtain at the left ' +
      'edge diffuses late-afternoon sun into soft window bars across the plaster. ' +
      'Muted olive-sage green in the leaves; a single thin band of antique gold at the ' +
      "vessel's rim. The upper two thirds of the frame are generous empty wall, lit and " +
      'almost featureless. ' + HOUSE,
  },

  /* The espresso interlude's ground. Everything of interest is held to the left
     third because the section's copy sits over the right, and the fall-off into
     shadow is what lets the type land on darkness rather than on detail. */
  goldprint: {
    size: '1536x1024',
    quality: 'high',
    alt:
      'A leather-bound family album open by candlelight on a dark walnut table, ' +
      'gilt page edges catching the flame',
    prompt:
      'A darkened walnut library table by candlelight. On the left third: an open ' +
      'leather-bound family album with gilt-edged pages, a folded pair of reading ' +
      'glasses, a small brass key and a pressed olive leaf, arranged with editorial ' +
      'restraint. The right two thirds fall away into deep espresso-brown shadow, ' +
      'almost empty. Strong chiaroscuro; warm candle glow on the gilding and the brass, ' +
      'dying out into darkness. The album pages are blank — no writing, no print, no ' +
      'photographs. ' + HOUSE,
  },

  /* The sage triptych. Three squares that have to sit in a row without any one
     of them winning, so each names the same distance, the same soft ground and
     the same single warm object. */
  elegance: {
    size: '1024x1024',
    quality: 'medium',
    alt: 'Hand-hemmed ivory linen with an antique gold thimble resting on it',
    prompt:
      'Close still life, square. A folded length of hand-hemmed ivory linen with a fine ' +
      'gold running stitch along its edge, an antique brass thimble resting on it, laid ' +
      'on a limewashed sage-grey stone surface. Soft north light from the left. ' + HOUSE,
  },
  living: {
    size: '1024x1024',
    quality: 'medium',
    alt: 'A newly lit beeswax candle beside a small bowl of sea salt and a sprig of rosemary',
    prompt:
      'Close still life, square. A newly lit beeswax candle, a shallow ceramic bowl of ' +
      'coarse sea salt and a single sprig of rosemary, on a limewashed sage-grey stone ' +
      'surface. A thin ribbon of smoke. Soft north light from the left. ' + HOUSE,
  },
  impact: {
    size: '1024x1024',
    quality: 'medium',
    alt: 'A hand-bound notebook and a young olive seedling in a terracotta pot',
    prompt:
      'Close still life, square. A small hand-bound notebook closed with a linen tie, a ' +
      'glass inkwell, and a young olive seedling in a terracotta pot, on a limewashed ' +
      'sage-grey stone surface. The notebook is closed and unmarked. Soft north light ' +
      'from the left. ' + HOUSE,
  },
};

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function render(prompt, size, quality) {
  const res = await fetch(`${OPENROUTER}/images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://maisondore.com',
      'X-Title': "Maison d'Ore homepage art",
    },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size, quality, output_format: 'png', n: 1 }),
  });
  if (!res.ok) throw new Error(`openrouter images ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { data } = await res.json();
  return Buffer.from(data[0].b64_json, 'base64');
}

const requested = process.argv.slice(2);
const keys = requested.length ? requested : Object.keys(PLATES);
const unknown = keys.filter((k) => !PLATES[k]);
if (unknown.length) {
  console.error(`unknown plate(s): ${unknown.join(', ')} — have: ${Object.keys(PLATES).join(', ')}`);
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
await mkdir(ORIGINALS, { recursive: true });

for (const key of keys) {
  const plate = PLATES[key];
  const webp = path.join(OUT, `${key}.webp`);
  const png = path.join(ORIGINALS, `${key}.png`);

  if (!requested.length && (await exists(webp))) {
    console.log(`· ${key} — already cut, skipping`);
    continue;
  }

  let raw;
  if (await exists(png)) {
    console.log(`· ${key} — reusing the original PNG`);
    raw = await readFile(png);
  } else {
    console.log(`· ${key} — rendering ${plate.size} at ${plate.quality}…`);
    raw = await render(plate.prompt, plate.size, plate.quality);
    await writeFile(png, raw);
  }

  await sharp(raw).webp({ quality: QUALITY }).toFile(webp);
  const { size } = await sharp(webp).metadata();
  console.log(`  → ${webp} (${Math.round((size ?? 0) / 1024)} KB)  alt: ${plate.alt}`);
}
