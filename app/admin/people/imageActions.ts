'use server';
/**
 * Image-slot server actions (Phase 6, screens ② and ④). Thin validated wrappers
 * over lib/golden-story/imageStore — every one starts with requireAdmin() and
 * coerces its inputs, since server actions are open endpoints. The heavy work
 * (R2, OpenRouter, DB read-modify-write, the render jobs) lives in the store.
 */
import type { Brief } from '@/lib/golden-story/brief';
import type { SlotOverride } from '@/src/db/schema';
import { requireAdmin } from '@/lib/dal';
import {
  getSlotData as storeGetSlotData,
  getSlotImages as storeGetSlotImages,
  saveScene, saveFullPrompt,
  startSlotGeneration, acceptSlot, revertSlot,
  uploadSlot, startBatch,
} from '@/lib/golden-story/imageStore';

const okSlug = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= 200;
const okFile = (s: unknown): s is string => typeof s === 'string' && /^[a-z0-9-]+\.(png|webp)$/i.test(s);

/** Brief scenes + per-slot overrides — the editor builds its slot cards from these. */
export async function getSlotData(slug: string):
  Promise<{ brief: Brief | null; overrides: Record<string, SlotOverride> }> {
  await requireAdmin();
  if (!okSlug(slug)) return { brief: null, overrides: {} };
  return storeGetSlotData(slug);
}

/** The live image URL per slot file (merged into the draft after a job). */
export async function getSlotImages(slug: string): Promise<Record<string, string | null>> {
  await requireAdmin();
  if (!okSlug(slug)) return {};
  return storeGetSlotImages(slug);
}

/** Edit a slot's SUBJECT scene; re-derives the prompt (stored on the brief). */
export async function saveSlotScene(slug: string, file: string, scene: string):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!okSlug(slug) || !okFile(file)) return { ok: false, error: 'Bad request.' };
  return saveScene(slug, file, typeof scene === 'string' ? scene : '');
}

/** Store the "Edit full prompt" override, or clear it (null → use derived). */
export async function saveSlotFullPrompt(slug: string, file: string, fullPrompt: string | null):
  Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!okSlug(slug) || !okFile(file)) return { ok: false };
  return saveFullPrompt(slug, file, typeof fullPrompt === 'string' ? fullPrompt : null);
}

/** Path A: render one slot to a staging key for review. */
export async function generateSlot(slug: string, file: string):
  Promise<{ ok: true; jobId: number } | { ok: false; error: string }> {
  await requireAdmin();
  if (!okSlug(slug) || !okFile(file)) return { ok: false, error: 'Bad request.' };
  return startSlotGeneration(slug, file);
}

/** Accept a staged render → canonical key + live URL. */
export async function acceptSlotRender(slug: string, jobId: number):
  Promise<{ ok: boolean; error?: string; file?: string; url?: string }> {
  await requireAdmin();
  if (!okSlug(slug) || !Number.isFinite(jobId)) return { ok: false, error: 'Bad request.' };
  return acceptSlot(slug, jobId);
}

/** Revert (discard) a staged render, keeping the previous art. */
export async function revertSlotRender(slug: string, jobId: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!okSlug(slug) || !Number.isFinite(jobId)) return { ok: false };
  return revertSlot(slug, jobId);
}

/** Path B: upload a finished PNG/webp into a slot (multipart form). */
export async function uploadSlotImage(form: FormData):
  Promise<{ ok: boolean; error?: string; url?: string }> {
  await requireAdmin();
  const slug = form.get('slug');
  const file = form.get('file');
  const blob = form.get('image');
  if (!okSlug(slug) || !okFile(file)) return { ok: false, error: 'Bad request.' };
  if (!(blob instanceof Blob) || blob.size === 0) return { ok: false, error: 'No image file.' };
  if (blob.size > 20 * 1024 * 1024) return { ok: false, error: 'Image is too large (20 MB max).' };
  const buffer = Buffer.from(await blob.arrayBuffer());
  return uploadSlot(slug as string, file as string, buffer);
}

/** Screen ④: generate all missing (files omitted) or retry the given slots. */
export async function generateImages(slug: string, files?: string[]):
  Promise<{ ok: true; jobId: number; count: number } | { ok: false; error: string }> {
  await requireAdmin();
  if (!okSlug(slug)) return { ok: false, error: 'Bad request.' };
  const list = Array.isArray(files) ? files.filter(okFile).slice(0, 40) : undefined;
  return startBatch(slug, list);
}
