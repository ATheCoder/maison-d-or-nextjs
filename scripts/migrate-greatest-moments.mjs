/**
 * One-time migration: move daily_gold_edition.greatest_moments into the
 * greatest_moment table, rescuing the Base44-hosted images into R2 on the
 * way.
 *
 * For each edition date (taking the newest edition when a date has several,
 * the same rule the readers used):
 *   1. Explode the greatest_moments jsonb array into rows, one per moment,
 *      with month_day = the edition date's MM-DD. rank (1–10) is unique per
 *      date in the data and doubles as the display order.
 *   2. Download each image from media.base44.com, convert to WebP (quality
 *      82, as in compress-story-images.mjs), upload to R2 at
 *      moments-media/<MM-DD>/<rank>.webp (skipped if already there, so
 *      re-runs are cheap). Failed downloads keep the row with a null
 *      image_url.
 *   3. Upsert on the unique (month_day, rank) index, so re-runs are
 *      idempotent.
 *
 *   node --env-file=.env --env-file-if-exists=.env.local scripts/migrate-greatest-moments.mjs [--dry-run]
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import pg from 'pg';

const PREFIX = 'moments-media';
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
INSERT INTO greatest_moment (month_day, rank, year, headline, story, image_url)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (month_day, rank) DO UPDATE SET
  year = EXCLUDED.year,
  headline = EXCLUDED.headline,
  story = EXCLUDED.story,
  image_url = EXCLUDED.image_url,
  updated_at = now()
`;

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Newest edition per date. created_at is the import timestamp (ties), so
    // fall back to the Base44 id, which sorts chronologically.
    const r = await pool.query(`
      select distinct on (edition_date)
        edition_date::text as date, greatest_moments
      from daily_gold_edition
      order by edition_date, created_at desc, id desc
    `);

    let rows = 0;
    for (const { date, greatest_moments: items } of r.rows) {
      if (!items?.length) continue;
      const monthDay = date.slice(5);
      console.log(`\n${date} -> ${monthDay} (${items.length} moments)`);
      for (const [i, item] of items.entries()) {
        const rank = Number.parseInt(item?.rank, 10);
        const year = Number.parseInt(item?.year, 10);
        if (!Number.isInteger(rank) || !Number.isInteger(year)) {
          console.warn(`    skipped [${i}]: bad rank/year ${JSON.stringify({ rank: item?.rank, year: item?.year })}`);
          continue;
        }
        const imageUrl = has(item.image_url)
          ? await rescueImage(item.image_url, `${PREFIX}/${monthDay}/${rank}.webp`)
          : null;
        if (dryRun) {
          console.log(`  would insert rank ${rank} (${year}) ${String(item.headline ?? '').slice(0, 50)}`);
        } else {
          await pool.query(UPSERT, [monthDay, rank, year, item.headline ?? null, item.story ?? null, imageUrl]);
          console.log(`  upserted rank ${rank} (${year})`);
        }
        rows++;
      }
    }
    console.log(`\n${dryRun ? '[dry-run] ' : ''}${rows} moment row(s) across ${r.rows.length} date(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
