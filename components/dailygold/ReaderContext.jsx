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
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ReaderContext = createContext(null);

/**
 * Outside the provider — the design-sync previews render these components
 * standalone — the reader is nobody and nothing is saved, which is the same
 * answer the components used to get from their own prop defaults.
 */
const INERT = { child: null, signedOut: false, savedSet: null, noteSaved: () => {} };

/**
 * Stable identity, because it is handed to the whole tree as `savedSet`: a
 * fresh empty Set per render would change every section's props on every
 * render of the chrome.
 */
const EMPTY_SET = new Set();

/**
 * @returns {{
 *   child: { id: string, name: string, avatar: string } | null,
 *   signedOut: boolean,
 *   savedSet: Set<string> | null,
 *   noteSaved: (itemType: string, itemId: string, saved: boolean) => void,
 * }}
 */
export function useReader() {
  return useContext(ReaderContext) ?? INERT;
}

/** The one spelling of a saved item's key, shared by the reads and the writes. */
export const savedKeyFor = (itemType, itemId) => `${itemType}:${itemId}`;

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

  // The server's answer, when it changes, wins. It cannot change on a client
  // navigation — the layout that supplies it is not re-rendered by one, which
  // is the whole point of holding the reader here — so this only fires on a
  // hard load or an explicit refresh, where the database is by definition more
  // current than anything accumulated on screen. Adjusted during render rather
  // than in an effect, which would paint the stale set for a frame first
  // (house pattern, precedent TreasuryHeart.jsx:69-73).
  const [lastKeys, setLastKeys] = useState(savedKeys);
  if (lastKeys !== savedKeys) {
    setLastKeys(savedKeys);
    setKeys(savedKeys ? new Set(savedKeys) : null);
  }

  // Called by TreasuryHeart once the server has agreed. A no-op outside child
  // mode: `keys` is null when there is nobody to save for, and a heart that
  // could not have saved must not conjure a set that says otherwise.
  const noteSaved = useCallback((itemType, itemId, saved) => {
    setKeys((current) => {
      if (!current) return current;
      const key = savedKeyFor(itemType, itemId);
      if (current.has(key) === saved) return current;
      const next = new Set(current);
      if (saved) next.add(key); else next.delete(key);
      return next;
    });
  }, []);

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
  }), [child, signedOut, keys, noteSaved]);

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}
