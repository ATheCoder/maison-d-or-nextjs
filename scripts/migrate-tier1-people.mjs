/**
 * One-time migration: move the "Tier 1" people (full text + full image sets)
 * out of daily_gold_edition.born_today into the remarkable_person table,
 * rescuing their Base44-hosted images into R2 on the way.
 *
 * For each qualifying person:
 *   1. Download every image (cover, chapters, timeline, treasures) from
 *      media.base44.com, convert to WebP (quality 82, as in
 *      compress-story-images.mjs).
 *   2. Upload to R2 at story-media/<slug>/<file>.webp (skipped if already
 *      there, so re-runs are cheap).
 *   3. Upsert a remarkable_person row in the story.json canonical shape, with
 *      image URLs on R2_DOMAIN and birth_month_day taken from the edition
 *      date the person appeared on (Born Today ⇒ edition date = birthday).
 *
 *   node --env-file=.env --env-file-if-exists=.env.local scripts/migrate-tier1-people.mjs [--tier 1|2] [--dry-run] [--only "Name"]
 *
 * Tier 1 (default) = has a cover and at least 4 chapter / 5 timeline /
 * 6 treasure images. Tier 2 = full story text but only the cover image; the
 * missing art stays null and renders as text-only plates. Others are left
 * untouched.
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import pg from 'pg';

const PREFIX = 'story-media';
const QUALITY = 82;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;
const tierIdx = args.indexOf('--tier');
const tier = tierIdx !== -1 ? Number(args[tierIdx + 1]) : 1;

for (const v of ['DATABASE_URL', 'S3_API', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_DOMAIN']) {
  if (!process.env[v]) {
    console.error(`${v} is not set. Run with --env-file=.env --env-file-if-exists=.env.local`);
    process.exit(1);
  }
}

const endpointUrl = new URL(process.env.S3_API);
const bucket = endpointUrl.pathname.replace(/^\/|\/$/g, '');
const publicBase = process.env.R2_DOMAIN.replace(/\/$/, '');

const s3 = new S3Client({
  region: 'auto',
  endpoint: endpointUrl.origin,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const slugify = (name) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    // Letters NFD can't decompose to ASCII (e.g. Turkish ı has no combining form)
    .replace(/ı/g, 'i').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ß/g, 'ss').replace(/đ/g, 'd').replace(/ł/g, 'l')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const has = (v) => v != null && String(v).trim() !== '';

async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

/** Download srcUrl, convert to webp, upload as key. Returns the public URL, or null on failure. */
async function rescueImage(srcUrl, key) {
  const publicUrl = `${publicBase}/${key}`;
  if (dryRun) return publicUrl;
  if (await objectExists(key)) return publicUrl;
  let webp;
  try {
    const res = await fetch(srcUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    webp = await sharp(Buffer.from(await res.arrayBuffer())).webp({ quality: QUALITY }).toBuffer();
  } catch (err) {
    console.warn(`    FAILED ${key}: ${err.message} (${srcUrl.slice(0, 80)})`);
    return null;
  }
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: webp, ContentType: 'image/webp' }));
  return publicUrl;
}

const COLUMNS = [
  'slug', 'name', 'role', 'field', 'country',
  'birth_date', 'birth_month_day', 'death_year',
  'story_title', 'famous_quote', 'image_url',
  'story_childhood_title', 'childhood_image_url', 'story_childhood', 'story_takeaway',
  'modern', 'chapters', 'timeline', 'after_treasures', 'treasures', 'lessons',
];
const JSON_COLUMNS = new Set(['modern', 'chapters', 'timeline', 'after_treasures', 'treasures', 'lessons']);
const UPSERT = `
INSERT INTO remarkable_person (${COLUMNS.join(', ')})
VALUES (${COLUMNS.map((_, i) => `$${i + 1}`).join(', ')})
ON CONFLICT (slug) DO UPDATE SET
  ${COLUMNS.filter((c) => c !== 'slug').map((c) => `${c} = EXCLUDED.${c}`).join(',\n  ')},
  updated_at = now()
`;

function isTier1(per) {
  const imgs = (list) => (list || []).filter((x) => has(x?.image_url)).length;
  return has(per.image_url) && imgs(per.chapters) >= 4 && imgs(per.timeline) >= 5 && imgs(per.treasures) >= 6;
}

// Full story text but (beyond the cover) no art — migrated with null image
// slots, which the renderers show as text-only plates.
function isTier2(per) {
  const texts = (list, f) => (list || []).filter((x) => has(x?.[f])).length;
  return !isTier1(per) && has(per.image_url) &&
    texts(per.chapters, 'narrative') >= 4 && texts(per.timeline, 'caption') >= 5 && texts(per.treasures, 'name') >= 6;
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const r = await pool.query(
      'select edition_date::text as edition_date, born_today from daily_gold_edition order by edition_date'
    );

    // Dedupe by name, keeping the record with the most populated fields.
    const score = (o) => Object.values(o).filter((v) => v != null && v !== '' && !(Array.isArray(v) && !v.length)).length;
    const people = new Map();
    for (const row of r.rows) {
      for (const per of row.born_today || []) {
        if (!per?.name) continue;
        const prev = people.get(per.name);
        if (!prev || score(per) > score(prev.per)) people.set(per.name, { per, editionDate: row.edition_date });
      }
    }

    let migrated = 0, skipped = 0;
    for (const [name, { per, editionDate }] of people) {
      if (only && name !== only) continue;
      if (!(tier === 2 ? isTier2 : isTier1)(per)) { skipped++; continue; }

      const slug = slugify(name);
      console.log(`\n${name} -> ${slug} (edition ${editionDate})`);

      const cover = has(per.image_url) ? await rescueImage(per.image_url, `${PREFIX}/${slug}/cover.webp`) : null;

      const chapters = [];
      for (const [i, ch] of (per.chapters || []).entries()) {
        const url = has(ch.image_url) ? await rescueImage(ch.image_url, `${PREFIX}/${slug}/chapter-${i + 1}.webp`) : null;
        chapters.push({ number: ch.number ?? i + 1, title: ch.title ?? null, narrative: ch.narrative ?? null, image_url: url });
      }
      const timeline = [];
      for (const [i, t] of (per.timeline || []).entries()) {
        const url = has(t.image_url) ? await rescueImage(t.image_url, `${PREFIX}/${slug}/timeline-${i + 1}.webp`) : null;
        timeline.push({ year: t.year ?? null, caption: t.caption ?? null, image_url: url });
      }
      const treasures = [];
      for (const [i, t] of (per.treasures || []).entries()) {
        const url = has(t.image_url) ? await rescueImage(t.image_url, `${PREFIX}/${slug}/treasure-${i + 1}.webp`) : null;
        treasures.push({ name: t.name ?? null, description: t.description ?? null, image_url: url });
      }

      const row = {
        slug,
        name,
        role: per.role ?? null,
        field: null, // not in the legacy shape; to be generated later
        country: per.country ?? null,
        birth_date: has(per.birth_date) ? String(per.birth_date) : null,
        // Born Today people appeared on their birthday, so the edition date
        // carries the month-day the legacy birth_date (year only) lacks.
        birth_month_day: editionDate.slice(5),
        death_year: per.death_year != null ? String(per.death_year) : null,
        story_title: per.story_title ?? null,
        famous_quote: per.famous_quote ?? null,
        image_url: cover,
        story_childhood_title: null, // not in the legacy shape
        childhood_image_url: null,
        story_childhood: per.story_childhood ?? null,
        story_takeaway: per.story_takeaway ?? null,
        // Legacy has a flat string; keep its text as the section narrative.
        modern: has(per.modern_interpretation) ? { narrative: per.modern_interpretation } : null,
        chapters,
        timeline,
        after_treasures: null, // not in the legacy shape
        treasures,
        lessons: per.lessons ?? [],
      };

      if (dryRun) {
        const total = 1 + chapters.length + timeline.length + treasures.length;
        console.log(`  would migrate: ${total} images, birth ${row.birth_month_day}, ${chapters.length} chapters`);
      } else {
        const values = COLUMNS.map((c) => (JSON_COLUMNS.has(c) && row[c] !== null ? JSON.stringify(row[c]) : row[c]));
        await pool.query(UPSERT, values);
        console.log(`  migrated (birth ${row.birth_month_day}, ${chapters.length} chapters, ${timeline.length} timeline, ${treasures.length} treasures)`);
      }
      migrated++;
    }
    console.log(`\n${dryRun ? '[dry-run] ' : ''}${migrated} Tier ${tier} person(s) migrated, ${skipped} left in place.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
