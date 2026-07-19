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
} from './client';
import { renderSlotToCanonical, renderSlotToStaging } from '@/lib/golden-story/imageStore';
import { runBriefJob, runRewriteJob } from '@/lib/golden-story/textStore';
import { setSlotProgress, finishJob, failJob } from '@/lib/golden-story/jobs';

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
