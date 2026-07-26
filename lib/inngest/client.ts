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

// The event generateBook sends and the whole-book writer consumes.
export type BriefRequested = {
  slug: string;
  jobId: number;
};

// The event startRewrite sends and the field rewriter consumes. `current` is the
// live editor value (may have diverged from any brief), so it rides the event.
export type RewriteRequested = {
  slug: string;
  jobId: number;
  fieldPath: string;
  current: string;
};

// ── Daily Gold (Phase 8) ─────────────────────────────────────────────────────
// Separate events rather than a subject field on the four above: the bodies
// share nothing — different tables, different prompts, different failure modes
// — and one function branching on subject kind would be two functions wearing
// a trench coat.

/** An edition by date, or a recurring month-day. Never a person. */
export type DgSubjectRef = { kind: 'edition' | 'month_day'; key: string };

// startDgSlotGeneration → renderDailyGoldSlot (Path A, to a staging key).
export type DgSlotRequested = {
  subject: DgSubjectRef;
  jobId: number;
  slotKey: string;
};

// startDgBatch → renderDailyGoldImages (straight to canonical, per-slot progress).
export type DgImagesBatchRequested = {
  subject: DgSubjectRef;
  jobId: number;
  slotKeys: string[];
};

// A whole-unit ask (§8.2). `mode` decides whether the job goes on to paint the
// slots whose scenes it just wrote — the words-only / words-and-paintings
// choice, carried on the ask itself and never stored as a preference (§8.5).
export type DgAskRequested = {
  subject: DgSubjectRef;
  jobId: number;
  kind: 'day' | 'news' | 'history' | 'moments';
  mode: 'words' | 'words+paintings';
  count: number;
};

// startDgRewrite → rewriteDailyGoldField. `context` is what the surrounding row
// makes true (the destination, the year), since a Daily Gold field has no brief
// to be anchored by.
export type DgRewriteRequested = {
  subject: DgSubjectRef;
  jobId: number;
  fieldPath: string;
  current: string;
  context: string;
};
