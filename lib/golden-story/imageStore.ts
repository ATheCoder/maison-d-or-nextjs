/**
 * Image-slot persistence and the render jobs behind screens ② and ④ (Phase 6).
 * Server-only: DB reads/writes, R2, and the OpenRouter image calls live here so
 * the `use server` action file stays a thin validated wrapper.
 *
 * Slots derive from the person (lib/golden-story/slots) with scenes from the
 * brief; accepted art lives on the person's image columns and its source
 * (generated vs uploaded) on story_brief.prompt_overrides. Path A renders to a
 * staging key for review; batch and upload write straight to canonical.
 */
import 'server-only';
import { NonRetriableError } from 'inngest';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/src/db';
import { inngest } from '@/lib/inngest/client';
import {
  remarkablePerson, storyBrief,
  type RemarkablePersonRow, type StorySection, type Chapter, type TimelineEntry, type Treasure,
  type SlotOverride, type GenerationJobRow, type JobProgress, type JobResult,
} from '@/src/db/schema';
import type { Brief } from './brief.ts';
import { renderImage } from './images.ts';
import { putStoryImage, putStagingImage, promoteStaging, deleteStorageObject } from './storage.ts';
import {
  slotDescriptors, sceneFor, promptFor, readPath, type SlotDescriptor, type SlotPerson,
} from './slots.ts';
import { createJob, failJob, deleteJob, jobsForSlug } from './jobs.ts';

const IMAGE_QUALITY = 'medium'; // the CLI default

// ── Loading ──────────────────────────────────────────────────────────────────

async function loadPerson(slug: string): Promise<RemarkablePersonRow | null> {
  const rows = await db.select().from(remarkablePerson).where(eq(remarkablePerson.slug, slug)).limit(1);
  return rows[0] ?? null;
}

async function loadBriefRow(slug: string) {
  const rows = await db.select().from(storyBrief).where(eq(storyBrief.slug, slug)).limit(1);
  return rows[0] ?? null;
}

// The person row as the slot model reads it (image fields + layout hints).
function toSlotPerson(row: RemarkablePersonRow): SlotPerson {
  return {
    image_url: row.imageUrl,
    childhood_image_url: row.childhoodImageUrl,
    modern: row.modern,
    after_treasures: row.afterTreasures,
    chapters: row.chapters ?? [],
    timeline: row.timeline ?? [],
    treasures: row.treasures ?? [],
  };
}

/** Brief scenes + per-slot overrides for the editor's slot cards. */
export async function getSlotData(slug: string):
  Promise<{ brief: Brief | null; overrides: Record<string, SlotOverride> }> {
  const row = await loadBriefRow(slug);
  return { brief: row?.brief ?? null, overrides: row?.promptOverrides ?? {} };
}

/** The live image URL per slot file — merged into the editor draft after a job. */
export async function getSlotImages(slug: string): Promise<Record<string, string | null>> {
  const row = await loadPerson(slug);
  if (!row) return {};
  const person = toSlotPerson(row);
  const out: Record<string, string | null> = {};
  for (const d of slotDescriptors(person)) out[d.file] = readPath(person, d.personPath) || null;
  return out;
}

function descriptorFor(person: SlotPerson, file: string): SlotDescriptor | undefined {
  return slotDescriptors(person).find((d) => d.file === file);
}

// ── Writes (serialized per slug) ─────────────────────────────────────────────
// Person and brief rows are jsonb read-modify-write, and batch slots render in
// parallel — as separate Inngest step invocations, so possibly in separate
// processes. A per-slug Postgres advisory lock (transaction-scoped) makes each
// read-modify-write atomic across processes; the previous in-process promise
// chain only protected a single server.

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function withSlugLock<T>(slug: string, fn: (tx: DbTx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${slug}))`);
    return fn(tx);
  });
}

// Map a slot's dotted personPath onto its DB column and write the URL in place.
async function applyImageUrl(slug: string, personPath: string, url: string | null): Promise<void> {
  await withSlugLock(slug, async (tx) => {
    const [row] = await tx.select().from(remarkablePerson).where(eq(remarkablePerson.slug, slug)).limit(1);
    if (!row) return;
    const set: Partial<typeof remarkablePerson.$inferInsert> = { updatedAt: new Date() };
    if (personPath === 'image_url') set.imageUrl = url;
    else if (personPath === 'childhood_image_url') set.childhoodImageUrl = url;
    else if (personPath === 'modern.image_url') set.modern = { ...(row.modern ?? {}), image_url: url } as StorySection;
    else if (personPath === 'after_treasures.image_url') set.afterTreasures = { ...(row.afterTreasures ?? {}), image_url: url } as StorySection;
    else {
      const m = /^(chapters|timeline|treasures)\.(\d+)\.image_url$/.exec(personPath);
      if (!m) return;
      const [, list, idxStr] = m;
      const idx = Number(idxStr);
      const arr = [...((row[list as 'chapters' | 'timeline' | 'treasures'] as { image_url?: string | null }[]) ?? [])];
      if (!arr[idx]) return;
      arr[idx] = { ...arr[idx], image_url: url };
      if (list === 'chapters') set.chapters = arr as Chapter[];
      else if (list === 'timeline') set.timeline = arr as TimelineEntry[];
      else set.treasures = arr as Treasure[];
    }
    await tx.update(remarkablePerson).set(set).where(eq(remarkablePerson.slug, slug));
  });
}

// Merge a patch into story_brief.prompt_overrides[file], preserving siblings.
async function mergeOverride(slug: string, file: string, patch: Partial<SlotOverride>): Promise<void> {
  await withSlugLock(slug, async (tx) => {
    const [row] = await tx.select().from(storyBrief).where(eq(storyBrief.slug, slug)).limit(1);
    const overrides = { ...(row?.promptOverrides ?? {}) };
    overrides[file] = { ...(overrides[file] ?? {}), ...patch };
    if (row) {
      await tx.update(storyBrief).set({ promptOverrides: overrides, updatedAt: new Date() }).where(eq(storyBrief.slug, slug));
    } else {
      // No brief yet (a manually-built person that was never generated) — a
      // bare row still records upload/source metadata for the slot.
      await tx.insert(storyBrief).values({ slug, brief: null, promptOverrides: overrides, updatedAt: new Date() })
        .onConflictDoUpdate({ target: storyBrief.slug, set: { promptOverrides: overrides, updatedAt: new Date() } });
    }
  });
}

// Set a string leaf in the brief by dotted path (used by scene edits).
function setBriefPath(brief: Brief, path: string, value: string): Brief {
  const keys = path.split('.');
  const clone: Brief = structuredClone(brief);
  let node: Record<string, unknown> = clone as unknown as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (node[k] == null || typeof node[k] !== 'object') return brief;
    node = node[k] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = value;
  return clone;
}

/** Edit a slot's SUBJECT scene (stored on the brief; re-derives the prompt). */
export async function saveScene(slug: string, file: string, scene: string):
  Promise<{ ok: boolean; error?: string }> {
  const person = await loadPerson(slug);
  if (!person) return { ok: false, error: 'This person no longer exists.' };
  const desc = descriptorFor(toSlotPerson(person), file);
  if (!desc) return { ok: false, error: 'Unknown slot.' };
  const row = await loadBriefRow(slug);
  if (!row?.brief) return { ok: false, error: 'Generate the story text first — scenes live on its brief.' };
  const brief = setBriefPath(row.brief, desc.briefField, scene.slice(0, 2000));
  await db.update(storyBrief).set({ brief, updatedAt: new Date() }).where(eq(storyBrief.slug, slug));
  return { ok: true };
}

/** Store or clear the "Edit full prompt" override for a slot. */
export async function saveFullPrompt(slug: string, file: string, fullPrompt: string | null):
  Promise<{ ok: boolean }> {
  await mergeOverride(slug, file, { fullPrompt: fullPrompt?.slice(0, 8000) || undefined });
  return { ok: true };
}

// ── Path A: generate in-app (staging → accept/revert) ────────────────────────

/**
 * Start a single-slot render to a staging key for review. One at a time.
 * Like the batch path, the render itself runs on Inngest (renderSlot in
 * lib/inngest/functions.ts) — a retryable step that survives a redeploy and
 * shows up in the dashboard — so this only validates the prompt, creates the
 * job row the editor polls, and sends the triggering event.
 */
export async function startSlotGeneration(slug: string, file: string):
  Promise<{ ok: true; jobId: number } | { ok: false; error: string }> {
  const person = await loadPerson(slug);
  if (!person) return { ok: false, error: 'This person no longer exists.' };
  const slotPerson = toSlotPerson(person);
  const desc = descriptorFor(slotPerson, file);
  if (!desc) return { ok: false, error: 'Unknown slot.' };

  const { brief, overrides } = await getSlotData(slug);
  const prompt = promptFor(sceneFor(brief, desc.briefField), desc.placement, overrides[file]);
  if (!prompt) return { ok: false, error: 'Add a scene (or generate the book) before rendering this slot.' };

  const created = await createJob(slug, 'slot', { slots: { [file]: { state: 'running' } } });
  if (!created.ok) return { ok: false, error: created.error };
  try {
    await inngest.send({
      name: 'story/image.slot.requested',
      data: { slug, jobId: created.job.id, file },
    });
  } catch {
    await failJob(created.job.id, 'Could not reach Inngest to enqueue the render.');
    return { ok: false, error: 'Could not reach Inngest to enqueue the render — is the dev server running?' };
  }
  return { ok: true, jobId: created.job.id };
}

/**
 * Render one slot to a staging key and return the job result the accept/revert
 * flow reads (acceptSlot promotes stagingKey → canonical). The body of the
 * renderSlot Inngest step; reloads person/brief/overrides so a retried step
 * re-derives its prompt, and throws NonRetriableError where a retry cannot help.
 */
export async function renderSlotToStaging(slug: string, file: string, jobId: number): Promise<JobResult> {
  const person = await loadPerson(slug);
  if (!person) throw new NonRetriableError('This person no longer exists.');
  const desc = descriptorFor(toSlotPerson(person), file);
  if (!desc) throw new NonRetriableError('Unknown slot.');
  const { brief, overrides } = await getSlotData(slug);
  const prompt = promptFor(sceneFor(brief, desc.briefField), desc.placement, overrides[file]);
  if (!prompt) throw new NonRetriableError('No prompt for this slot — add a scene first.');
  const png = await renderImage(prompt, desc.size, IMAGE_QUALITY);
  const { url, key } = await putStagingImage(slug, file, jobId, png);
  return { file, personPath: desc.personPath, stagingUrl: url, stagingKey: key };
}

/** Accept a staged render: promote to canonical, set the URL, clear the job. */
export async function acceptSlot(slug: string, jobId: number):
  Promise<{ ok: boolean; error?: string; file?: string; url?: string }> {
  const job = await loadJob(slug, jobId);
  if (!job || job.kind !== 'slot' || job.state !== 'done') return { ok: false, error: 'No render to accept.' };
  const res = job.result as { file?: string; personPath?: string; stagingKey?: string } | null;
  if (!res?.file || !res.personPath || !res.stagingKey) return { ok: false, error: 'The render is incomplete.' };
  const url = await promoteStaging(slug, res.file, res.stagingKey, jobId);
  await applyImageUrl(slug, res.personPath, url);
  await mergeOverride(slug, res.file, { source: 'generated', accepted: true });
  await deleteStorageObject(res.stagingKey);
  await deleteJob(jobId);
  return { ok: true, file: res.file, url };
}

/** Discard a staged render (keep the previous art), delete its staging object. */
export async function revertSlot(slug: string, jobId: number): Promise<{ ok: boolean }> {
  const job = await loadJob(slug, jobId);
  const key = (job?.result as { stagingKey?: string } | null)?.stagingKey;
  if (key) await deleteStorageObject(key);
  await deleteJob(jobId);
  return { ok: true };
}

// ── Path B: upload from an outside tool ──────────────────────────────────────

/** Store an uploaded PNG/webp into a slot (canonical key), source = uploaded. */
export async function uploadSlot(slug: string, file: string, buffer: Buffer):
  Promise<{ ok: boolean; error?: string; url?: string }> {
  const person = await loadPerson(slug);
  if (!person) return { ok: false, error: 'This person no longer exists.' };
  const desc = descriptorFor(toSlotPerson(person), file);
  if (!desc) return { ok: false, error: 'Unknown slot.' };
  const base = await putStoryImage(slug, file, buffer);
  const url = `${base}?v=${Date.now()}`; // canonical key is stable — bust the cache
  await applyImageUrl(slug, desc.personPath, url);
  await mergeOverride(slug, file, { source: 'uploaded', accepted: true });
  return { ok: true, url };
}

// ── Screen ④: generate all missing (batch) ───────────────────────────────────

/**
 * Start the batch renderer. Without `files` it renders every empty,
 * prompt-ready slot; with `files` it re-renders exactly those (per-slot retry).
 * The rendering itself runs on Inngest (lib/inngest/functions.ts) — one
 * retryable step per slot, three at a time, resumable across deploys — so this
 * only creates the job row the editor polls and sends the triggering event.
 */
export async function startBatch(slug: string, files?: string[]):
  Promise<{ ok: true; jobId: number; count: number } | { ok: false; error: string }> {
  const person = await loadPerson(slug);
  if (!person) return { ok: false, error: 'This person no longer exists.' };
  const slotPerson = toSlotPerson(person);
  const { brief, overrides } = await getSlotData(slug);

  const targets = slotDescriptors(slotPerson).filter((d) => {
    const prompt = promptFor(sceneFor(brief, d.briefField), d.placement, overrides[d.file]);
    if (!prompt) return false;
    if (files && files.length) return files.includes(d.file);
    return !readPath(slotPerson, d.personPath); // only the empty ones
  });
  if (!targets.length) return { ok: false, error: files?.length ? 'Nothing to retry.' : 'No missing slots can be generated — add scenes first.' };

  const initial: JobProgress = { slots: Object.fromEntries(targets.map((d) => [d.file, { state: 'queued' }])) };
  const created = await createJob(slug, 'images', initial);
  if (!created.ok) return { ok: false, error: created.error };
  try {
    await inngest.send({
      name: 'story/images.batch.requested',
      data: { slug, jobId: created.job.id, files: targets.map((d) => d.file) },
    });
  } catch {
    await failJob(created.job.id, 'Could not reach Inngest to enqueue the renders.');
    return { ok: false, error: 'Could not reach Inngest to enqueue the renders — is the dev server running?' };
  }
  return { ok: true, jobId: created.job.id, count: targets.length };
}

/**
 * Render one batch slot to its canonical key and write it onto the person —
 * the body of one Inngest step. Reloads person/brief/overrides so a retried
 * step re-derives its prompt from current data, and throws NonRetriableError
 * where a retry cannot help. Each slot is written the moment it lands, so a
 * failure never discards completed art.
 */
export async function renderSlotToCanonical(slug: string, file: string, jobId: number): Promise<void> {
  const person = await loadPerson(slug);
  if (!person) throw new NonRetriableError('This person no longer exists.');
  const d = descriptorFor(toSlotPerson(person), file);
  if (!d) throw new NonRetriableError('Unknown slot.');
  const { brief, overrides } = await getSlotData(slug);
  const prompt = promptFor(sceneFor(brief, d.briefField), d.placement, overrides[file]);
  if (!prompt) throw new NonRetriableError('No prompt for this slot — add a scene first.');
  const png = await renderImage(prompt, d.size, IMAGE_QUALITY);
  const base = await putStoryImage(slug, file, png);
  await applyImageUrl(slug, d.personPath, `${base}?v=${jobId}`);
  await mergeOverride(slug, file, { source: 'generated', accepted: true });
}

async function loadJob(slug: string, jobId: number): Promise<GenerationJobRow | null> {
  const rows = await jobsForSlug(slug);
  return rows.find((r) => r.id === jobId && r.slug === slug) ?? null;
}
