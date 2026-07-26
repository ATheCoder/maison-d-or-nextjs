/**
 * Image rendering via OpenRouter's images endpoint (gpt-image-2) — ported
 * verbatim from scripts/generate-story-openrouter.mjs. Returns a raw PNG
 * buffer; storage/conversion is the caller's concern (the CLI writes PNGs to
 * public/stories/, the editor pipes through storage.putStoryImage → R2 webp).
 */
import { OPENROUTER, IMAGE_MODEL, orHeaders } from './openrouter.ts';
import type { ImageQuality } from '@/lib/daily-gold/slots.ts';

// `quality` is typed rather than a bare string because it is now a per-slot
// choice: the endpoint validates it against a four-value enum and 400s on
// anything else, which would otherwise only surface as a failed render.
export async function renderImage(prompt: string, size: string, quality: ImageQuality): Promise<Buffer> {
  const res = await fetch(`${OPENROUTER}/images`, {
    method: 'POST',
    headers: orHeaders(),
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size, quality, output_format: 'png', n: 1 }),
  });
  if (!res.ok) throw new Error(`openrouter images ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { data } = await res.json();
  return Buffer.from(data[0].b64_json, 'base64');
}
