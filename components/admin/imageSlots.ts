/**
 * Client-side slot view models for the editor (Phase 6). Combines the pure slot
 * descriptors (lib/golden-story/slots) with the draft person, the brief scenes,
 * the per-slot overrides and any running image jobs into the per-slot state the
 * slot card (screen ②), the status board (screen ④) and the rail panel render.
 */
import type { AnyBrief } from '@/lib/golden-story/brief';
import type { GenerationJobRow, SlotOverride } from '@/src/db/schema';
import {
  slotDescriptors, sceneFor, promptFor, copyPayload, includesCharacterSheet, slotStatus, parseImageListPath,
  type SlotDescriptor, type SlotPerson, type SlotStatus,
} from '@/lib/golden-story/slots';

export type SlotView = SlotDescriptor & {
  scene: string;
  prompt: string;
  hasPrompt: boolean;
  imageUrl: string | null;
  source?: SlotOverride['source'];
  override?: SlotOverride;
  hasFullPrompt: boolean;
  needsWhiteBg: boolean;
  // true = scene opens with the character sheet; false = it dropped it (drift
  // hint); null = no character sheet to check against, or a landscape slot.
  charSheetIncluded: boolean | null;
  status: SlotStatus;
  copyText: string;
};

// Per-file job state overlaid on the static status: the Path-A single-slot job
// or the batch renderer's per-slot progress. Failed batch slots stay failed
// after the job ends, so their retry chip persists.
function jobStateFor(file: string, slot: GenerationJobRow | null, images: GenerationJobRow | null):
  'running' | 'failed' | undefined {
  if (slot && slot.state === 'running' && slot.progress?.slots?.[file]) return 'running';
  const s = images?.progress?.slots?.[file]?.state;
  if (s === 'failed') return 'failed';
  if ((s === 'running' || s === 'queued') && images?.state === 'running') return 'running';
  return undefined;
}

export function buildSlotViews(
  person: SlotPerson,
  brief: AnyBrief | null,
  overrides: Record<string, SlotOverride>,
  jobs: { slot: GenerationJobRow | null; images: GenerationJobRow | null },
): SlotView[] {
  const characterSheet = brief?.character_sheet ?? '';
  return slotDescriptors(person).map((d) => {
    const override = overrides[d.file];
    const scene = sceneFor(brief, d.briefField);
    const prompt = promptFor(d, scene, override);
    const imageUrl = readImage(person, d.personPath);
    const needsWhiteBg = d.blend === 'multiply';
    const charSheetIncluded = d.showsProtagonist && characterSheet
      ? includesCharacterSheet(scene, characterSheet)
      : null;
    return {
      ...d,
      scene,
      prompt,
      hasPrompt: !!prompt,
      imageUrl,
      source: override?.source,
      override,
      hasFullPrompt: !!override?.fullPrompt,
      needsWhiteBg,
      charSheetIncluded,
      status: slotStatus({ imageUrl, source: override?.source, hasPrompt: !!prompt, jobState: jobStateFor(d.file, jobs.slot, jobs.images) }),
      copyText: copyPayload(prompt, d.size, d.blend),
    };
  });
}

function readImage(person: SlotPerson, personPath: string): string | null {
  if (personPath === 'image_url') return person.image_url ?? null;
  if (personPath === 'childhood_image_url') return person.childhood_image_url ?? null;
  if (personPath === 'modern.image_url') return person.modern?.image_url ?? null;
  if (personPath === 'after_treasures.image_url') return person.after_treasures?.image_url ?? null;
  const hit = parseImageListPath(personPath);
  if (!hit) return null;
  const arr = hit.list === 'fun_facts' ? person.fun_facts ?? [] : person[hit.list];
  return arr[hit.index]?.image_url ?? null;
}
