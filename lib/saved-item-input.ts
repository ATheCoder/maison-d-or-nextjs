/**
 * Pure validation/normalisation for the treasury save toggle. Kept out of
 * app/treasury/actions.ts so the decision logic is unit-testable without a DB
 * or a session, the same split lib/flag-seal-input.ts makes for earns.
 *
 * A save is a deliberate tap, so only the three fields that make the row
 * identifiable or renderable can reject it. Everything else is display
 * decoration and soft-normalises to null rather than losing the child's save.
 */
import { countryByCode } from './countries';
import { isIsoDate } from './flag-seal-input';

export const SAVED_ITEM_TYPES = [
  'person', 'destination', 'news', 'on_this_day', 'greatest_moment',
  'taste', 'sound', 'nature', 'phrase',
] as const;
export type SavedItemType = (typeof SAVED_ITEM_TYPES)[number];

export function isSavedItemType(value: unknown): value is SavedItemType {
  return typeof value === 'string' && (SAVED_ITEM_TYPES as readonly string[]).includes(value);
}

export type SaveInput = {
  itemType?: unknown;
  itemId?: unknown;
  itemTitle?: unknown;
  itemSubtitle?: unknown;
  itemImageUrl?: unknown;
  countryCode?: unknown;
  countryName?: unknown;
  editionDate?: unknown;
};

/** The saved_item columns a toggle writes, ready to spread into an insert. */
export type SavedItemValues = {
  itemType: SavedItemType;
  itemId: string;
  itemTitle: string;
  itemSubtitle: string | null;
  itemImageUrl: string | null;
  countryCode: string | null;
  countryName: string | null;
  editionDate: string | null;
};

export type NormalisedSave =
  | { ok: true; value: SavedItemValues }
  | { ok: false; reason: 'invalid_type' | 'invalid_item_id' | 'invalid_title' };

function trimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validate a save request. The three rejections are the ones a caller cannot
 * recover from: an unknown type, an unusable toggle key, or a card with
 * nothing to render as its title.
 */
export function normaliseSaveInput(input: SaveInput): NormalisedSave {
  if (!isSavedItemType(input.itemType)) return { ok: false, reason: 'invalid_type' };

  // Truncating either of these would be worse than rejecting: item_id is the
  // toggle key, and a clipped one would save under an id no heart can match.
  const itemId = trimmed(input.itemId);
  if (!itemId || itemId.length > 300) return { ok: false, reason: 'invalid_item_id' };

  const itemTitle = trimmed(input.itemTitle);
  if (!itemTitle || itemTitle.length > 200) return { ok: false, reason: 'invalid_title' };

  const subtitle = trimmed(input.itemSubtitle);

  // Only real web images — a data:/javascript: URL would reach an <img src>.
  const imageUrl = trimmed(input.itemImageUrl);
  const itemImageUrl = /^https?:\/\//i.test(imageUrl) && imageUrl.length <= 2048 ? imageUrl : null;

  // Codes are authoritative or absent, never the `''` the legacy client sent
  // (flag-seal spec R6.10). An unrecognised code drops to null but keeps the
  // caller's label, which is still honest as a display string.
  const rawCode = trimmed(input.countryCode).toUpperCase();
  const country = /^[A-Z]{2}$/.test(rawCode) ? countryByCode(rawCode) : undefined;
  const callerName = trimmed(input.countryName).slice(0, 120);

  return {
    ok: true,
    value: {
      itemType: input.itemType,
      itemId,
      itemTitle,
      itemSubtitle: subtitle ? subtitle.slice(0, 300) : null,
      itemImageUrl,
      countryCode: country ? country.code : null,
      countryName: country ? (callerName || country.name) : (callerName || null),
      editionDate: isIsoDate(input.editionDate) ? input.editionDate : null,
    },
  };
}
