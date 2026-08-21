'use client';
/**
 * A slot outside the modal: **a picture and one opener, nothing else** (R6.9).
 *
 * No generate/upload/prompt cluster sits beside a thumbnail — three verbs per
 * slot across seventeen slots in a Golden Story is a wall of buttons, and it
 * forces every screen holding a picture to reimplement the same behaviour
 * slightly differently. Status stays out here because it has to be glanceable
 * down a list; the verbs live inside ImageModal.
 *
 * This is the Daily Gold opener — the person editor hands ImageModal its own
 * slot job, since its status board is already polling for one. Here the job is
 * polled while the modal is open and only while it is open: a render outlives
 * the modal, and finding the staged result waiting on the next open is the
 * behaviour, not a bug to paper over with a global poller.
 */
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { ImageSlot } from '@/lib/daily-gold/slots';
import type { ImageSubject } from '@/app/admin/imageActions';
import { getDgJobs } from '@/app/admin/daily-gold/aiActions';
import type { GenerationJobRow } from '@/src/db/schema';
import { Button } from '@/components/ds';
import ImageModal from './ImageModal';

export default function SlotOpener({
  slot, subject, imageUrl, scene = '', context, previewTitle,
  width = 224, height = 112, emptyText = 'no painting yet', onChanged,
}: {
  slot: ImageSlot;
  subject: ImageSubject;
  imageUrl: string | null;
  scene?: string;
  context?: string;
  previewTitle?: string;
  width?: number;
  height?: number;
  emptyText?: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const filled = Boolean(imageUrl?.trim());

  /**
   * Close the image modal whenever this leaves the screen.
   *
   * Under Cache Components <Activity> hides a route instead of unmounting it,
   * so an overlay left open comes back open on return. A full-screen ImageModal reappearing over a day the admin has just
   * navigated to is disorienting, and its polling would restart with it.
   * The editor's drafts are deliberately left alone — surviving a navigation is
   * what Activity is *for*; it is the transient furniture on top that has to go.
   */
  useLayoutEffect(() => () => { setOpen(false); }, []);

  // The Path-A render for *this* slot, polled only while the modal is open —
  // a render takes tens of seconds and the admin is looking straight at it.
  // Closing the modal stops the polling but not the job: the staged result is
  // still there on the next open, which is what leave-and-return means.
  const [job, setJob] = useState<GenerationJobRow | null>(null);
  const load = useCallback(() => {
    if (subject.kind === 'person') return;
    void getDgJobs({ kind: subject.kind, key: subject.key }).then(({ slot: s }) => {
      const mine = s && (
        (s.result as { slotKey?: string } | null)?.slotKey === slot.key
        || Boolean(s.progress?.slots?.[slot.key])
      ) ? s : null;
      setJob(mine);
    });
  }, [subject.kind, subject.key, slot.key]);

  useEffect(() => {
    if (!open) return;
    load();
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, [open, load]);

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* The thumbnail is a hit target laid over a painting — the same
            case as the gallery's `.gl-door`, and the same answer: `bare`, so
            the picture is the button's whole look and the primitive brings
            only the focus ring and the semantics. */}
        <Button
          variant="bare"
          onClick={() => setOpen(true)}
          title={filled ? 'Open painting' : 'Add a painting'}
          className="flex items-center justify-center overflow-hidden rounded-md p-0"
          style={{
            width, height,
            border: filled
              ? '1px solid var(--border-accent)'
              : '1px dashed color-mix(in srgb, var(--text-secondary) 35%, transparent)',
            background: filled
              ? `center/cover url(${imageUrl})`
              : 'repeating-linear-gradient(135deg, color-mix(in srgb, var(--text-secondary) 8%, transparent) 0 7px, transparent 7px 14px), var(--surface-tint)',
          }}
        >
          {!filled && (
            <span className="type-caption text-center" style={{ maxWidth: width - 40 }}>
              {emptyText}
            </span>
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          {filled ? 'Open painting' : 'Add a painting'}
        </Button>
      </div>

      {open && (
        <ImageModal
          slot={slot}
          subject={subject}
          imageUrl={imageUrl}
          scene={scene}
          context={context}
          previewTitle={previewTitle}
          canGenerate
          job={job ? {
            id: job.id,
            state: job.state,
            stagedUrl: (job.result as { stagingUrl?: string } | null)?.stagingUrl ?? null,
            error: job.error,
          } : null}
          onClose={() => setOpen(false)}
          onChanged={() => { onChanged(); load(); }}
        />
      )}
    </>
  );
}
