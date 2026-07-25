/**
 * Rewrite locally-hosted image links in remarkable_person to their R2 URLs.
 *
 * Rows imported from public/stories/ carry paths like
 * /stories/<slug>/cover.webp, served off the Next.js public folder.
 * upload-story-media.mjs copies that art to R2 under story-media/<slug>/<file>
 * but leaves the database pointing at the local copies; this script closes the
 * gap, rewriting every such reference to ${R2_DOMAIN}/story-media/<slug>/<file>.
 *
 *   npm run rewrite:story-media-urls                 # every row with local links
 *   npm run rewrite:story-media-urls -- leonardo     # just these slugs
 *   npm run rewrite:story-media-urls -- --dry-run    # show what would change
 *   npm run rewrite:story-media-urls -- --force      # rewrite even if the R2 object is missing
 *
 * Links are found anywhere in the row — the text columns (image_url,
 * childhood_image_url) and inside the jsonb story sections. Every target key is
 * HEAD-checked in the bucket first, and a row with any missing object is left
 * untouched (run upload:story-media for it, or pass --force to rewrite anyway).
 * Rows already on R2, and any non-/stories/ URL, are left alone.
 */
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';

const PREFIX = 'story-media';

// Columns that can hold image links. jsonb ones are rewritten in place, so a
// section keeps its shape and only the URL strings inside it change.
const TEXT_COLUMNS = ['image_url', 'childhood_image_url'];
const JSON_COLUMNS = ['modern', 'chapters', 'timeline', 'after_treasures', 'treasures', 'lessons'];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const slugArgs = args.filter((a) => !a.startsWith('--'));

for (const v of ['DATABASE_URL', 'S3_API', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_DOMAIN']) {
  if (!process.env[v]) {
    console.error(`${v} is not set. Run via \`npm run rewrite:story-media-urls\` so .env/.env.local are loaded.`);
    process.exit(1);
  }
}

const endpointUrl = new URL(process.env.S3_API);
const bucket = endpointUrl.pathname.replace(/^\/|\/$/g, '');
if (!bucket) {
  console.error('S3_API must include the bucket as its path, e.g. https://<account>.r2.cloudflarestorage.com/<bucket>');
  process.exit(1);
}
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

/**
 * /stories/<dir>/<file.ext> — the shape the story importer wrote. The directory
 * segment, not the row's slug, becomes the R2 prefix: it is what
 * upload-story-media.mjs keys on, and the two can differ.
 */
const LOCAL_PATH = /^\/stories\/([^/]+)\/([^/?#]+\.[A-Za-z0-9]+)$/;

/** The R2 key a local path maps to, or null if the string isn't a local path. */
function keyFor(value) {
  if (typeof value !== 'string') return null;
  const m = LOCAL_PATH.exec(value);
  return m ? `${PREFIX}/${m[1]}/${m[2]}` : null;
}

/**
 * Deep-copy `value`, replacing every local path with its R2 URL. Records each
 * rewrite as [from, to] in `hits`.
 */
function rewrite(value, hits) {
  if (typeof value === 'string') {
    const key = keyFor(value);
    if (!key) return value;
    const url = `${publicBase}/${key}`;
    hits.push([value, url]);
    return url;
  }
  if (Array.isArray(value)) return value.map((item) => rewrite(item, hits));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v, hits)]));
  }
  return value;
}

const existsCache = new Map();
async function objectExists(key) {
  if (existsCache.has(key)) return existsCache.get(key);
  let exists;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    exists = true;
  } catch (err) {
    if (err.$metadata?.httpStatusCode !== 404) throw err;
    exists = false;
  }
  existsCache.set(key, exists);
  return exists;
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const columns = [...TEXT_COLUMNS, ...JSON_COLUMNS];
    const { rows } = await pool.query(
      `select slug, ${columns.map((c) => `"${c}"`).join(', ')} from remarkable_person
       ${slugArgs.length ? 'where slug = any($1)' : ''}
       order by slug`,
      slugArgs.length ? [slugArgs] : []
    );

    if (slugArgs.length) {
      const found = new Set(rows.map((r) => r.slug));
      const unknown = slugArgs.filter((s) => !found.has(s));
      if (unknown.length) {
        console.error(`No remarkable_person row for: ${unknown.join(', ')}`);
        process.exit(1);
      }
    }

    let updated = 0;
    let clean = 0;
    let blocked = 0;

    for (const row of rows) {
      // Per column, so untouched ones stay out of the UPDATE.
      const hits = [];
      const changed = [];
      for (const col of columns) {
        const colHits = [];
        const value = rewrite(row[col], colHits);
        if (colHits.length) {
          changed.push([col, value]);
          hits.push(...colHits);
        }
      }
      if (!hits.length) {
        clean++;
        continue;
      }

      console.log(`\n${row.slug}: ${hits.length} local link(s)`);
      const missing = [];
      for (const [from, to] of hits) {
        const key = to.slice(publicBase.length + 1);
        const ok = await objectExists(key);
        if (!ok) missing.push(key);
        console.log(`  ${ok ? '   ' : 'MISSING'} ${from} -> ${to}`);
      }

      if (missing.length && !force) {
        console.warn(
          `  skipped: ${missing.length} object(s) not in the bucket. ` +
            `Run \`npm run upload:story-media -- ${row.slug}\` first, or pass --force.`
        );
        blocked++;
        continue;
      }

      if (dryRun) {
        console.log(`  would update ${changed.map(([c]) => c).join(', ')}`);
        updated++;
        continue;
      }

      const sets = changed.map(([col], i) => `"${col}" = $${i + 2}`).join(', ');
      const values = changed.map(([col, value]) =>
        JSON_COLUMNS.includes(col) ? JSON.stringify(value) : value
      );
      await pool.query(
        `update remarkable_person set ${sets}, updated_at = now() where slug = $1`,
        [row.slug, ...values]
      );
      console.log(`  updated ${changed.map(([c]) => c).join(', ')}`);
      updated++;
    }

    console.log(
      `\n${dryRun ? '[dry-run] ' : ''}${updated} row(s) rewritten, ${clean} already on R2` +
        (blocked ? `, ${blocked} skipped for missing objects` : '') +
        '.'
    );
    if (blocked) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
