/**
 * Laying a reader's own taps over the Treasury's server list.
 *
 * A tap and the room that has to show it are two separate round trips.
 * `toggleSavedItem` is called straight from the heart's click handler, so the
 * router knows nothing about it and will start the Treasury's request while the
 * save is still in flight; on a slow connection the walk from the paper to the
 * museum outruns the write, and the room opens from a database that has not
 * heard about the last few hearts.
 *
 * Rather than make the child wait for a write whose result they have already
 * been shown — which on 3G would be a dead press, the Treasury's skeleton
 * belonging to a route segment that has not started rendering yet — the client
 * keeps what it did and lays it over whatever the server sent.
 *
 * The pure half of that lives here, apart from the React context that holds the
 * edits (components/dailygold/ReaderContext.jsx), because the ordering and
 * de-duplication rules below are worth testing on their own.
 */

/** A treasure as both the Treasury and the save action spell it. */
export type SavedTreasure = {
  item_type: string;
  item_id: string;
  item_title: string;
  item_subtitle: string | null;
  item_image_url: string | null;
  country_code: string | null;
  country_name: string | null;
  edition_date: string | null;
};

/**
 * One session's toggles: the treasure when it was saved, `null` when it was
 * unsaved. Insertion order is recency order — the merge relies on it.
 */
export type SavedEdits = ReadonlyMap<string, SavedTreasure | null>;

/** The one spelling of a saved item's key, shared by the reads and the writes. */
export const savedKeyFor = (itemType: string, itemId: string): string => `${itemType}:${itemId}`;

const keyOf = (item: Pick<SavedTreasure, 'item_type' | 'item_id'>): string =>
  savedKeyFor(item.item_type, item.item_id);

/**
 * The server's list with this session's edits applied.
 *
 * Unsaved treasures are dropped; saved ones the server has not sent back go on
 * the front, newest first — the order `getSavedItems` returns by, so a merged
 * list and an unmerged one are ordered the same way.
 *
 * Idempotent by construction: once a write lands, its treasure is in both the
 * server list and the edits, and the `present` check keeps it from appearing
 * twice. The merge stops changing anything the moment the server agrees, which
 * is what lets the edits be kept until the reader loads a page for real rather
 * than being expired on a timer.
 *
 * Removals need only a key — there is no card to draw. Additions carry the
 * whole treasure, because for a taste, a sound, a wonder or a phrase there is
 * no source row to read one back out of: those are text columns on the edition,
 * and this snapshot is the only place that card's title has ever lived.
 */
export function mergeSavedEdits<T extends SavedTreasure>(items: T[], edits: SavedEdits): T[] {
  if (edits.size === 0) return items;

  const unsaved = new Set<string>();
  const saved: T[] = [];
  for (const [key, record] of edits) {
    if (record) saved.push(record as T);
    else unsaved.add(key);
  }

  const kept = unsaved.size > 0 ? items.filter((item) => !unsaved.has(keyOf(item))) : items;
  if (saved.length === 0) return kept;

  const present = new Set(kept.map(keyOf));
  // Reversed because the map runs oldest-tap-first and the wall reads
  // newest-first.
  const fresh = saved.filter((record) => !present.has(keyOf(record))).reverse();
  return fresh.length > 0 ? [...fresh, ...kept] : kept;
}
