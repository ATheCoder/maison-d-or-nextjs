/**
 * The in-process generation-job runner (Phase 5). A job is a DB-backed
 * `generation_job` row plus an async body scheduled with Next's `after()` so it
 * runs on the server after the action's response is flushed — decoupled from
 * the browser, so a family member can close the tab and the book still fills
 * in. There is no queue infra: a single self-hosted admin, the row is the
 * source of truth, and the editor polls it. One running job per (slug, kind).
 */
import 'server-only';
import { after } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/src/db';
import { generationJob, type GenerationJobRow, type JobProgress, type JobResult } from '@/src/db/schema';

export type JobKind = GenerationJobRow['kind'];

// Passed to a job body so it can stamp staged progress as it works.
export type JobHandle = {
  id: number;
  slug: string;
  setProgress: (progress: JobProgress) => Promise<void>;
};

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
 * Insert a running job row without scheduling a body — for work that runs on
 * Inngest (the batch renderer, lib/inngest/functions.ts) instead of in-process
 * via after(). Same one-running-job-per-(slug, kind) guard as startJob; the
 * Inngest function owns progress updates and completion.
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
 * Insert a running job row and schedule its body to run after the response.
 * Guards one running job per (slug, kind). The body receives a handle for
 * progress updates; its return value is stored as the job `result` and the row
 * is marked done, or failed with the error message if it throws.
 */
export async function startJob(
  slug: string,
  kind: JobKind,
  initialProgress: JobProgress,
  run: (job: JobHandle) => Promise<JobResult | void>,
): Promise<{ ok: true; job: GenerationJobRow } | { ok: false; error: string }> {
  if (await runningJob(slug, kind)) {
    return { ok: false, error: `A ${kind} job is already running for this person.` };
  }

  const [row] = await db
    .insert(generationJob)
    .values({ slug, kind, state: 'running', progress: initialProgress })
    .returning();

  const handle: JobHandle = {
    id: row.id,
    slug,
    setProgress: async (progress) => {
      await db.update(generationJob).set({ progress, updatedAt: new Date() }).where(eq(generationJob.id, row.id));
    },
  };

  after(async () => {
    try {
      const result = await run(handle);
      await finishJob(row.id, (result ?? null) as JobResult | null);
    } catch (err) {
      await failJob(row.id, err instanceof Error ? err.message : String(err));
    }
  });

  return { ok: true, job: row };
}
