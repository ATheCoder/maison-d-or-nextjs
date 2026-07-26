/**
 * The per-field rewrite for Daily Gold (§8.1) — the same idiom the person
 * editor established: CURRENT beside AI-PROPOSES, accept or reject, one field
 * at a time, applied only on an explicit Accept.
 *
 * What differs from `runRewriteJob` is only the seed. A book rewrite is
 * anchored by the golden thread and the character sheet, both of which live on
 * a brief; a Daily Gold rewrite is anchored by whatever the surrounding row
 * makes true — the destination for an edition field, the year for an event —
 * so the caller passes that context and it rides the event.
 *
 * Server-only: the Inngest function imports this body.
 */
import 'server-only';
import { NonRetriableError } from 'inngest';
import type { JobResult } from '@/src/db/schema';
import { runPrompt } from '@/lib/golden-story/brief';
import { resolveDgField, rewriteDgField } from './write';

/** Strip the wrapping a model sometimes adds around a single-string reply. */
function cleanProposal(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) s = s.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
  if (s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith('“') && s.endsWith('”')))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Draft an alternative for one field. `current` rides in from the event because
 * it is the live editor value, which autosave may not have flushed yet, and it
 * is stored on the result so the CURRENT column stays stable while the admin
 * reads the two side by side.
 */
export async function runDgRewriteJob(fieldPath: string, current: string, context: string): Promise<JobResult> {
  const field = resolveDgField(fieldPath);
  if (!field) throw new NonRetriableError('That field cannot be rewritten.');
  const raw = await runPrompt(rewriteDgField(field, current, context || undefined));
  return { fieldPath, current, proposal: cleanProposal(raw) };
}
