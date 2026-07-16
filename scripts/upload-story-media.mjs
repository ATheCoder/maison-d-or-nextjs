/**
 * Upload each story's art to the Cloudflare R2 bucket, under story-media/<slug>/.
 * Only .webp files that are actually referenced in the story's story.json are
 * uploaded — stray/leftover renders in the folder and the JSON itself are not.
 *
 *   npm run upload:story-media                  # all stories with a story.json
 *   npm run upload:story-media -- leonardo      # just these slugs
 *   npm run upload:story-media -- --dry-run     # show what would upload
 *   npm run upload:story-media -- --force       # re-upload even if already in the bucket
 *
 * S3_API (in .env.local) is the R2 S3 endpoint with the bucket as its path,
 * e.g. https://<account>.r2.cloudflarestorage.com/maison-d-or. Credentials come
 * from R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY if set, otherwise the AWS SDK
 * default chain (AWS_* env vars, ~/.aws/credentials).
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'public/stories';
const PREFIX = 'story-media';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const slugArgs = args.filter((a) => !a.startsWith('--'));

if (!process.env.S3_API) {
  console.error('S3_API is not set. Run via `npm run upload:story-media` so .env.local is loaded.');
  process.exit(1);
}
const endpointUrl = new URL(process.env.S3_API);
const bucket = endpointUrl.pathname.replace(/^\/|\/$/g, '');
if (!bucket) {
  console.error('S3_API must include the bucket as its path, e.g. https://<account>.r2.cloudflarestorage.com/<bucket>');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: endpointUrl.origin,
  forcePathStyle: true,
  credentials:
    process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        }
      : undefined,
});

/** Collect every string ending in .webp anywhere in the story JSON. */
function collectWebpRefs(value, out = new Set()) {
  if (typeof value === 'string') {
    if (value.toLowerCase().endsWith('.webp')) out.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectWebpRefs(item, out);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectWebpRefs(item, out);
  }
  return out;
}

async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

const allSlugs = (await readdir(ROOT, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && existsSync(path.join(ROOT, d.name, 'story.json')))
  .map((d) => d.name);

const unknown = slugArgs.filter((s) => !allSlugs.includes(s));
if (unknown.length) {
  console.error(`No story.json for: ${unknown.join(', ')}. Available: ${allSlugs.join(', ')}`);
  process.exit(1);
}
const slugs = slugArgs.length ? slugArgs : allSlugs;

let uploaded = 0;
let skipped = 0;
let missing = 0;

for (const slug of slugs) {
  const dir = path.join(ROOT, slug);
  const story = JSON.parse(await readFile(path.join(dir, 'story.json'), 'utf8'));
  const refs = [...collectWebpRefs(story)].sort();
  console.log(`\n${slug}: ${refs.length} referenced .webp file(s)`);

  for (const ref of refs) {
    const name = path.posix.basename(ref);
    const file = path.join(dir, name);
    if (!existsSync(file)) {
      console.warn(`  MISSING ${name} (referenced as ${ref})`);
      missing++;
      continue;
    }
    const key = `${PREFIX}/${slug}/${name}`;
    if (!force && !dryRun && (await objectExists(key))) {
      console.log(`  skip    ${key} (already in bucket)`);
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`  would upload ${key}`);
      uploaded++;
      continue;
    }
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: await readFile(file),
        ContentType: 'image/webp',
      })
    );
    console.log(`  upload  ${key}`);
    uploaded++;
  }
}

console.log(
  `\n${dryRun ? '[dry-run] ' : ''}${uploaded} uploaded, ${skipped} skipped, ${missing} missing.`
);
if (missing) process.exit(1);
