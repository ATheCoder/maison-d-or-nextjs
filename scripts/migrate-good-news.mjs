/**
 * One-time migration: move daily_gold_edition.good_news into the
 * good_news_item table, rescuing the Base44-hosted images into R2 on the way.
 *
 * For each edition date (taking the newest edition when a date has several,
 * the same rule the readers used):
 *   1. Explode the good_news jsonb array into rows, one per story, with
 *      position = array index.
 *   2. Download each image from media.base44.com, convert to WebP (quality 82,
 *      as in compress-story-images.mjs), upload to R2 at
 *      news-media/<date>/<position>.webp (skipped if already there, so
 *      re-runs are cheap). Failed downloads keep the row with a null
 *      image_url — the component tolerates missing images.
 *   3. Upsert on the unique (date, position) index, so re-runs are idempotent.
 *
 *   node --env-file=.env --env-file-if-exists=.env.local scripts/migrate-good-news.mjs [--dry-run]
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import pg from 'pg';

const PREFIX = 'news-media';
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
INSERT INTO good_news_item (date, position, headline, description, location, image_url)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (date, position) DO UPDATE SET
  headline = EXCLUDED.headline,
  description = EXCLUDED.description,
  location = EXCLUDED.location,
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
        edition_date::text as date, good_news
      from daily_gold_edition
      order by edition_date, created_at desc, id desc
    `);

    let rows = 0;
    for (const { date, good_news: items } of r.rows) {
      if (!items?.length) continue;
      console.log(`\n${date} (${items.length} stories)`);
      for (const [i, item] of items.entries()) {
        if (!has(item?.headline)) { console.warn(`    skipped [${i}]: no headline`); continue; }
        const imageUrl = has(item.image_url)
          ? await rescueImage(item.image_url, `${PREFIX}/${date}/${i}.webp`)
          : null;
        if (dryRun) {
          console.log(`  would insert [${i}] ${item.headline.slice(0, 60)}`);
        } else {
          await pool.query(UPSERT, [date, i, item.headline, item.description ?? null, item.location ?? null, imageUrl]);
          console.log(`  upserted [${i}] ${item.headline.slice(0, 60)}`);
        }
        rows++;
      }
    }
    console.log(`\n${dryRun ? '[dry-run] ' : ''}${rows} good-news row(s) across ${r.rows.length} date(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
