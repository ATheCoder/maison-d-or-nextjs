'use server';
/**
 * Image-slot server actions for **every** picture in the product (Phase 7).
 *
 * Keyed by `(subjectKind, subjectKey, slotKey)` rather than `(slug, file)`, so
 * one modal can serve a Golden Story leaf, a Daily Gold masthead and a Greatest
 * Moments rung without knowing which screen it is on (R6.11).
 *
 * Every verb has exactly two implementations underneath — the book's in
 * `lib/golden-story/imageStore`, Daily Gold's in `lib/daily-gold/imageStore` —
 * and this file is the seam between them. That split is deliberate: the two
 * stores read scenes from different places and write URLs to different tables,
 * while sharing the parts that actually matter (sharp→webp at 82,
 * staging→promote, one retryable step per slot). Phase 8 filled in the Daily
 * Gold half; Phase 7's "arrives with the AI phase" stubs are gone.
 *
 * Every action starts with `requireAdmin()` and validates its own inputs:
 * server actions are open HTTP endpoints.
 */
import { touchDesk, touchEdition, touchMonthDay, touchPersonBySlug } from '@/lib/daily-gold-tags';
import { requireAdmin } from '@/lib/dal';
import { parseSlotKey } from '@/lib/daily-gold/slots';
import {
  saveScene, startSlotGeneration, acceptSlot, revertSlot, uploadSlot,
} from '@/lib/golden-story/imageStore';
import {
  acceptDgSlot, revertDgSlot, saveDgScene, startDgSlotGeneration,
  uploadDgSlot, writeDgImageUrl, type DgSubject,
} from '@/lib/daily-gold/imageStore';

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

/** Narrow a validated subject to the Daily Gold half. */
const dg = (subject: ImageSubject): DgSubject => ({ kind: subject.kind as 'edition' | 'month_day', key: subject.key });

/** The admin screen a Daily Gold subject is edited on. */
const dgPath = (subject: ImageSubject) => (subject.kind === 'edition'
  ? `/admin/daily-gold/${subject.key}`
  : `/admin/daily-gold/almanac/${subject.key}`);

/**
 * Tell every cache that a picture landed on this subject.
 *
 * A slot image is *read* content — `image_url` is on every record the reader
 * builds, from the masthead to a Born Today portrait — so the four tables these
 * verbs write are all behind `use cache`. This helper used to call
 * `revalidatePath` alone, which refreshes the admin's router cache and leaves
 * those entries holding the previous painting (or none) until their thirty-day
 * backstop expires. The `touch*` calls do both layers at once.
 *
 * A person subject is resolved through `touchPersonBySlug` because the Born
 * Today gallery is keyed by birth month-day rather than by slug: clearing
 * `person:<slug>` and not the gallery's tag fixes the story page and leaves the
 * portrait beside it stale. Neither `news` nor `dates` here — a picture cannot
 * publish a story or add a day to the navigator.
 */
async function touchSubject(subject: ImageSubject) {
  if (subject.kind === 'person') await touchPersonBySlug(subject.key);
  else if (subject.kind === 'edition') touchEdition(subject.key, { news: true });
  else touchMonthDay(subject.key);
}

// ── The verbs ────────────────────────────────────────────────────────────────

/**
 * Edit the slot's SUBJECT scene — the editable half of the prompt.
 *
 * Person scenes live on the brief; Daily Gold scenes live on the row the
 * picture belongs to, so both are a write to somewhere the scene travels with
 * its subject rather than with its position.
 */
export async function saveSlotSceneFor(subject: ImageSubject, slotKey: string, scene: string):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!okSubject(subject) || !okSlotKey(subject, slotKey)) return { ok: false, error: 'Bad request.' };
  const text = typeof scene === 'string' ? scene : '';
  // A person's scene lives on the brief, which no reader query reads; a Daily
  // Gold one lives on the row the picture belongs to, and `image_scene` is not
  // part of any reader record either. Neither needs a tag — but the modal that
  // opens with the prompt does need the path.
  if (subject.kind === 'person') {
    const res = await saveScene(subject.key, slotKey, text);
    if (res.ok) touchDesk(`/admin/people/${subject.key}`);
    return res;
  }

  if (!(await saveDgScene(dg(subject), slotKey, text))) {
    return { ok: false, error: 'That slot’s row no longer exists.' };
  }
  touchDesk(dgPath(subject));
  return { ok: true };
}

/** Path A: render one slot to a staging key for review. */
export async function generateSlotFor(subject: ImageSubject, slotKey: string):
  Promise<{ ok: true; jobId: number } | { ok: false; error: string }> {
  await requireAdmin();
  if (!okSubject(subject) || !okSlotKey(subject, slotKey)) return { ok: false, error: 'Bad request.' };
  return subject.kind === 'person'
    ? startSlotGeneration(subject.key, slotKey)
    : startDgSlotGeneration(dg(subject), slotKey);
}

/** Accept a staged render → canonical key + live URL. */
export async function acceptSlotFor(subject: ImageSubject, jobId: number):
  Promise<{ ok: boolean; error?: string; file?: string; url?: string }> {
  await requireAdmin();
  if (!okSubject(subject) || !Number.isInteger(jobId)) return { ok: false, error: 'Bad request.' };
  const res = subject.kind === 'person'
    ? await acceptSlot(subject.key, jobId)
    : await acceptDgSlot(dg(subject), jobId);
  // Accepting is what writes the canonical URL onto the row — the one moment in
  // Path A a reader can see. The person branch used to return here without
  // invalidating anything at all.
  if (res.ok) await touchSubject(subject);
  return res;
}

/** Discard a staged render, keeping whatever art was already live. */
export async function revertSlotFor(subject: ImageSubject, jobId: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!okSubject(subject) || !Number.isInteger(jobId)) return { ok: false };
  return subject.kind === 'person'
    ? revertSlot(subject.key, jobId)
    : revertDgSlot(dg(subject), jobId);
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
    if (res.ok) await touchSubject(subject);
    return res;
  }

  try {
    const res = await uploadDgSlot(dg(subject), slotKey as string, buffer);
    if (res.ok) await touchSubject(subject);
    return res;
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
  if (!(await writeDgImageUrl(dg(subject), slotKey, null))) {
    return { ok: false, error: 'That slot’s row no longer exists.' };
  }
  await touchSubject(subject);
  return { ok: true };
}
