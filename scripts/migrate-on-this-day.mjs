/**
 * One-time migration: move daily_gold_edition.on_this_day into the
 * on_this_day_event table, rescuing the (few) Base44-hosted images into R2 on
 * the way.
 *
 * For each edition date (taking the newest edition when a date has several,
 * the same rule the readers used):
 *   1. Explode the on_this_day jsonb array into rows, one per event, with
 *      month_day = the edition date's MM-DD and position = array index. Most
 *      events are un-enriched stubs (year + raw_text/raw_extract only) —
 *      those columns are kept as the enrichment pipeline's source material.
 *   2. Download each image from media.base44.com, convert to WebP (quality
 *      82, as in compress-story-images.mjs), upload to R2 at
 *      history-media/<MM-DD>/<position>.webp (skipped if already there, so
 *      re-runs are cheap). Failed downloads keep the row with a null
 *      image_url.
 *   3. Upsert on the unique (month_day, position) index, so re-runs are
 *      idempotent.
 *
 *   node --env-file=.env --env-file-if-exists=.env.local scripts/migrate-on-this-day.mjs [--dry-run]
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import pg from 'pg';

const PREFIX = 'history-media';
const QUALITY = 82;

const dryRun = process.argv.slice(2).includes('--dry-run');

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

const UPSERT = `
INSERT INTO on_this_day_event
  (month_day, position, year, headline, story, location, image_url,
   maison_rewrite_done, researched_from_internet, raw_text, raw_extract)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (month_day, position) DO UPDATE SET
  year = EXCLUDED.year,
  headline = EXCLUDED.headline,
  story = EXCLUDED.story,
  location = EXCLUDED.location,
  image_url = EXCLUDED.image_url,
  maison_rewrite_done = EXCLUDED.maison_rewrite_done,
  researched_from_internet = EXCLUDED.researched_from_internet,
  raw_text = EXCLUDED.raw_text,
  raw_extract = EXCLUDED.raw_extract,
  updated_at = now()
`;

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Newest edition per date. created_at is the import timestamp (ties), so
    // fall back to the Base44 id, which sorts chronologically.
    const r = await pool.query(`
      select distinct on (edition_date)
        edition_date::text as date, on_this_day
      from daily_gold_edition
      order by edition_date, created_at desc, id desc
    `);

    let rows = 0, enriched = 0;
    for (const { date, on_this_day: items } of r.rows) {
      if (!items?.length) continue;
      const monthDay = date.slice(5);
      console.log(`\n${date} -> ${monthDay} (${items.length} events)`);
      for (const [i, item] of items.entries()) {
        const year = Number.parseInt(item?.year, 10);
        if (!Number.isInteger(year)) { console.warn(`    skipped [${i}]: bad year ${JSON.stringify(item?.year)}`); continue; }
        const imageUrl = has(item.image_url)
          ? await rescueImage(item.image_url, `${PREFIX}/${monthDay}/${i}.webp`)
          : null;
        const done = item.maison_rewrite_done === true;
        if (done) enriched++;
        if (dryRun) {
          console.log(`  would insert [${i}] ${year}${done ? ' (enriched)' : ''}`);
        } else {
          await pool.query(UPSERT, [
            monthDay, i, year,
            item.headline ?? null, item.story ?? null, item.location ?? null, imageUrl,
            done, item.researched_from_internet === true,
            item.raw_text ?? null, item.raw_extract ?? null,
          ]);
        }
        rows++;
      }
      if (!dryRun) console.log(`  upserted ${items.length} event(s)`);
    }
    console.log(`\n${dryRun ? '[dry-run] ' : ''}${rows} event row(s) (${enriched} enriched) across ${r.rows.length} date(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
