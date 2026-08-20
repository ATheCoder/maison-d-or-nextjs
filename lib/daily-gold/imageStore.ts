/**
 * Daily Gold image persistence and the render bodies behind the shared modal
 * and the "and paintings" half of an ask (Phase 8).
 *
 * The twin of lib/golden-story/imageStore.ts, and deliberately a twin rather
 * than a generalisation: the book's version reads scenes off one brief and
 * writes URLs into jsonb arrays on one person row, while this one reads and
 * writes across five surfaces on four tables. What they genuinely share —
 * sharp→webp at 82, staging→promote so a rejected render never destroys live
 * art, one retryable Inngest step per slot — is shared as code, in
 * lib/golden-story/storage.ts and lib/inngest.
 *
 * **A scene lives on the row it depicts**, not beside the image key. The keys
 * in §8.4 are positional (`news-media/<date>/<position>.webp`), and a position
 * moves — a reorder, a deletion, an accepted candidate. A scene stored against
 * a position would end up describing a different story; a scene stored on the
 * row travels with it and is deleted with it.
 *
 * Server-only: DB, R2 and OpenRouter live here so the `use server` action files
 * stay thin validated wrappers and the Inngest functions can import the bodies
 * (a `use server` module can only export actions).
 */
import 'server-only';
import { NonRetriableError } from 'inngest';
import { and, eq } from 'drizzle-orm';
import { db } from '@/src/db';
import { inngest } from '@/lib/inngest/client';
import {
  dailyGoldEdition, goodNewsItem, greatestMoment, onThisDayEvent,
  type GenerationJobRow, type JobProgress, type JobResult,
} from '@/src/db/schema';
import { renderImage } from '@/lib/golden-story/images';
import { putImageAtKey, promoteToKey, deleteStorageObject } from '@/lib/golden-story/storage';
import { createJob, failJob, deleteJob, jobsForSubject } from '@/lib/golden-story/jobs';
import { buildPrompt, type DailyGoldPlacement } from './prompts';
import { parseSlotKey, slotForKey, storageKeyFor, stagingKeyFor, SENSE_KINDS, type SenseKind } from './slots';

// Size and quality are per-slot, not per-product: the list surfaces and the
// four senses are hung small, so they render at 'low' and at a smaller
// resolution than the masthead and destination. Both live on the slot
// descriptor (lib/daily-gold/slots.ts) beside the other generation parameters.

/** An edition (by date) or a month-day — never a person; their scenes are on the brief. */
export type DgSubject = { kind: 'edition' | 'month_day'; key: string };

/** Which composition block a slot key implies. */
function placementOf(slotKey: string): DailyGoldPlacement | null {
  const p = parseSlotKey(slotKey);
  return p ? p.kind : null;
}

// ── Scenes ───────────────────────────────────────────────────────────────────

// The four senses' scene and url columns, keyed by sense. Written out rather
// than built from the key, so a renamed column is a compile error here instead
// of an undefined at write time.
const SENSE_SCENE_COL = {
  taste: dailyGoldEdition.tasteScene,
  sound: dailyGoldEdition.soundScene,
  nature: dailyGoldEdition.natureScene,
  phrase: dailyGoldEdition.phraseScene,
} as const;

const senseSceneSet = (sense: SenseKind, value: string | null, now: Date) => ({
  taste: { tasteScene: value, updatedAt: now },
  sound: { soundScene: value, updatedAt: now },
  nature: { natureScene: value, updatedAt: now },
  phrase: { phraseScene: value, updatedAt: now },
}[sense]);

const senseUrlSet = (sense: SenseKind, url: string | null, now: Date) => ({
  taste: { tasteImageUrl: url, updatedAt: now },
  sound: { soundImageUrl: url, updatedAt: now },
  nature: { natureImageUrl: url, updatedAt: now },
  phrase: { phraseImageUrl: url, updatedAt: now },
}[sense]);

/**
 * Every stored scene for a subject, keyed by slot — what the editors hand the
 * modal so it can show the editable half of the prompt without another
 * round-trip per picture.
 */
export async function getScenes(subject: DgSubject): Promise<Record<string, string>> {
  const out: Record<string, string> = {};

  if (subject.kind === 'edition') {
    const [edition, news] = await Promise.all([
      db
        .select({
          hero: dailyGoldEdition.heroScene,
          dest: dailyGoldEdition.destinationScene,
          taste: dailyGoldEdition.tasteScene,
          sound: dailyGoldEdition.soundScene,
          nature: dailyGoldEdition.natureScene,
          phrase: dailyGoldEdition.phraseScene,
        })
        .from(dailyGoldEdition)
        .where(eq(dailyGoldEdition.editionDate, subject.key))
        .limit(1),
      db
        .select({ position: goodNewsItem.position, scene: goodNewsItem.imageScene })
        .from(goodNewsItem)
        .where(eq(goodNewsItem.date, subject.key)),
    ]);
    if (edition[0]?.hero) out.hero = edition[0].hero;
    if (edition[0]?.dest) out.destination = edition[0].dest;
    for (const sense of SENSE_KINDS) {
      const scene = edition[0]?.[sense];
      if (scene) out[`sense:${sense}`] = scene;
    }
    for (const n of news) if (n.scene) out[`news:${n.position}`] = n.scene;
    return out;
  }

  const [events, moments] = await Promise.all([
    db
      .select({ year: onThisDayEvent.year, position: onThisDayEvent.position, scene: onThisDayEvent.imageScene })
      .from(onThisDayEvent)
      .where(eq(onThisDayEvent.monthDay, subject.key)),
    db
      .select({ rank: greatestMoment.rank, scene: greatestMoment.imageScene })
      .from(greatestMoment)
      .where(eq(greatestMoment.monthDay, subject.key)),
  ]);
  for (const e of events) if (e.scene) out[`history:${e.year}:${e.position}`] = e.scene;
  for (const m of moments) if (m.scene) out[`moment:${m.rank}`] = m.scene;
  return out;
}

/** One slot's scene, or '' — the render path's read. */
export async function getScene(subject: DgSubject, slotKey: string): Promise<string> {
  const parsed = parseSlotKey(slotKey);
  if (!parsed) return '';

  switch (parsed.kind) {
    case 'hero':
    case 'destination': {
      const rows = await db
        .select({ hero: dailyGoldEdition.heroScene, dest: dailyGoldEdition.destinationScene })
        .from(dailyGoldEdition)
        .where(eq(dailyGoldEdition.editionDate, subject.key))
        .limit(1);
      return (parsed.kind === 'hero' ? rows[0]?.hero : rows[0]?.dest) ?? '';
    }
    case 'news': {
      const rows = await db
        .select({ scene: goodNewsItem.imageScene })
        .from(goodNewsItem)
        .where(and(eq(goodNewsItem.date, subject.key), eq(goodNewsItem.position, parsed.position)))
        .limit(1);
      return rows[0]?.scene ?? '';
    }
    case 'history': {
      const rows = await db
        .select({ scene: onThisDayEvent.imageScene })
        .from(onThisDayEvent)
        .where(and(
          eq(onThisDayEvent.monthDay, subject.key),
          eq(onThisDayEvent.year, parsed.year),
          eq(onThisDayEvent.position, parsed.position),
        ))
        .limit(1);
      return rows[0]?.scene ?? '';
    }
    case 'moment': {
      const rows = await db
        .select({ scene: greatestMoment.imageScene })
        .from(greatestMoment)
        .where(and(eq(greatestMoment.monthDay, subject.key), eq(greatestMoment.rank, parsed.rank)))
        .limit(1);
      return rows[0]?.scene ?? '';
    }
    case 'sense': {
      const rows = await db
        .select({ scene: SENSE_SCENE_COL[parsed.sense] })
        .from(dailyGoldEdition)
        .where(eq(dailyGoldEdition.editionDate, subject.key))
        .limit(1);
      return rows[0]?.scene ?? '';
    }
  }
}

/**
 * Write a slot's scene onto whichever row owns it. Returns false when that row
 * is gone — a news position or a rank can be deleted while its modal is open.
 */
export async function saveDgScene(subject: DgSubject, slotKey: string, scene: string): Promise<boolean> {
  const parsed = parseSlotKey(slotKey);
  if (!parsed) return false;
  const value = scene.slice(0, 2000) || null;
  const now = new Date();

  switch (parsed.kind) {
    case 'hero':
    case 'destination': {
      const r = await db
        .update(dailyGoldEdition)
        .set(parsed.kind === 'hero' ? { heroScene: value, updatedAt: now } : { destinationScene: value, updatedAt: now })
        .where(eq(dailyGoldEdition.editionDate, subject.key))
        .returning({ id: dailyGoldEdition.id });
      return r.length > 0;
    }
    case 'news': {
      const r = await db
        .update(goodNewsItem)
        .set({ imageScene: value, updatedAt: now })
        .where(and(eq(goodNewsItem.date, subject.key), eq(goodNewsItem.position, parsed.position)))
        .returning({ id: goodNewsItem.id });
      return r.length > 0;
    }
    case 'history': {
      const r = await db
        .update(onThisDayEvent)
        .set({ imageScene: value, updatedAt: now })
        .where(and(
          eq(onThisDayEvent.monthDay, subject.key),
          eq(onThisDayEvent.year, parsed.year),
          eq(onThisDayEvent.position, parsed.position),
        ))
        .returning({ id: onThisDayEvent.id });
      return r.length > 0;
    }
    case 'moment': {
      const r = await db
        .update(greatestMoment)
        .set({ imageScene: value, updatedAt: now })
        .where(and(eq(greatestMoment.monthDay, subject.key), eq(greatestMoment.rank, parsed.rank)))
        .returning({ id: greatestMoment.id });
      return r.length > 0;
    }
    case 'sense': {
      const r = await db
        .update(dailyGoldEdition)
        .set(senseSceneSet(parsed.sense, value, now))
        .where(eq(dailyGoldEdition.editionDate, subject.key))
        .returning({ id: dailyGoldEdition.id });
      return r.length > 0;
    }
  }
}

/** The full prompt for a slot, or '' when it has no scene yet (a normal state, R6.2). */
export async function promptForSlot(subject: DgSubject, slotKey: string): Promise<string> {
  const placement = placementOf(slotKey);
  if (!placement) return '';
  return buildPrompt(await getScene(subject, slotKey), placement);
}

// ── Where a slot's URL lives ─────────────────────────────────────────────────

/**
 * Write (or clear) a slot's image URL on whichever table owns it. Returns false
 * when the row the slot points at is gone, so that reads as "this slot no
 * longer exists" rather than as a silent no-op.
 */
export async function writeDgImageUrl(subject: DgSubject, slotKey: string, url: string | null): Promise<boolean> {
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
    case 'sense': {
      const r = await db.update(dailyGoldEdition)
        .set(senseUrlSet(parsed.sense, url, now))
        .where(eq(dailyGoldEdition.editionDate, subject.key))
        .returning({ id: dailyGoldEdition.id });
      return r.length > 0;
    }
  }
}

// ── Path A: generate to staging, then accept or revert ───────────────────────

/**
 * Start a single-slot render for review. The render runs on Inngest
 * (renderDailyGoldSlot) — a retryable step that survives a redeploy — so this
 * only validates that there is something to render, creates the job row the
 * modal polls, and sends the event.
 */
export async function startDgSlotGeneration(subject: DgSubject, slotKey: string):
  Promise<{ ok: true; jobId: number } | { ok: false; error: string }> {
  if (!slotForKey(slotKey)) return { ok: false, error: 'Unknown slot.' };
  if (!(await promptForSlot(subject, slotKey))) {
    return { ok: false, error: 'Write the scene first — there is nothing to paint from yet.' };
  }

  const created = await createJob(subject, 'slot', { slots: { [slotKey]: { state: 'running' } } });
  if (!created.ok) return { ok: false, error: created.error };
  try {
    await inngest.send({
      name: 'dailygold/image.slot.requested',
      data: { subject, jobId: created.job.id, slotKey },
    });
  } catch {
    await failJob(created.job.id, 'Could not reach Inngest to enqueue the render.');
    return { ok: false, error: 'Could not reach Inngest to enqueue the render — is the dev server running?' };
  }
  return { ok: true, jobId: created.job.id };
}

/**
 * Render one slot to a staging key — the body of the renderDailyGoldSlot step.
 * Re-reads the scene so a retried step works from current data, and throws
 * NonRetriableError where a retry cannot help.
 */
export async function renderDgSlotToStaging(subject: DgSubject, slotKey: string, jobId: number): Promise<JobResult> {
  const slot = slotForKey(slotKey);
  if (!slot) throw new NonRetriableError('Unknown slot.');
  const prompt = await promptForSlot(subject, slotKey);
  if (!prompt) throw new NonRetriableError('No prompt for this slot — write the scene first.');
  const key = stagingKeyFor(slotKey, subject.key, jobId);
  if (!key) throw new NonRetriableError('That slot has no storage key.');

  const png = await renderImage(prompt, slot.size, slot.quality);
  const url = await putImageAtKey(key, png);
  return { slotKey, stagingUrl: url, stagingKey: key };
}

/** Accept a staged render: promote it to the canonical key, write the URL, clear the job. */
export async function acceptDgSlot(subject: DgSubject, jobId: number):
  Promise<{ ok: boolean; error?: string; url?: string }> {
  const job = await loadJob(subject, jobId);
  if (!job || job.kind !== 'slot' || job.state !== 'done') return { ok: false, error: 'No render to accept.' };
  const res = job.result as { slotKey?: string; stagingKey?: string } | null;
  if (!res?.slotKey || !res.stagingKey) return { ok: false, error: 'The render is incomplete.' };

  const canonical = storageKeyFor(res.slotKey, subject.key);
  if (!canonical) return { ok: false, error: 'That slot has no storage key.' };

  const url = await promoteToKey(res.stagingKey, canonical, jobId);
  if (!(await writeDgImageUrl(subject, res.slotKey, url))) {
    return { ok: false, error: 'That slot’s row no longer exists.' };
  }
  await deleteStorageObject(res.stagingKey);
  await deleteJob(jobId);
  return { ok: true, url };
}

/** Discard a staged render, keeping whatever art was already live. */
export async function revertDgSlot(subject: DgSubject, jobId: number): Promise<{ ok: boolean }> {
  const job = await loadJob(subject, jobId);
  const key = (job?.result as { stagingKey?: string } | null)?.stagingKey;
  if (key) await deleteStorageObject(key);
  await deleteJob(jobId);
  return { ok: true };
}

/** Path B: store an uploaded file at the slot's canonical key. */
export async function uploadDgSlot(subject: DgSubject, slotKey: string, buffer: Buffer):
  Promise<{ ok: boolean; error?: string; url?: string }> {
  const canonical = storageKeyFor(slotKey, subject.key);
  if (!canonical) return { ok: false, error: 'That slot has no storage key.' };
  // Cache-busted: the canonical key is stable across re-uploads, so families
  // would otherwise keep seeing the previous painting.
  const base = await putImageAtKey(canonical, buffer);
  const url = `${base}?v=${Date.now()}`;
  if (!(await writeDgImageUrl(subject, slotKey, url))) {
    return { ok: false, error: 'That slot’s row no longer exists.' };
  }
  return { ok: true, url };
}

// ── The "and paintings" half of an ask ───────────────────────────────────────

/**
 * Render one slot straight to its canonical key — the body of one step of a
 * words-and-paintings ask. Written the moment it lands, so one slot failing
 * never discards the slots that succeeded (R6.4, §8.4).
 */
export async function renderDgSlotToCanonical(subject: DgSubject, slotKey: string, jobId: number): Promise<void> {
  const slot = slotForKey(slotKey);
  if (!slot) throw new NonRetriableError('Unknown slot.');
  const prompt = await promptForSlot(subject, slotKey);
  if (!prompt) throw new NonRetriableError('No prompt for this slot — write the scene first.');
  const canonical = storageKeyFor(slotKey, subject.key);
  if (!canonical) throw new NonRetriableError('That slot has no storage key.');

  const png = await renderImage(prompt, slot.size, slot.quality);
  const base = await putImageAtKey(canonical, png);
  if (!(await writeDgImageUrl(subject, slotKey, `${base}?v=${jobId}`))) {
    throw new NonRetriableError('That slot’s row no longer exists.');
  }
}

/**
 * Start a batch of Daily Gold slots — "paint everything this day is missing".
 * A slot with no scene is skipped because there is nothing to paint from, which
 * is a normal state rather than an error (R6.2); an empty batch therefore
 * reports a message instead of failing.
 */
export async function startDgBatch(subject: DgSubject, slotKeys: string[]):
  Promise<{ ok: true; jobId: number; count: number } | { ok: false; error: string }> {
  const targets: string[] = [];
  for (const key of slotKeys) {
    if (slotForKey(key) && await promptForSlot(subject, key)) targets.push(key);
  }
  if (!targets.length) return { ok: false, error: 'Nothing to paint — none of these slots has a scene yet.' };

  const initial: JobProgress = { slots: Object.fromEntries(targets.map((k) => [k, { state: 'queued' }])) };
  const created = await createJob(subject, 'images', initial);
  if (!created.ok) return { ok: false, error: created.error };
  try {
    await inngest.send({
      name: 'dailygold/images.batch.requested',
      data: { subject, jobId: created.job.id, slotKeys: targets },
    });
  } catch {
    await failJob(created.job.id, 'Could not reach Inngest to enqueue the renders.');
    return { ok: false, error: 'Could not reach Inngest to enqueue the renders — is the dev server running?' };
  }
  return { ok: true, jobId: created.job.id, count: targets.length };
}

async function loadJob(subject: DgSubject, jobId: number): Promise<GenerationJobRow | null> {
  const rows = await jobsForSubject(subject);
  return rows.find((r) => r.id === jobId) ?? null;
}
