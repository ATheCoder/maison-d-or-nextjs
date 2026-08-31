'use client';
/**
 * The one image modal (Phase 7). Every picture in the product is opened, not
 * operated on in place — a slot outside is a picture and one opener, nothing
 * else (R6.9), and all the verbs live in here.
 *
 * It is parameterised by a **slot descriptor**, not by a screen (R6.11): the
 * pixel size, the read-only style preamble, where the scene comes from, and the
 * treatment to preview through all arrive as data. Daily Gold passes a mask and
 * a cream wash or a card gradient; a Golden Story slot passes parchment with
 * its real blend mode and keeps the flat-white rule and the corner-pixel check.
 *
 * That is what makes this component shared rather than merely similar — the
 * outcome R7.16 exists to avoid is two divergent image UIs.
 */
import { useRef, useState } from 'react';
import { Button, Field, Heading } from '@/components/ds';
import type { ImageSlot, SlotTreatment } from '@/lib/daily-gold/slots';
import {
  acceptSlotFor, generateSlotFor, removeSlotImageFor, revertSlotFor,
  saveSlotSceneFor, uploadSlotImageFor,
  type ImageSubject,
} from '@/app/admin/imageActions';

const CSS = `
.imodal-scrim { position:fixed; inset:0; background:rgba(36,26,12,.5); display:flex; align-items:center; justify-content:center; padding:24px; z-index:80; }
.imodal {
  --ground:var(--surface-page); --line:var(--border-fine); --line2:var(--border-accent);
  --ink:var(--text-primary); --brown:var(--text-secondary); --brown2:var(--text-faint); --brown3:var(--text-faint);
  --gold:var(--accent); --gold-deep:var(--accent-readable); --gold-soft:color-mix(in srgb, var(--accent) 14%, transparent);
  --green:#7d8a4e; --amber:#c08a2e; --red:var(--danger-readable);
  --serif:var(--face-display); --sans:var(--face-sans);
  --parch:var(--surface-page); --parch2:var(--surface-tint);
  background:var(--ground); border:1px solid var(--line2); border-radius:14px;
  box-shadow:0 30px 70px rgba(0,0,0,.38); overflow:hidden;
  width:min(900px,100%); max-height:92vh; display:flex; flex-direction:column;
  font-family:var(--sans); color:var(--ink);
}
.imodal * { box-sizing:border-box; }
.imodal .kick { font:700 10px/1.4 var(--sans); letter-spacing:.26em; text-transform:uppercase; color:var(--gold-deep); }
.imodal .serif { font-family:var(--serif); }
.imodal .note { font-size:11.5px; color:var(--brown2); line-height:1.6; }
.imodal .mhead { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:13px 16px; border-bottom:1px solid var(--line); background:rgba(255,248,238,.82); }
.imodal .mbody { display:grid; grid-template-columns:340px 1fr; gap:18px; padding:16px; overflow-y:auto; }
.imodal .mfoot { display:flex; align-items:center; gap:8px; padding:12px 16px; border-top:1px solid var(--line); background:rgba(255,248,238,.6); flex-wrap:wrap; }
/* .btn / .btn-gold / .btn-red / .field are gone — every verb in this modal
   is a <Button size="sm"> and the scene box is a <Field as="textarea">. */
.imodal .chip { display:inline-flex; align-items:center; gap:5px; font:700 10px/1 var(--sans); letter-spacing:.06em; text-transform:uppercase; padding:5px 9px; border-radius:999px; border:1px solid var(--line2); color:var(--brown); background:#fffdf8; white-space:nowrap; }
.imodal .chip-gold { background:var(--gold-soft); color:var(--gold-deep); }
.imodal .chip-green { background:rgba(125,138,78,.14); border-color:rgba(125,138,78,.4); color:#5f6c37; }
.imodal .chip-amber { background:rgba(192,138,46,.14); border-color:rgba(192,138,46,.42); color:#96681f; }
.imodal .chip-ink { background:rgba(36,26,12,.06); border-color:var(--line); color:var(--brown); text-transform:none; letter-spacing:0; font-weight:400; }
.imodal .seg { display:inline-flex; padding:3px; background:rgba(36,26,12,.06); border:1px solid var(--line); border-radius:10px; gap:2px; }
.imodal .seg > button { font:700 10.5px/1 var(--sans); padding:7px 11px; border-radius:7px; color:var(--brown2); border:none; background:transparent; }
.imodal .seg > button.on { background:#fffdf8; color:var(--ink); box-shadow:0 1px 6px rgba(40,26,12,.1); }
.imodal .pre { background:rgba(36,26,12,.04); border:1px solid var(--line); border-radius:8px; padding:9px 11px; font-size:10.5px; line-height:1.55; color:var(--brown2); max-height:150px; overflow:auto; white-space:pre-wrap; }
.imodal .stage { position:relative; height:208px; border-radius:8px; overflow:hidden; background:repeating-linear-gradient(135deg, rgba(120,90,50,.07) 0 7px, transparent 7px 14px), #f3ead2; display:flex; align-items:center; justify-content:center; }
.imodal .stage img { width:100%; height:100%; object-fit:cover; display:block; }
.imodal .parch { background:radial-gradient(ellipse 62% 52% at 26% 26%, rgba(255,251,238,.55), transparent 60%), linear-gradient(180deg,var(--parch),var(--parch2)); }
.imodal .parch::after { content:""; position:absolute; inset:0; box-shadow:inset 0 0 70px rgba(90,60,25,.24); pointer-events:none; }
.imodal .banner { display:flex; align-items:flex-start; gap:9px; padding:9px 11px; border-radius:9px; font-size:11.5px; line-height:1.55; }
.imodal .b-amber { background:rgba(192,138,46,.09); border:1px solid rgba(192,138,46,.38); color:#7a5518; }
.imodal .b-red { background:rgba(181,83,58,.08); border:1px solid rgba(181,83,58,.35); color:#7d3a26; }
.imodal .drop { border:1.5px dashed var(--line2); border-radius:9px; padding:12px; text-align:center; color:var(--brown2); font-size:11.5px; background:#fffdf8; cursor:pointer; display:block; }
/* The drop zone IS the file field's label, so the control it points at must
   not draw a box of its own inside it. Clicking the label still opens the
   picker — that is what htmlFor does, hidden control or not. */
.imodal .drop .field { display:none; }
.imodal .drop label { cursor:pointer; }
.imodal .drop.over { border-color:var(--gold-deep); background:var(--gold-soft); }
@media (max-width:760px) { .imodal .mbody { grid-template-columns:1fr; } }
`;

/**
 * Sample the four corner pixels; true when every corner reads near-white — the
 * flat background a multiply slot needs, or it prints as a pale box on the
 * parchment. Client-side, and it warns rather than blocks.
 */
async function cornersAreWhite(file: File): Promise<boolean> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return true;
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  ctx.drawImage(bitmap, 0, 0);
  const pts = [[0, 0], [bitmap.width - 1, 0], [0, bitmap.height - 1], [bitmap.width - 1, bitmap.height - 1]];
  return pts.every(([x, y]) => {
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    return r >= 244 && g >= 244 && b >= 244;
  });
}

/** The picture under the treatment a family actually meets it through. */
function TreatedPreview({ url, treatment, raw, title }: {
  url: string | null; treatment: SlotTreatment; raw: boolean; title?: string;
}) {
  if (!url) {
    return <div className="stage"><span className="note">No painting yet</span></div>;
  }
  if (raw || treatment.kind === 'none') {
    // eslint-disable-next-line @next/next/no-img-element
    return <div className="stage" style={{ background: '#fffdf8' }}><img src={url} alt="" /></div>;
  }

  if (treatment.kind === 'frame') {
    // The gallery hangs a painting whole inside a hairline frame, so the only
    // thing that happens to it between the file and the wall is the crop —
    // which is why this previews the crop and nothing else. Where a surface is
    // hung at two shapes (the entrance is a letterbox on a desktop and an
    // upright on a phone; the year room's lead is wider than its others) both
    // are shown side by side, because a painting can survive one and not the
    // other.
    const shapes = treatment.aspectAlt ? [treatment.aspect, treatment.aspectAlt] : [treatment.aspect];
    return (
      <div className="stage" style={{ gap: 10, padding: 10 }}>
        {shapes.map((aspect) => (
          <div key={aspect} style={{
            position: 'relative', height: '100%', aspectRatio: aspect,
            border: '1px solid rgba(120,90,50,.45)', overflow: 'hidden', flex: '0 1 auto',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" />
          </div>
        ))}
      </div>
    );
  }

  if (treatment.kind === 'mask-wash') {
    return (
      <div className="stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" style={{
          opacity: treatment.opacity,
          WebkitMaskImage: treatment.mask,
          maskImage: treatment.mask,
        }} />
        <div style={{ position: 'absolute', inset: 0, background: treatment.wash }} />
        {title && (
          <div className="serif" style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 600, color: '#241a0c', textAlign: 'center', padding: 12,
          }}>{title}</div>
        )}
      </div>
    );
  }

  if (treatment.kind === 'bottom-gradient') {
    return (
      <div className="stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" />
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, transparent ${treatment.from}, ${treatment.colour} 100%)`,
        }} />
      </div>
    );
  }

  // multiply onto the leaf's parchment
  return (
    <div className="stage parch">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" style={{ mixBlendMode: 'multiply', objectFit: 'contain' }} />
    </div>
  );
}

export type ImageModalProps = {
  slot: ImageSlot;
  subject: ImageSubject;
  /** Where the picture is now (null when the slot is empty). */
  imageUrl: string | null;
  /** The editable scene. For a book slot this comes from the brief. */
  scene: string;
  /** Context line above the title — "Daily Gold · 25 July". */
  context?: string;
  /** Overlaid on a mask-wash preview so the admin judges it under the words. */
  previewTitle?: string;
  /** Person slots only: the Path-A job state for this slot. */
  job?: { id: number; state: 'running' | 'done' | 'failed'; stagedUrl?: string | null; error?: string | null } | null;
  /** Whether generating is offered at all (false for Daily Gold until Phase 8). */
  canGenerate?: boolean;
  /** Extra chip, e.g. the book's character-sheet hint. */
  extraChip?: React.ReactNode;
  onClose: () => void;
  /** Something was written — the host should refresh. */
  onChanged: () => void;
};

export default function ImageModal({
  slot, subject, imageUrl, scene, context, previewTitle, job, canGenerate = false,
  extraChip, onClose, onChanged,
}: ImageModalProps) {
  const [raw, setRaw] = useState(false);
  const [sceneDraft, setSceneDraft] = useState(scene);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const staged = job?.state === 'done' ? job.stagedUrl ?? null : null;
  const rendering = job?.state === 'running';
  const shown = staged ?? imageUrl;
  const dirtyScene = sceneDraft !== scene;

  const run = (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    void fn().finally(() => setBusy(false));
  };

  const fullPrompt = [slot.style, sceneDraft.trim() ? `Scene: ${sceneDraft.trim()}` : '', slot.composition]
    .filter(Boolean).join('\n\n');

  const copyPayload = () => {
    const footer = slot.needsWhiteBackground
      ? '\nThe background must be pure flat white (#FFFFFF) — off-white or textured backgrounds will show as a box on the page.'
      : '';
    const text = `${fullPrompt}\n\n---\nParameters (not prompt text):\nsize ${slot.size.replace('x', '×')}, quality ${slot.quality}${footer}`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    });
  };

  const saveScene = () => run(async () => {
    const res = await saveSlotSceneFor(subject, slot.key, sceneDraft);
    if (!res.ok) { setError(res.error ?? 'Could not save the scene.'); return; }
    onChanged();
  });

  const generate = () => run(async () => {
    const res = await generateSlotFor(subject, slot.key);
    if (!res.ok) setError(res.error); else onChanged();
  });

  const accept = () => { if (!job) return; run(async () => {
    const res = await acceptSlotFor(subject, job.id);
    if (!res.ok) setError(res.error ?? 'Could not accept.'); else onChanged();
  }); };

  const revert = () => { if (!job) return; run(async () => {
    await revertSlotFor(subject, job.id);
    onChanged();
  }); };

  const remove = () => run(async () => {
    const res = await removeSlotImageFor(subject, slot.key);
    if (!res.ok) { setError(res.error ?? 'Could not remove.'); return; }
    onChanged();
    onClose();
  });

  const handleFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!/\.(png|webp|jpe?g)$/i.test(file.name) && !/image\/(png|webp|jpeg)/.test(file.type)) {
      setWarn('Only PNG, webp or JPEG files can be uploaded.'); return;
    }
    run(async () => {
      setWarn(null);
      if (slot.needsWhiteBackground && !(await cornersAreWhite(file))) {
        setWarn('Corner pixels are off-white. On a multiply slot that shows as a pale box on the parchment. Uploaded anyway.');
      }
      const form = new FormData();
      form.set('subjectKind', subject.kind);
      form.set('subjectKey', subject.key);
      form.set('slotKey', slot.key);
      form.set('image', file);
      const res = await uploadSlotImageFor(form);
      if (!res.ok) { setError(res.error ?? 'Upload failed.'); return; }
      onChanged();
    });
  };

  const treatmentLabel = slot.treatment.kind === 'multiply'
    ? 'On the page'
    : slot.treatment.kind === 'frame' ? 'As it is hung' : 'As families see it';

  return (
    <div className="imodal-scrim" onClick={onClose}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="imodal" onClick={(e) => e.stopPropagation()}>

        <div className="mhead">
          <div>
            {context && <div className="kick">{context}</div>}
            <Heading level={2} variant="story" className="mt-1 text-base">{slot.label}</Heading>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {slot.treatment.kind !== 'none' && (
              <div className="seg" role="group" aria-label="How to show the painting">
                <Button variant="bare" aria-pressed={!raw} className={!raw ? 'on' : undefined}
                  onClick={() => setRaw(false)}>{treatmentLabel}</Button>
                <Button variant="bare" aria-pressed={raw} className={raw ? 'on' : undefined}
                  onClick={() => setRaw(true)}>The raw file</Button>
              </div>
            )}
            <Button variant="link" size="sm" aria-label="Close" onClick={onClose}>✕</Button>
          </div>
        </div>

        <div className="mbody">
          {/* The picture, under its real treatment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TreatedPreview url={shown} treatment={slot.treatment} raw={raw} title={raw ? undefined : previewTitle} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              {staged
                ? <span className="chip chip-amber">Staged · not accepted</span>
                /* "Rendered", not "Painted": this chip reports that the slot
                   HAS art, and since 2026-08-31 a book can be drawn in pencil
                   — where a green "Painted" beside a pencil drawing reads as
                   the art style rather than as the slot's state. */
                : imageUrl ? <span className="chip chip-green">Rendered</span>
                  : <span className="chip chip-ink">Empty</span>}
              <span className="chip chip-ink">{slot.size.replace('x', ' × ')}</span>
              <span className="chip chip-ink">{slot.quality} quality</span>
              {slot.needsWhiteBackground && <span className="chip chip-ink">Multiply</span>}
              {extraChip}
            </div>

            {rendering && <div className="note">✦ Rendering — this takes tens of seconds.</div>}
            {job?.state === 'failed' && (
              <div className="banner b-red"><span>{job.error ?? 'The render failed.'}</span></div>
            )}
            {warn && <div className="banner b-amber"><span>{warn}</span></div>}

            {!raw && slot.treatment.kind !== 'none' && (
              <div className="note">
                {slot.treatment.kind === 'mask-wash'
                  ? 'Masked to an ellipse, washed, and written over. Judge it here — a painting that survives a thumbnail can still vanish under this.'
                  : slot.treatment.kind === 'multiply'
                    ? 'Multiplied onto the leaf’s parchment, which is why the background has to be flat white.'
                    : 'The card fades to parchment over the lower part of the frame.'}
              </div>
            )}
          </div>

          {/* The prompt: fixed preamble, editable scene */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div className="kick" style={{ color: 'var(--brown3)', marginBottom: 4 }}>
                Style + composition · read-only
              </div>
              <div className="pre">{slot.style}{'\n\n[ the scene below ]\n\n'}{slot.composition}</div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span className="kick">The scene</span>
                {dirtyScene && (
                  <Button size="sm" onClick={saveScene} loading={busy}>Save scene</Button>
                )}
              </div>
              <Field
                as="textarea" size="sm" label="The scene" labelHidden
                style={{ minHeight: 120 }} value={sceneDraft}
                onChange={(e) => setSceneDraft(e.target.value)}
                placeholder="What the painting shows…"
              />
            </div>

            <div className="note">
              Editing the scene re-derives the whole prompt. <b style={{ color: 'var(--brown)' }}>Copy</b> takes
              it with the pixel size, for painting elsewhere.
            </div>

            {/* The drop zone is the Field's own LABEL, not a <label> wrapped
                around it — nesting one label inside another is invalid, and
                the wrapper was only ever there to make the zone clickable,
                which a real `htmlFor` label already does. So the dashed box is
                a plain <div> that carries the drag handlers, the primitive
                brings the label and the hint, and the control itself is hidden
                by `.drop .field`. */}
            <div
              className={`drop${dragOver ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
            >
              <Field
                ref={fileInput}
                type="file"
                label="⤓ Drop an image — or click"
                hint={slot.needsWhiteBackground ? 'corner pixels checked on upload' : 'opaque art — no corner check'}
                accept="image/png,image/webp,image/jpeg"
                disabled={busy}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            {error && <div className="banner b-red"><span>{error}</span></div>}
          </div>
        </div>

        <div className="mfoot">
          {canGenerate && (
            staged ? (
              <>
                <Button size="sm" onClick={accept} loading={busy}>✓ Keep this one</Button>
                <Button variant="ghost" size="sm" onClick={generate} disabled={busy}>✦ Regenerate</Button>
                <Button variant="ghost" size="sm" onClick={revert} disabled={busy}>Revert</Button>
              </>
            ) : (
              <Button size="sm" onClick={generate} loading={busy || rendering}>
                {rendering ? 'Rendering…' : imageUrl ? '✦ Regenerate' : '✦ Generate'}
              </Button>
            )
          )}
          <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()} disabled={busy}>Upload a file</Button>
          <Button variant="ghost" size="sm" onClick={copyPayload}>{copied ? '✓ Copied' : 'Copy prompt'}</Button>
          {imageUrl && subject.kind !== 'person' && (
            <Button variant="danger" size="sm" className="ml-auto" onClick={remove} loading={busy}>
              Remove
            </Button>
          )}
          <Button variant="ghost" size="sm"
            className={imageUrl && subject.kind !== 'person' ? undefined : 'ml-auto'}
            onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}
