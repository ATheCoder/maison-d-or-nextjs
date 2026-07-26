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
import { useCallback, useEffect, useState } from 'react';
import type { ImageSlot } from '@/lib/daily-gold/slots';
import type { ImageSubject } from '@/app/admin/imageActions';
import { getDgJobs } from '@/app/admin/daily-gold/aiActions';
import type { GenerationJobRow } from '@/src/db/schema';
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
        <button
          onClick={() => setOpen(true)}
          title={filled ? 'Open painting' : 'Add a painting'}
          style={{
            width, height, borderRadius: 8, padding: 0, cursor: 'pointer', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: filled ? '1px solid rgba(201,169,110,.45)' : '1px dashed rgba(120,90,50,.35)',
            background: filled
              ? `center/cover url(${imageUrl})`
              : 'repeating-linear-gradient(135deg, rgba(120,90,50,.07) 0 7px, transparent 7px 14px), #f3ead2',
          }}
        >
          {!filled && (
            <span style={{ fontSize: 11, color: '#8b7355', textAlign: 'center', maxWidth: width - 40 }}>
              {emptyText}
            </span>
          )}
        </button>
        <button
          onClick={() => setOpen(true)}
          style={{
            font: '700 11px/1 Lato, system-ui, sans-serif', padding: '6px 10px', borderRadius: 8,
            border: '1px solid rgba(201,169,110,.45)', background: '#fffdf8', color: '#5c4a2a', cursor: 'pointer',
          }}
        >
          {filled ? 'Open painting' : 'Add a painting'}
        </button>
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
