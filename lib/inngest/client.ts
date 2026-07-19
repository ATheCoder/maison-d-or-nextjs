/**
 * The Inngest client for this app. Dev needs no keys (`npx inngest-cli dev`
 * discovers /api/inngest); production needs INNGEST_EVENT_KEY and
 * INNGEST_SIGNING_KEY in the environment.
 */
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'maison-d-or',
  // v4 defaults to cloud mode; talk to the local dev server during `next dev`.
  isDev: process.env.NODE_ENV === 'development',
});

// The event startBatch sends and the batch renderer consumes.
export type ImagesBatchRequested = {
  slug: string;
  jobId: number;
  files: string[];
};

// The event startSlotGeneration sends and the single-slot renderer consumes.
export type ImageSlotRequested = {
  slug: string;
  jobId: number;
  file: string;
};
