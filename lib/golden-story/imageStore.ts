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
import { eq } from 'drizzle-orm';
import { db } from '@/src/db';
import {
  remarkablePerson, storyBrief,
  type RemarkablePersonRow, type StorySection, type Chapter, type TimelineEntry, type Treasure,
  type SlotOverride, type GenerationJobRow, type JobProgress,
} from '@/src/db/schema';
import type { Brief } from './brief.ts';
import { renderImage } from './images.ts';
import { putStoryImage, putStagingImage, promoteStaging, deleteStorageObject } from './storage.ts';
import {
  slotDescriptors, sceneFor, promptFor, readPath, type SlotDescriptor, type SlotPerson,
} from './slots.ts';
import { startJob, deleteJob, jobsForSlug } from './jobs.ts';

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
// A batch renders with concurrency 3, so several workers finish at once. Person
// and brief rows are jsonb read-modify-write, so all writes for a slug funnel
// through one promise chain — no lost update when two slots land together.

const chains = new Map<string, Promise<unknown>>();
function serialize<T>(slug: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(slug) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  chains.set(slug, next.catch(() => {}));
  return next;
}

// Map a slot's dotted personPath onto its DB column and write the URL in place.
async function applyImageUrl(slug: string, personPath: string, url: string | null): Promise<void> {
  await serialize(slug, async () => {
    const row = await loadPerson(slug);
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
    await db.update(remarkablePerson).set(set).where(eq(remarkablePerson.slug, slug));
  });
}

// Merge a patch into story_brief.prompt_overrides[file], preserving siblings.
async function mergeOverride(slug: string, file: string, patch: Partial<SlotOverride>): Promise<void> {
  await serialize(slug, async () => {
    const row = await loadBriefRow(slug);
    const overrides = { ...(row?.promptOverrides ?? {}) };
    overrides[file] = { ...(overrides[file] ?? {}), ...patch };
    if (row) {
      await db.update(storyBrief).set({ promptOverrides: overrides, updatedAt: new Date() }).where(eq(storyBrief.slug, slug));
    } else {
      // No brief yet (a manually-built person that was never generated) — a
      // bare row still records upload/source metadata for the slot.
      await db.insert(storyBrief).values({ slug, brief: null, promptOverrides: overrides, updatedAt: new Date() })
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

/** Start a single-slot render to a staging key for review. One at a time. */
export async function startSlotGeneration(slug: string, file: string):
  Promise<{ ok: true; jobId: number } | { ok: false; error: string }> {
  const person = await loadPerson(slug);
  if (!person) return { ok: false, error: 'This person no longer exists.' };
  const slotPerson = toSlotPerson(person);
  const desc = descriptorFor(slotPerson, file);
  if (!desc) return { ok: false, error: 'Unknown slot.' };

  const { brief, overrides } = await getSlotData(slug);
  const scene = sceneFor(brief, desc.briefField);
  const prompt = promptFor(scene, desc.placement, overrides[file]);
  if (!prompt) return { ok: false, error: 'Add a scene (or generate the book) before rendering this slot.' };

  const started = await startJob(slug, 'slot', { slots: { [file]: { state: 'running' } } }, async (job) => {
    const png = await renderImage(prompt, desc.size, IMAGE_QUALITY);
    const { url, key } = await putStagingImage(slug, file, job.id, png);
    return { file, personPath: desc.personPath, stagingUrl: url, stagingKey: key };
  });
  if (!started.ok) return { ok: false, error: started.error };
  return { ok: true, jobId: started.job.id };
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
 * Concurrency 3, one retry per slot (ported from the CLI's renderAll). Each slot
 * is written the moment it lands, so a failure never discards completed art.
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
  const started = await startJob(slug, 'images', initial, async (job) => {
    const progress: JobProgress = { slots: { ...initial.slots } };
    const flush = () => serialize(slug, () => job.setProgress({ slots: { ...progress.slots } }));
    const mark = async (file: string, state: string, error?: string) => {
      progress.slots![file] = { state, ...(error ? { error } : {}) };
      await flush();
    };

    const queue = [...targets];
    const worker = async () => {
      for (let d = queue.shift(); d; d = queue.shift()) {
        await mark(d.file, 'running');
        const prompt = promptFor(sceneFor(brief, d.briefField), d.placement, overrides[d.file]);
        let done = false;
        for (let attempt = 1; attempt <= 2 && !done; attempt++) {
          try {
            const png = await renderImage(prompt, d.size, IMAGE_QUALITY);
            const base = await putStoryImage(slug, d.file, png);
            await applyImageUrl(slug, d.personPath, `${base}?v=${job.id}`);
            await mergeOverride(slug, d.file, { source: 'generated', accepted: true });
            await mark(d.file, 'done');
            done = true;
          } catch (err) {
            if (attempt >= 2) await mark(d.file, 'failed', err instanceof Error ? err.message.slice(0, 300) : 'render failed');
          }
        }
      }
    };
    await Promise.all(Array.from({ length: 3 }, worker));
    return { done: true };
  });
  if (!started.ok) return { ok: false, error: started.error };
  return { ok: true, jobId: started.job.id, count: targets.length };
}

async function loadJob(slug: string, jobId: number): Promise<GenerationJobRow | null> {
  const rows = await jobsForSlug(slug);
  return rows.find((r) => r.id === jobId && r.slug === slug) ?? null;
}
