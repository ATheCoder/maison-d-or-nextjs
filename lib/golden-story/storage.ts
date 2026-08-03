/**
 * R2 storage for editor-generated and uploaded story art — lifted from
 * app/(dg)/daily-gold-edition/queries.ts (getS3) so both surfaces share one client.
 * Images land under story-media/<slug>/<file>.webp (the prefix
 * upload-story-media.mjs already uses) as sharp-converted webp, served from
 * ${R2_DOMAIN}/<key>.
 */
import { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

let s3Client: S3Client | null = null;

/** The shared R2 S3 client and the bucket parsed out of S3_API's path. */
export function getS3(): { s3: S3Client; bucket: string } {
  if (!s3Client) {
    const endpointUrl = new URL(process.env.S3_API!);
    s3Client = new S3Client({
      region: 'auto',
      endpoint: endpointUrl.origin,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  const bucket = new URL(process.env.S3_API!).pathname.replace(/^\/|\/$/g, '');
  return { s3: s3Client, bucket };
}

/**
 * Convert an image buffer to webp and store it at
 * story-media/<slug>/<file>.webp, returning its public URL. `file` may carry
 * any extension (or none) — it is normalised to `.webp`, so a 'cover.png' slot
 * lands at 'cover.webp' like the CLI-uploaded art.
 */
export async function putStoryImage(slug: string, file: string, buffer: Buffer): Promise<string> {
  return putWebp(canonicalKey(slug, file), buffer);
}

// The canonical (public) key a slot's accepted art lives at, and the staging
// key a Path-A generation renders to before the admin accepts it. Staging keys
// carry the job id so each ✦ Regenerate is a fresh object (no CDN cache to
// fight) and an abandoned preview can be swept up.
function baseName(file: string): string {
  return file.replace(/\.[^./]+$/, '');
}
export function canonicalKey(slug: string, file: string): string {
  return `story-media/${slug}/${baseName(file)}.webp`;
}
export function stagingKey(slug: string, file: string, jobId: number): string {
  return `story-media/${slug}/_staging/${baseName(file)}.${jobId}.webp`;
}

function publicUrl(key: string): string {
  return `${process.env.R2_DOMAIN!.replace(/\/$/, '')}/${key}`;
}

/**
 * Convert a buffer to webp and PUT it at an explicit key, returning its URL.
 *
 * Exported because Daily Gold surfaces address their art by the key conventions
 * in the spec's §8.4 (`hero-media/<date>.webp`, `moment-media/<MM-DD>/rank-n.webp`)
 * rather than by a story slug, while sharing this sharp→webp@82 pipeline.
 */
export async function putImageAtKey(key: string, buffer: Buffer): Promise<string> {
  return putWebp(key, buffer);
}

// Convert a buffer to webp and PUT it at an explicit key, returning its URL.
async function putWebp(key: string, buffer: Buffer): Promise<string> {
  const webp = await sharp(buffer).webp({ quality: 82 }).toBuffer();
  const { s3, bucket } = getS3();
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: webp, ContentType: 'image/webp' }));
  return publicUrl(key);
}

/** Render a Path-A preview to a per-job staging key (not yet the live art). */
export async function putStagingImage(slug: string, file: string, jobId: number, buffer: Buffer):
  Promise<{ url: string; key: string }> {
  const key = stagingKey(slug, file, jobId);
  return { url: await putWebp(key, buffer), key };
}

/**
 * Promote an accepted staging object to its canonical key and return the public
 * URL with a cache-busting version query (the canonical key is stable across
 * regenerations, so families would otherwise see a cached older render).
 */
export async function promoteStaging(slug: string, file: string, stagingK: string, version: number):
  Promise<string> {
  const key = canonicalKey(slug, file);
  const { s3, bucket } = getS3();
  await s3.send(new CopyObjectCommand({ Bucket: bucket, Key: key, CopySource: `${bucket}/${stagingK}`, ContentType: 'image/webp', MetadataDirective: 'REPLACE' }));
  return `${publicUrl(key)}?v=${version}`;
}

/**
 * Promote a staging object to an explicit canonical key — the key-addressed
 * twin of `promoteStaging`, for the Daily Gold surfaces whose art is keyed by
 * date or month-day rather than by a story slug (spec §8.4).
 */
export async function promoteToKey(stagingK: string, canonicalK: string, version: number): Promise<string> {
  const { s3, bucket } = getS3();
  await s3.send(new CopyObjectCommand({
    Bucket: bucket, Key: canonicalK, CopySource: `${bucket}/${stagingK}`,
    ContentType: 'image/webp', MetadataDirective: 'REPLACE',
  }));
  return `${publicUrl(canonicalK)}?v=${version}`;
}

/** Best-effort delete (sweeping an abandoned or promoted staging object). */
export async function deleteStorageObject(key: string): Promise<void> {
  const { s3, bucket } = getS3();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
}
