/**
 * The batch image renderer as an Inngest function — the durable replacement
 * for the after()-scheduled body that used to live in imageStore.startBatch.
 * Each slot is one retryable step (a crashed or redeployed server resumes at
 * the next slot instead of losing the batch), `concurrency` caps executing
 * steps at three, and progress lands on the generation_job row the editor
 * already polls. One slot's failure is recorded on its progress entry and the
 * rest of the batch carries on.
 */
import {
  inngest,
  type ImagesBatchRequested, type ImageSlotRequested,
  type BriefRequested, type RewriteRequested,
  type DgSlotRequested, type DgImagesBatchRequested,
  type DgAskRequested, type DgRewriteRequested,
} from './client';
import { renderSlotToCanonical, renderSlotToStaging } from '@/lib/golden-story/imageStore';
import { runBriefJob, runRewriteJob } from '@/lib/golden-story/textStore';
import { setSlotProgress, finishJob, failJob } from '@/lib/golden-story/jobs';
import { renderDgSlotToCanonical, renderDgSlotToStaging } from '@/lib/daily-gold/imageStore';
import { runAsk } from '@/lib/daily-gold/askStore';
import { runDgRewriteJob } from '@/lib/daily-gold/textStore';

export const renderImagesBatch = inngest.createFunction(
  {
    id: 'render-images-batch',
    triggers: [{ event: 'story/images.batch.requested' }],
    retries: 1, // two attempts per slot, matching the CLI renderAll this ports
    concurrency: 3,
    onFailure: async ({ event }) => {
      // The run itself died — step errors are caught below, so this is
      // something unexpected. Don't leave the row stuck in `running`.
      const { jobId } = (event.data.event.data ?? {}) as Partial<ImagesBatchRequested>;
      if (jobId) await failJob(jobId, 'The render run failed unexpectedly.');
    },
  },
  async ({ event, step }) => {
    const { slug, jobId, files } = event.data as ImagesBatchRequested;

    await Promise.all(files.map(async (file) => {
      try {
        await step.run(`render ${file}`, async () => {
          await setSlotProgress(jobId, file, 'running');
          await renderSlotToCanonical(slug, file, jobId);
          await setSlotProgress(jobId, file, 'done');
        });
      } catch (err) {
        const message = err instanceof Error ? err.message.slice(0, 300) : 'render failed';
        await step.run(`mark ${file} failed`, () => setSlotProgress(jobId, file, 'failed', message));
      }
    }));

    await step.run('finish job', () => finishJob(jobId, { done: true }));
    return { done: true };
  },
);

/**
 * The single-slot renderer (Path A) as an Inngest function — the durable
 * replacement for the after()-scheduled body in startSlotGeneration. One
 * retryable step renders to a staging key; its result (staging URL + key) lands
 * on the generation_job row the editor polls, where acceptSlot/revertSlot pick
 * it up. onFailure marks the row failed so it never sticks in `running`.
 */
export const renderSlot = inngest.createFunction(
  {
    id: 'render-slot',
    triggers: [{ event: 'story/image.slot.requested' }],
    retries: 1, // two attempts, matching the batch renderer
    concurrency: 3,
    onFailure: async ({ event }) => {
      const { jobId } = (event.data.event.data ?? {}) as Partial<ImageSlotRequested>;
      if (jobId) await failJob(jobId, 'The render run failed unexpectedly.');
    },
  },
  async ({ event, step }) => {
    const { slug, file, jobId } = event.data as ImageSlotRequested;
    const result = await step.run(`render ${file}`, () => renderSlotToStaging(slug, file, jobId));
    await step.run('finish job', () => finishJob(jobId, result));
    return { done: true };
  },
);

/**
 * The whole-book writer as an Inngest function — the durable replacement for the
 * after()-scheduled body in generateBook. One retryable step writes the brief,
 * persists it, and applies its text to the person (stamping the five stages the
 * editor polls); a second marks the job done. On exhausted retries the job row
 * is marked failed with the real error so the editor can surface it, rather than
 * the generic onFailure message. onFailure stays as a last-resort safety net.
 */
export const generateBrief = inngest.createFunction(
  {
    id: 'generate-brief',
    triggers: [{ event: 'story/brief.requested' }],
    retries: 1, // two attempts, matching the renderers
    concurrency: 2,
    onFailure: async ({ event }) => {
      const { jobId } = (event.data.event.data ?? {}) as Partial<BriefRequested>;
      if (jobId) await failJob(jobId, 'The book writer failed unexpectedly.');
    },
  },
  async ({ event, step }) => {
    const { slug, jobId } = event.data as BriefRequested;
    try {
      const result = await step.run('write book', () => runBriefJob(slug, jobId));
      await step.run('finish job', () => finishJob(jobId, result));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await step.run('mark failed', () => failJob(jobId, message));
    }
    return { done: true };
  },
);

/**
 * The per-field rewriter as an Inngest function — the durable replacement for
 * the after()-scheduled body in startRewrite. One retryable step drafts the
 * proposal; its result ({ fieldPath, current, proposal }) lands on the job row
 * where the editor's CURRENT / AI-PROPOSES review reads it. Same failure
 * handling as the book writer.
 */
export const rewriteField = inngest.createFunction(
  {
    id: 'rewrite-field',
    triggers: [{ event: 'story/rewrite.requested' }],
    retries: 1,
    concurrency: 3,
    onFailure: async ({ event }) => {
      const { jobId } = (event.data.event.data ?? {}) as Partial<RewriteRequested>;
      if (jobId) await failJob(jobId, 'The rewrite failed unexpectedly.');
    },
  },
  async ({ event, step }) => {
    const { slug, jobId, fieldPath, current } = event.data as RewriteRequested;
    try {
      const result = await step.run('draft rewrite', () => runRewriteJob(slug, fieldPath, current));
      await step.run('finish job', () => finishJob(jobId, result));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await step.run('mark failed', () => failJob(jobId, message));
    }
    return { done: true };
  },
);

// ── Daily Gold (Phase 8) ─────────────────────────────────────────────────────

/**
 * The single-slot Daily Gold renderer (Path A). One retryable step renders to a
 * staging key; its result lands on the job row the modal polls, where
 * acceptSlotFor / revertSlotFor pick it up. The book's twin, over four tables.
 */
export const renderDailyGoldSlot = inngest.createFunction(
  {
    id: 'render-daily-gold-slot',
    triggers: [{ event: 'dailygold/image.slot.requested' }],
    retries: 1,
    concurrency: 3,
    onFailure: async ({ event }) => {
      const { jobId } = (event.data.event.data ?? {}) as Partial<DgSlotRequested>;
      if (jobId) await failJob(jobId, 'The render run failed unexpectedly.');
    },
  },
  async ({ event, step }) => {
    const { subject, jobId, slotKey } = event.data as DgSlotRequested;
    const result = await step.run(`render ${slotKey}`, () => renderDgSlotToStaging(subject, slotKey, jobId));
    await step.run('finish job', () => finishJob(jobId, result));
    return { done: true };
  },
);

/**
 * The Daily Gold batch renderer — "paint everything this day is missing".
 * Each slot is one retryable step writing straight to its canonical key, so a
 * crash resumes at the next slot and one failure never discards the slots that
 * already landed (§8.4).
 */
export const renderDailyGoldImages = inngest.createFunction(
  {
    id: 'render-daily-gold-images',
    triggers: [{ event: 'dailygold/images.batch.requested' }],
    retries: 1,
    concurrency: 3,
    onFailure: async ({ event }) => {
      const { jobId } = (event.data.event.data ?? {}) as Partial<DgImagesBatchRequested>;
      if (jobId) await failJob(jobId, 'The render run failed unexpectedly.');
    },
  },
  async ({ event, step }) => {
    const { subject, jobId, slotKeys } = event.data as DgImagesBatchRequested;
    await paintSlots(step, subject, jobId, slotKeys);
    await step.run('finish job', () => finishJob(jobId, { done: true }));
    return { done: true };
  },
);

/**
 * A whole-unit ask (§8.2, §8.5): write the words, then — only if the ask said
 * so — paint the slots whose scenes it just wrote.
 *
 * The two halves are deliberately asymmetric about failure. If the writing step
 * fails there is nothing to review, so the job fails. If a *painting* fails the
 * words are already saved and reviewable, so the slot is marked failed and the
 * job still finishes: an empty slot with its prompt written is a finished state
 * (R6.2), which is exactly what a text-only run produces anyway.
 */
export const runDailyGoldAsk = inngest.createFunction(
  {
    id: 'run-daily-gold-ask',
    triggers: [{ event: 'dailygold/ask.requested' }],
    retries: 1,
    concurrency: 2,
    onFailure: async ({ event }) => {
      const { jobId } = (event.data.event.data ?? {}) as Partial<DgAskRequested>;
      if (jobId) await failJob(jobId, 'The ask failed unexpectedly.');
    },
  },
  async ({ event, step }) => {
    const { subject, jobId, kind, mode, count } = event.data as DgAskRequested;

    let outcome: Awaited<ReturnType<typeof runAsk>>;
    try {
      // The step's return value is what the Inngest run view shows, and it
      // carries `debug`: the prompt sent, the model's raw reply, the sources
      // the search actually read, and the reason each discarded item went.
      // That is the only place those exist — the job row deliberately stores
      // just the summary the admin reads — and when an ask appears to do
      // nothing, this view is where the answer is.
      outcome = await step.run('write words', () => runAsk({ kind, key: subject.key, mode, count }, jobId));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await step.run('mark failed', () => failJob(jobId, message));
      return { done: true };
    }

    if (mode === 'words+paintings' && outcome.slotKeys.length) {
      await paintSlots(step, subject, jobId, outcome.slotKeys);
    }

    await step.run('finish job', () => finishJob(jobId, outcome.result));

    // Repeated as the run's own output, so the dashboard's run list shows the
    // model calls without having to open the step.
    return { done: true, summary: outcome.result, calls: outcome.debug };
  },
);

/** The per-field rewriter for Daily Gold — the person editor's idiom, one field at a time. */
export const rewriteDailyGoldField = inngest.createFunction(
  {
    id: 'rewrite-daily-gold-field',
    triggers: [{ event: 'dailygold/rewrite.requested' }],
    retries: 1,
    concurrency: 3,
    onFailure: async ({ event }) => {
      const { jobId } = (event.data.event.data ?? {}) as Partial<DgRewriteRequested>;
      if (jobId) await failJob(jobId, 'The rewrite failed unexpectedly.');
    },
  },
  async ({ event, step }) => {
    const { jobId, fieldPath, current, context } = event.data as DgRewriteRequested;
    try {
      const result = await step.run('draft rewrite', () => runDgRewriteJob(fieldPath, current, context));
      await step.run('finish job', () => finishJob(jobId, result));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await step.run('mark failed', () => failJob(jobId, message));
    }
    return { done: true };
  },
);

/**
 * Render a set of Daily Gold slots in parallel, recording each one's outcome on
 * the job's per-slot progress. Shared by the batch renderer and the paintings
 * half of an ask, so both fail the same way: per slot, never per run.
 */
async function paintSlots(
  // Only the one method is needed, and only for void work — narrowing it here
  // keeps the helper independent of Inngest's generic step signature.
  step: { run: (id: string, fn: () => Promise<void>) => Promise<unknown> },
  subject: DgSlotRequested['subject'],
  jobId: number,
  slotKeys: string[],
): Promise<void> {
  await Promise.all(slotKeys.map(async (slotKey) => {
    try {
      await step.run(`paint ${slotKey}`, async () => {
        await setSlotProgress(jobId, slotKey, 'running');
        await renderDgSlotToCanonical(subject, slotKey, jobId);
        await setSlotProgress(jobId, slotKey, 'done');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 300) : 'render failed';
      await step.run(`mark ${slotKey} failed`, () => setSlotProgress(jobId, slotKey, 'failed', message));
    }
  }));
}
