/**
 * One-time rescue: re-host daily_gold_edition.destination_image_url from
 * media.base44.com onto R2, in place (no table extraction — it is already a
 * scalar column).
 *
 * For each edition whose destination_image_url is still Base44-hosted:
 * download, convert to WebP (quality 82, as in compress-story-images.mjs),
 * upload to R2 at destination-media/<edition-date>-<id>.webp (the id keeps
 * the two same-date editions apart), and update the column. Uploads are
 * skipped if the object already exists and rows already on R2 are left
 * untouched, so re-runs are cheap and idempotent. Failed downloads warn and
 * leave the row unchanged.
 *
 *   node --env-file=.env --env-file-if-exists=.env.local scripts/rescue-destination-images.mjs [--dry-run]
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import pg from 'pg';

const PREFIX = 'destination-media';
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

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const r = await pool.query(`
      select id, edition_date::text as date, destination_image_url
      from daily_gold_edition
      where destination_image_url like 'https://media.base44.com/%'
      order by edition_date, id
    `);
    console.log(`${r.rows.length} edition(s) with a Base44-hosted destination image.`);

    let rescued = 0;
    for (const { id, date, destination_image_url: srcUrl } of r.rows) {
      const key = `${PREFIX}/${date}-${id}.webp`;
      const url = await rescueImage(srcUrl, key);
      if (!url) continue;
      if (dryRun) {
        console.log(`  would update ${date} (${id}) -> ${url}`);
      } else {
        await pool.query(
          'update daily_gold_edition set destination_image_url = $1, updated_at = now() where id = $2',
          [url, id],
        );
        console.log(`  updated ${date} (${id})`);
      }
      rescued++;
    }
    console.log(`\n${dryRun ? '[dry-run] ' : ''}${rescued} destination image(s) rescued.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
