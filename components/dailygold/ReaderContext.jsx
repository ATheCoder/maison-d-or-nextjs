'use client';
/**
 * The reader, held once for the whole (dg) group.
 *
 * Who is reading, and what they have already saved, is the same answer on the
 * paper, in the Treasury and in the Passport — and it does not change when they
 * cross between those rooms. It used to be re-fetched per page anyway, because
 * a page is the only thing Next.js re-renders on a client-side navigation and
 * `React.cache` memoises within one request, never between two. So pressing
 * Treasury and pressing back re-read the session, the child row and the saved
 * keys every time, and the paper could not be reused from the router's client
 * cache at all: a page segment carrying one child's hearts is not a segment you
 * may hand to the next reader, or to the same reader five taps later.
 *
 * A layout *is* preserved across those navigations. So the reads happen once,
 * in app/(dg)/layout.tsx, and land here — and the page segment above them is
 * left carrying nothing but the day, identical for every reader on a given
 * date, which is what makes it safe to prefetch and keep (see DGNavigationRail).
 *
 * The saved set is state, not a prop, for the second half of that bargain. Once
 * the paper is served from the client cache the server is no longer asked "what
 * is saved?" on every page turn, so the answer has to be maintained here
 * instead: TreasuryHeart reports every landed toggle through `noteSaved`,
 * whichever room it was tapped in. A treasure unsaved in the Treasury empties
 * its heart on the paper without a round trip, which is both the correct
 * behaviour and the thing that keeps a cached page honest.
 *
 * ── Why the toggle is recorded before the server answers ──────────────────
 *
 * A tap and the room that has to show it are two different round trips, and on
 * a slow connection they lose their race. `toggleSavedItem` is called straight
 * from the heart's click handler, so the router knows nothing about it and will
 * start the Treasury's own request while the save is still in flight; the
 * Treasury then renders from a database that has not heard about the last three
 * hearts. Recording the toggle only once the server replied left this store
 * behind the tap by a full round trip, which is the same bug one layer up.
 *
 * So `noteSaved` fires on the optimistic flip and the server's answer is
 * re-applied when it lands — normally a no-op, and a rollback when the save
 * failed or a concurrent tap in another tab flipped it the other way. Waiting
 * instead would put the 3G round trip back in front of the child, and it would
 * do it with nothing on screen: the Treasury's skeleton belongs to its route
 * segment and cannot appear until the navigation actually starts.
 *
 * ── Why removals are cheaper than additions ───────────────────────────────
 *
 * `edits` keeps the key for both directions and the treasure itself for one.
 * Taking a card off the wall needs only its key — there is nothing to draw.
 * Putting one up needs something to draw it *from*, and for a taste, a sound,
 * a wonder or a phrase there is no source row to read it back out of: those are
 * text columns on the edition, and the snapshot in saved_item is the only place
 * that card's title has ever lived (see the closing branch of
 * getSavedItemDetail). The heart is holding that snapshot anyway — it has to
 * POST it — so it hands it here rather than letting it go and asking the server
 * for something the server cannot yet answer.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { mergeSavedEdits, savedKeyFor } from '@/lib/saved-treasures';

const ReaderContext = createContext(null);

/**
 * Outside the provider — the design-sync previews render these components
 * standalone — the reader is nobody and nothing is saved, which is the same
 * answer the components used to get from their own prop defaults.
 */
const INERT = {
  child: null,
  signedOut: false,
  savedSet: null,
  noteSaved: () => {},
  // Nothing tapped, nothing to lay over the server's answer.
  mergeSavedItems: (items) => items,
};

/**
 * Stable identity, because it is handed to the whole tree as `savedSet`: a
 * fresh empty Set per render would change every section's props on every
 * render of the chrome.
 */
const EMPTY_SET = new Set();

/** The same, for the edit map: one shared empty, never mutated. */
const NO_EDITS = new Map();

/**
 * A treasure in the shape both sides already speak: what getSavedItems returns
 * to the Treasury, and what TreasuryHeart sends to the server. Their matching
 * is what lets an optimistic card sit in the server's own list untranslated.
 *
 * `saved_at` is deliberately absent from an optimistic record. It is the
 * server's ordering column, and stamping it from the browser's clock would be
 * inventing a fact; the merge prepends instead, which is the same newest-first
 * order getSavedItems returns by.
 *
 * @typedef {import('@/lib/saved-treasures').SavedTreasure} SavedTreasure
 */

/**
 * @returns {{
 *   child: { id: string, name: string, avatar: string } | null,
 *   signedOut: boolean,
 *   savedSet: Set<string> | null,
 *   noteSaved: (record: SavedTreasure, saved: boolean) => void,
 *   mergeSavedItems: (items: SavedTreasure[]) => SavedTreasure[],
 * }}
 */
export function useReader() {
  return useContext(ReaderContext) ?? INERT;
}

const keyOf = (item) => savedKeyFor(item.item_type, item.item_id);

/**
 * @param {{
 *   child?: { id: string, name: string, avatar: string } | null,
 *   signedOut?: boolean,
 *   savedKeys?: string[] | null,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function ReaderProvider({ child = null, signedOut = false, savedKeys = null, children }) {
  const [keys, setKeys] = useState(() => (savedKeys ? new Set(savedKeys) : null));

  /**
   * Every toggle made in this client session: key → the treasure when it was
   * saved, `null` when it was unsaved. Replaced, never mutated, so that
   * clearing it below is an ordinary state update rather than a write to a ref
   * during render — which React rightly refuses.
   */
  const [edits, setEdits] = useState(NO_EDITS);

  // The server's answer, when it changes, wins — including over the edits,
  // which is why they are dropped here rather than accumulated forever. It
  // cannot change on a client navigation: the layout that supplies it is not
  // re-rendered by one, which is the whole point of holding the reader here. So
  // this only fires on a hard load or an explicit refresh, where the database
  // has by definition heard about everything on screen. Adjusted during render
  // rather than in an effect, which would paint the stale set for a frame first
  // (house pattern, precedent TreasuryHeart.jsx:69-73).
  const [lastKeys, setLastKeys] = useState(savedKeys);
  if (lastKeys !== savedKeys) {
    setLastKeys(savedKeys);
    setKeys(savedKeys ? new Set(savedKeys) : null);
    setEdits(NO_EDITS);
  }

  /**
   * Called by TreasuryHeart on the optimistic flip, then again with the
   * server's answer — which normally agrees and changes nothing, and when it
   * doesn't (a failed save, a concurrent tap in another tab) is the rollback.
   *
   * The set stays null outside child mode: there is nobody to save for, and a
   * heart that could not have saved must not conjure a set that says otherwise.
   */
  const noteSaved = useCallback((record, saved) => {
    const key = keyOf(record);
    setEdits((current) => {
      // Already recorded the same way — which is the common case, this being
      // the server agreeing with the flip that preceded it. Returning the same
      // map spares the whole group a second render per tap.
      if (current.has(key) && (current.get(key) === null) === !saved) return current;
      const next = new Map(current);
      // Delete before set, so insertion order stays recency order and a
      // re-tapped treasure sorts as newly saved rather than keeping the place
      // its first tap gave it.
      next.delete(key);
      next.set(key, saved ? record : null);
      return next;
    });
    setKeys((current) => {
      if (!current) return current;
      if (current.has(key) === saved) return current;
      const next = new Set(current);
      if (saved) next.add(key); else next.delete(key);
      return next;
    });
  }, []);

  /**
   * This session's edits, laid over a server list. The rules — what is dropped,
   * what goes on the front, and why the whole thing quietly becomes a no-op
   * once the writes land — live in lib/saved-treasures, where they are tested.
   *
   * The Treasury calls this once, when it opens, and holds the answer for the
   * visit rather than recomputing it, so unsaving a card while standing in the
   * room doesn't pull it off the wall mid-visit. That snapshot is keyed on the
   * server list, not on this function, so it is unaffected by the new identity
   * every toggle gives it.
   */
  const mergeSavedItems = useCallback((items) => mergeSavedEdits(items, edits), [edits]);

  const value = useMemo(() => ({
    child,
    signedOut,
    // Sections look up `type:id` in this instead of each heart asking after
    // itself. `null` — not an empty set — outside child mode, and a section
    // with no set renders no hearts at all: an absent heart is honest where a
    // heart that can't save is not.
    //
    // The signed-out visitor is the one exception, and for the same reason: for
    // them an absent heart is *not* honest, because there is something to offer
    // (an account). They get an empty set, so every heart renders unfilled, and
    // TreasuryHeart turns the tap into an invitation rather than a save
    // (SignupInvite). A signed-in grown-up outside child mode still gets null —
    // they already have an account, so there is nothing to invite them to.
    savedSet: keys ?? (signedOut ? EMPTY_SET : null),
    noteSaved,
    mergeSavedItems,
  }), [child, signedOut, keys, noteSaved, mergeSavedItems]);

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}
