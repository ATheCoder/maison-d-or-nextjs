'use client';
/**
 * A slot outside the modal: **a picture and one opener, nothing else** (R6.9).
 *
 * No generate/upload/prompt cluster sits beside a thumbnail — three verbs per
 * slot across seventeen slots in a Golden Story is a wall of buttons, and it
 * forces every screen holding a picture to reimplement the same behaviour
 * slightly differently. Status stays out here because it has to be glanceable
 * down a list; the verbs live inside ImageModal.
 */
import { useState } from 'react';
import type { ImageSlot } from '@/lib/daily-gold/slots';
import type { ImageSubject } from '@/app/admin/imageActions';
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
          onClose={() => setOpen(false)}
          onChanged={onChanged}
        />
      )}
    </>
  );
}
