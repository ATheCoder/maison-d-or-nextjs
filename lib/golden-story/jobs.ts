/**
 * The generation-job store (Phase 5–6). A job is a DB-backed `generation_job`
 * row; its work runs durably on Inngest (lib/inngest/functions.ts). There is no
 * bespoke queue: a single self-hosted admin, the row is the source of truth, and
 * the editor polls it while a job runs. One running job per (slug, kind). This
 * module owns the row lifecycle (create/finish/fail/progress); the Inngest
 * functions own execution.
 */
import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/src/db';
import { generationJob, type GenerationJobRow, type JobProgress, type JobResult } from '@/src/db/schema';

export type JobKind = GenerationJobRow['kind'];

/** The running job of a kind for a slug, if any — the concurrency guard. */
export async function runningJob(slug: string, kind: JobKind): Promise<GenerationJobRow | null> {
  const rows = await db
    .select()
    .from(generationJob)
    .where(and(eq(generationJob.slug, slug), eq(generationJob.kind, kind), eq(generationJob.state, 'running')))
    .orderBy(desc(generationJob.id))
    .limit(1);
  return rows[0] ?? null;
}

/** All jobs for a slug, newest first (the editor filters by kind/state). */
export async function jobsForSlug(slug: string): Promise<GenerationJobRow[]> {
  return db.select().from(generationJob).where(eq(generationJob.slug, slug)).orderBy(desc(generationJob.id));
}

/** Delete one job row (Reject/Accept/Dismiss on a rewrite, or clearing a job). */
export async function deleteJob(id: number): Promise<void> {
  await db.delete(generationJob).where(eq(generationJob.id, id));
}

/** Mark a job done with its result. */
export async function finishJob(id: number, result: JobResult | null): Promise<void> {
  await db
    .update(generationJob)
    .set({ state: 'done', result, updatedAt: new Date() })
    .where(eq(generationJob.id, id));
}

/** Mark a job failed with a trimmed error message (best-effort). */
export async function failJob(id: number, message: string): Promise<void> {
  await db
    .update(generationJob)
    .set({ state: 'failed', error: message.slice(0, 1000), updatedAt: new Date() })
    .where(eq(generationJob.id, id))
    .catch(() => {});
}

/**
 * Insert a running job row the editor polls. The work itself runs on Inngest
 * (lib/inngest/functions.ts): the caller sends the triggering event, and the
 * Inngest function owns progress updates and completion (finish/fail). Guards
 * one running job per (slug, kind).
 */
export async function createJob(slug: string, kind: JobKind, initialProgress: JobProgress):
  Promise<{ ok: true; job: GenerationJobRow } | { ok: false; error: string }> {
  if (await runningJob(slug, kind)) {
    return { ok: false, error: `A ${kind} job is already running for this person.` };
  }
  const [row] = await db
    .insert(generationJob)
    .values({ slug, kind, state: 'running', progress: initialProgress })
    .returning();
  return { ok: true, job: row };
}

/**
 * Set one slot's progress entry atomically with jsonb_set. Parallel Inngest
 * steps may write from separate processes, so a read-modify-write of the whole
 * progress object here would lose sibling slots' updates.
 */
export async function setSlotProgress(id: number, file: string, state: string, error?: string): Promise<void> {
  const entry = JSON.stringify(error ? { state, error } : { state });
  await db
    .update(generationJob)
    .set({
      progress: sql`jsonb_set(
        ${generationJob.progress} || jsonb_build_object('slots', coalesce(${generationJob.progress}->'slots', '{}'::jsonb)),
        array['slots', ${file}::text], ${entry}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(eq(generationJob.id, id));
}

/**
 * Overwrite a job's whole progress object — the staged progress the brief writer
 * stamps as it advances (a single-writer job, unlike the parallel-slot renderers
 * that need setSlotProgress's atomic per-slot update).
 */
export async function setJobProgress(id: number, progress: JobProgress): Promise<void> {
  await db.update(generationJob).set({ progress, updatedAt: new Date() }).where(eq(generationJob.id, id));
}
