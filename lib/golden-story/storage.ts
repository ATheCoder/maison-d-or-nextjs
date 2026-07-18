/**
 * R2 storage for editor-generated and uploaded story art — lifted from
 * app/daily-gold-edition/actions.ts (getS3) so both surfaces share one client.
 * Images land under story-media/<slug>/<file>.webp (the prefix
 * upload-story-media.mjs already uses) as sharp-converted webp, served from
 * ${R2_DOMAIN}/<key>.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
  const name = `${file.replace(/\.[^./]+$/, '')}.webp`;
  const key = `story-media/${slug}/${name}`;
  const webp = await sharp(buffer).webp({ quality: 82 }).toBuffer();
  const { s3, bucket } = getS3();
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: webp, ContentType: 'image/webp' }));
  const publicBase = process.env.R2_DOMAIN!.replace(/\/$/, '');
  return `${publicBase}/${key}`;
}
