/**
 * The fact-check job's body: run the grounded pass over a person's book
 * (lib/golden-story/factcheck.ts) and write the report onto the person.
 *
 * It writes to `remarkable_person.fact_check` and NOT to the job's own result,
 * so the verdicts survive the admin dismissing the job — a report you lose by
 * tidying the panel away is a report nobody trusts. The job row carries only
 * progress, which is what the editor polls while the pass is running.
 *
 * Nothing here touches `published`. Fact-checking warns and never gates
 * (docs/golden-stories-bible.md, Standing decision 2).
 */
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/src/db';
import { remarkablePerson, type FactCheckReport, type JobResult } from '@/src/db/schema';
import { checkBook } from './factcheck.ts';
import { factCheckCounts } from './factCheckCounts.ts';
import { setJobProgress } from './jobs.ts';

/**
 * Check one person's whole book and store the report.
 *
 * The person is re-read here rather than passed in, so a retried Inngest step
 * checks the book as it stands now instead of as it stood when the job was
 * enqueued — the admin may well have fixed something in between, and a report
 * about superseded text is worse than no report.
 */
export async function runFactCheckJob(slug: string, jobId: number): Promise<JobResult> {
  const rows = await db.select().from(remarkablePerson).where(eq(remarkablePerson.slug, slug)).limit(1);
  const person = rows[0];
  if (!person) throw new NonRetriableError('This person no longer exists.');
  if (!person.name?.trim()) throw new NonRetriableError('This person has no name to check against.');

  const report: FactCheckReport = await checkBook(person, async (done, total, label) => {
    await setJobProgress(jobId, {
      stages: [{
        key: 'check',
        label: total ? `Checking ${done + (done < total ? 1 : 0)} of ${total} · ${label}` : 'Nothing to check',
        state: done >= total ? 'done' : 'active',
      }],
    });
  });

  await db
    .update(remarkablePerson)
    .set({ factCheck: report })
    // Deliberately NOT touching updatedAt: a check is a reading of the book,
    // not an edit to it. Stamping it would make every report instantly look
    // stale against its own bookUpdatedAt, and would churn the reader caches
    // for a column families never see.
    .where(eq(remarkablePerson.slug, slug));

  const counts = factCheckCounts(report);
  return { checkedAt: report.checkedAt, ...counts };
}
