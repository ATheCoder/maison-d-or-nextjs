'use server';
/**
 * Image-slot server actions for **every** picture in the product (Phase 7).
 *
 * Keyed by `(subjectKind, subjectKey, slotKey)` rather than `(slug, file)`, so
 * one modal can serve a Golden Story leaf, a Daily Gold masthead and a Greatest
 * Moments rung without knowing which screen it is on (R6.11).
 *
 * Person subjects delegate to `lib/golden-story/imageStore` unchanged — its
 * staging→promote logic, per-slot jobs and brief-scene writes are exactly right
 * and Phase 7 is a UI consolidation, not a rewrite of what is underneath
 * (R7.16). Daily Gold subjects get the upload/remove half here, storing under
 * the spec's §8.4 key conventions; **generating** them needs stored scenes and
 * an Inngest function, which is Phase 8 — asked for now, they say so plainly
 * rather than failing obscurely.
 *
 * Every action starts with `requireAdmin()` and validates its own inputs:
 * server actions are open HTTP endpoints.
 */
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/src/db';
import {
  dailyGoldEdition, goodNewsItem, greatestMoment, onThisDayEvent,
} from '@/src/db/schema';
import { requireAdmin } from '@/lib/dal';
import { parseSlotKey, storageKeyFor } from '@/lib/daily-gold/slots';
import { putImageAtKey } from '@/lib/golden-story/storage';
import {
  saveScene, startSlotGeneration, acceptSlot, revertSlot, uploadSlot,
} from '@/lib/golden-story/imageStore';

export type SubjectKind = 'person' | 'edition' | 'month_day';
export type ImageSubject = { kind: SubjectKind; key: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY_RE = /^\d{2}-\d{2}$/;
const FILE_RE = /^[a-z0-9-]+\.(png|webp)$/i;

/** A subject is only valid if its key matches the shape its kind implies. */
function okSubject(s: unknown): s is ImageSubject {
  if (!s || typeof s !== 'object') return false;
  const { kind, key } = s as ImageSubject;
  if (typeof key !== 'string' || !key) return false;
  if (kind === 'person') return key.length <= 200;
  if (kind === 'edition') return DATE_RE.test(key);
  if (kind === 'month_day') return MONTH_DAY_RE.test(key);
  return false;
}

/** A person slot key is a book file; a Daily Gold one parses to a real slot. */
function okSlotKey(subject: ImageSubject, slotKey: unknown): slotKey is string {
  if (typeof slotKey !== 'string') return false;
  return subject.kind === 'person' ? FILE_RE.test(slotKey) : parseSlotKey(slotKey) !== null;
}

const PHASE_8 = 'Generating Daily Gold paintings arrives with the AI phase. '
  + 'Copy the prompt, paint it elsewhere, and upload the result.';

// ── Daily Gold: where a slot's URL lives in the database ─────────────────────

/**
 * Write (or clear) a Daily Gold slot's image URL. Returns false when the row
 * the slot points at does not exist — a news position or a rank can be deleted
 * while its modal is open.
 */
async function writeDailyGoldUrl(subject: ImageSubject, slotKey: string, url: string | null): Promise<boolean> {
  const parsed = parseSlotKey(slotKey);
  if (!parsed) return false;
  const now = new Date();

  switch (parsed.kind) {
    case 'hero': {
      const r = await db.update(dailyGoldEdition)
        .set({ heroImageUrl: url, updatedAt: now })
        .where(eq(dailyGoldEdition.editionDate, subject.key))
        .returning({ id: dailyGoldEdition.id });
      return r.length > 0;
    }
    case 'destination': {
      const r = await db.update(dailyGoldEdition)
        .set({ destinationImageUrl: url, updatedAt: now })
        .where(eq(dailyGoldEdition.editionDate, subject.key))
        .returning({ id: dailyGoldEdition.id });
      return r.length > 0;
    }
    case 'news': {
      const r = await db.update(goodNewsItem)
        .set({ imageUrl: url, updatedAt: now })
        .where(and(eq(goodNewsItem.date, subject.key), eq(goodNewsItem.position, parsed.position)))
        .returning({ id: goodNewsItem.id });
      return r.length > 0;
    }
    case 'history': {
      const r = await db.update(onThisDayEvent)
        .set({ imageUrl: url, updatedAt: now })
        .where(and(
          eq(onThisDayEvent.monthDay, subject.key),
          eq(onThisDayEvent.year, parsed.year),
          eq(onThisDayEvent.position, parsed.position),
        ))
        .returning({ id: onThisDayEvent.id });
      return r.length > 0;
    }
    case 'moment': {
      const r = await db.update(greatestMoment)
        .set({ imageUrl: url, updatedAt: now })
        .where(and(eq(greatestMoment.monthDay, subject.key), eq(greatestMoment.rank, parsed.rank)))
        .returning({ id: greatestMoment.id });
      return r.length > 0;
    }
  }
}

function revalidateFor(subject: ImageSubject) {
  revalidatePath('/daily-gold-edition');
  if (subject.kind === 'person') revalidatePath(`/admin/people/${subject.key}`);
  if (subject.kind === 'edition') revalidatePath(`/admin/daily-gold/${subject.key}`);
  if (subject.kind === 'month_day') revalidatePath(`/admin/daily-gold/almanac/${subject.key}`);
  revalidatePath('/admin/daily-gold');
}

// ── The verbs ────────────────────────────────────────────────────────────────

/** Edit the slot's SUBJECT scene. Person scenes live on the brief. */
export async function saveSlotSceneFor(subject: ImageSubject, slotKey: string, scene: string):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!okSubject(subject) || !okSlotKey(subject, slotKey)) return { ok: false, error: 'Bad request.' };
  if (subject.kind === 'person') {
    return saveScene(subject.key, slotKey, typeof scene === 'string' ? scene : '');
  }
  // Daily Gold scenes have nowhere to live until Phase 8 stores per-slot
  // prompts; the modal keeps the typed scene locally for Copy in the meantime.
  return { ok: false, error: PHASE_8 };
}

/** Path A: render one slot to a staging key for review. */
export async function generateSlotFor(subject: ImageSubject, slotKey: string):
  Promise<{ ok: true; jobId: number } | { ok: false; error: string }> {
  await requireAdmin();
  if (!okSubject(subject) || !okSlotKey(subject, slotKey)) return { ok: false, error: 'Bad request.' };
  if (subject.kind !== 'person') return { ok: false, error: PHASE_8 };
  return startSlotGeneration(subject.key, slotKey);
}

/** Accept a staged render → canonical key + live URL. */
export async function acceptSlotFor(subject: ImageSubject, jobId: number):
  Promise<{ ok: boolean; error?: string; file?: string; url?: string }> {
  await requireAdmin();
  if (!okSubject(subject) || !Number.isInteger(jobId)) return { ok: false, error: 'Bad request.' };
  if (subject.kind !== 'person') return { ok: false, error: PHASE_8 };
  return acceptSlot(subject.key, jobId);
}

/** Discard a staged render, keeping whatever art was already live. */
export async function revertSlotFor(subject: ImageSubject, jobId: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!okSubject(subject) || !Number.isInteger(jobId)) return { ok: false };
  if (subject.kind !== 'person') return { ok: false };
  return revertSlot(subject.key, jobId);
}

/**
 * Path B: upload a finished PNG/webp into any slot (multipart form).
 * Person slots go through the story store; Daily Gold slots are converted to
 * webp and stored at their §8.4 key, then written onto the row.
 */
export async function uploadSlotImageFor(form: FormData):
  Promise<{ ok: boolean; error?: string; url?: string }> {
  await requireAdmin();

  const kind = form.get('subjectKind');
  const key = form.get('subjectKey');
  const slotKey = form.get('slotKey');
  const blob = form.get('image');

  const subject = { kind: kind as SubjectKind, key: String(key ?? '') };
  if (!okSubject(subject) || !okSlotKey(subject, slotKey)) return { ok: false, error: 'Bad request.' };
  if (!(blob instanceof Blob) || blob.size === 0) return { ok: false, error: 'No image file.' };
  if (blob.size > 20 * 1024 * 1024) return { ok: false, error: 'Image is too large (20 MB max).' };

  const buffer = Buffer.from(await blob.arrayBuffer());

  if (subject.kind === 'person') {
    const res = await uploadSlot(subject.key, slotKey as string, buffer);
    if (res.ok) revalidateFor(subject);
    return res;
  }

  const storageKey = storageKeyFor(slotKey as string, subject.key);
  if (!storageKey) return { ok: false, error: 'That slot has no storage key.' };

  try {
    // Cache-busted: the canonical key is stable across re-uploads, so families
    // would otherwise keep seeing the previous painting.
    const base = await putImageAtKey(storageKey, buffer);
    const url = `${base}?v=${Date.now()}`;
    if (!(await writeDailyGoldUrl(subject, slotKey as string, url))) {
      return { ok: false, error: 'That slot’s row no longer exists.' };
    }
    revalidateFor(subject);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed.' };
  }
}

/**
 * Clear a slot's art. The stored object is deliberately left in R2 — the key is
 * stable, so a re-upload overwrites it, and deleting live objects to satisfy a
 * mistaken click is the more expensive error.
 */
export async function removeSlotImageFor(subject: ImageSubject, slotKey: string):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!okSubject(subject) || !okSlotKey(subject, slotKey)) return { ok: false, error: 'Bad request.' };
  if (subject.kind === 'person') {
    // The story store owns the person record's shape; clearing there means
    // clearing the slot's override too, which Phase 8's batch relies on.
    return { ok: false, error: 'Remove a book painting by generating or uploading over it.' };
  }
  if (!(await writeDailyGoldUrl(subject, slotKey, null))) {
    return { ok: false, error: 'That slot’s row no longer exists.' };
  }
  revalidateFor(subject);
  return { ok: true };
}
