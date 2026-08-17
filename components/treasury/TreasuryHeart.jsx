// @ts-nocheck — untyped .jsx from before checkJs was on; 5 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * TreasuryHeart — the save behavior behind every heart in the reader. The
 * heart itself is the design system's HeartToggle (§4, components/ds): outline
 * in secondary ink, sealing-wax fill, the burst. This wrapper owns everything
 * the design system deliberately doesn't: what a tap *means*.
 *
 * Every save goes through the `toggleSavedItem` server action, which resolves
 * the child from the session: nothing here names a child, which is what closes
 * the legacy IDOR by construction (docs/auth-plan.md §3).
 *
 * The heart never fetches its own state. `initialSaved` comes from the one set
 * of saved keys the group's layout resolved once (ReaderContext), so a paper
 * full of hearts costs zero requests on load.
 *
 * Every landed toggle is reported back into that set. This is what lets the set
 * be read once per session rather than once per page: an item unsaved from its
 * Treasury corner empties its heart on the paper, and a treasure saved from the
 * paper is already filled when the Treasury opens — with no server round trip
 * in either direction, and no page segment needing to be re-fetched to find
 * out. A cached paper stays correct because the client, not the server, is now
 * the one keeping count.
 *
 * The fill flips on the tap, not on the answer: a child pressing a heart is
 * telling the paper something it already knows how to draw, and making them
 * watch a greyed-out heart for a round trip reads as a broken button. The
 * server still gets the last word — a save is a deliberate act, so a failure
 * is shown rather than swallowed (docs/flag-seal-spec.md §6.2), and the heart
 * falls back to where it was before the tap, which is the honest answer. This
 * is why HeartToggle runs controlled here (`pressed`, not `defaultPressed`):
 * the fill must answer to the save's fate, and — for a signed-out visitor —
 * must not fill at all for a save that was never going to happen.
 *
 * A bare heart is legible on the paper, which is where most of these hearts
 * live. `onImage` is for the ones that don't: over a photograph — a book cover
 * on the Born on This Day shelf — a bare outline lands on whatever happens to
 * be behind it (bright sky, pale skin) and all but disappears. It maps to the
 * chip variant, whose raised disc gives the heart its own ground.
 */
import { useState } from 'react';
import HeartToggle from '@/components/ds/HeartToggle';
import { useSignupInvite } from '@/components/dailygold/SignupInvite';
import { useReader } from '@/components/dailygold/ReaderContext';
import { toggleSavedItem } from '@/app/(dg)/treasury/actions';

/**
 * Load-bearing, like ThemeProvider's used to be. Without it TS infers every
 * parameter without a default as *required*, so the four callers that pass no
 * country (a moment, a news story, an event, a person) stop type-checking the
 * moment they become .tsx — and `itemType` widens to `any`, which is the one
 * prop worth constraining: an unlisted type is rejected by the server action
 * after the heart has already filled optimistically.
 *
 * @param {{
 *   itemType: import('@/lib/saved-item-input').SavedItemType,
 *   itemId: string,
 *   itemTitle: string | null,
 *   itemSubtitle?: string | null,
 *   itemImageUrl?: string | null,
 *   countryCode?: string | null,
 *   countryName?: string | null,
 *   editionDate?: string | null,
 *   initialSaved?: boolean,
 *   onImage?: boolean,
 *   onToggled?: (status: 'saved' | 'unsaved') => void,
 * }} props
 */
export default function TreasuryHeart({
  itemType,
  itemId,
  itemTitle,
  itemSubtitle,
  itemImageUrl,
  countryCode,
  countryName,
  editionDate,
  initialSaved = false,
  onImage = false,
  onToggled,
}) {
  // Inert everywhere but the public edition read without a session.
  const { signedOut, invite } = useSignupInvite();
  // The group-wide saved set this heart reports its answer into. Inert outside
  // the (dg) chrome — the design-sync previews — where there is no set to keep.
  const { noteSaved } = useReader();
  const [saved, setSaved] = useState(initialSaved);
  // In flight, not "busy" — nothing on screen dims for it. It only keeps a
  // second tap from racing the first: `toggleSavedItem` flips whatever it
  // finds, so two overlapping calls could land in either order and leave the
  // row disagreeing with the heart. A dropped tap can't: the fill on screen is
  // always the last tap that was actually sent.
  const [pending, setPending] = useState(false);

  // Turning to another day, or a router.refresh() after a save elsewhere,
  // re-renders this heart over a different item — or the same item with a new
  // server answer. Adjusted during render rather than in an effect, which would
  // paint the previous item's fill for a frame first (house pattern, precedent
  // DGOnThisDay.jsx:112-116).
  //
  // The item and the server's answer are tracked apart because they no longer
  // deserve the same treatment: a new item always wins, but a new answer about
  // the *same* item arriving mid-tap was rendered before the tap, so it is not
  // allowed to pull the fill back out from under it.
  const itemKey = `${itemType}\u0000${itemId}`;
  const [last, setLast] = useState({ itemKey, initialSaved });
  if (last.itemKey !== itemKey || last.initialSaved !== initialSaved) {
    const changedItem = last.itemKey !== itemKey;
    setLast({ itemKey, initialSaved });
    if (changedItem || !pending) setSaved(initialSaved);
  }

  const handleToggle = async (e) => {
    // The heart sits on cards that open a modal on tap — keep the tap local.
    e.stopPropagation();
    if (pending) return;
    // A visitor with no session has no child to save against; the action would
    // answer `no_child` and the heart would sit there unmoved. Answer the tap
    // with the thing that would make it work instead — and without a round trip
    // to learn what the page already knows. Checked before the optimistic flip:
    // a visitor's heart must not fill for a save that was never going to happen.
    if (signedOut) { invite('save'); return; }
    // Flip first, ask after. `previous` is what the heart goes back to if the
    // save doesn't land — the state before this tap, not `initialSaved`, which
    // may be a stale server answer from before an earlier tap.
    const previous = saved;
    const next = !previous;
    setSaved(next);
    // The shared set is told now, not when the server replies. Everything the
    // child can reach before that reply — the other hearts on this page, the
    // Treasury they may walk into next — reads its answer from there, so a
    // store that waited for the round trip would leave every one of them
    // showing the state before the tap. On a slow connection that is long
    // enough to cross a room in. The snapshot rides along because for a taste,
    // a sound, a wonder or a phrase this is the only copy of the card's title
    // that exists until the write lands (see ReaderContext).
    const record = {
      item_type: itemType,
      item_id: itemId,
      item_title: itemTitle,
      item_subtitle: itemSubtitle ?? null,
      item_image_url: itemImageUrl ?? null,
      country_code: countryCode ?? null,
      country_name: countryName ?? null,
      edition_date: editionDate ?? null,
    };
    noteSaved(record, next);
    setPending(true);
    try {
      const res = await toggleSavedItem({
        itemType,
        itemId,
        itemTitle,
        itemSubtitle,
        itemImageUrl,
        countryCode,
        countryName,
        editionDate,
      });
      if (res.status === 'error') {
        // Put the heart back where the tap found it: a heart that snaps to
        // unfilled is the surfaced failure, no toast required. The shared set
        // goes back with it, or the Treasury would keep showing a treasure
        // that was never saved.
        setSaved(previous);
        noteSaved(record, previous);
        console.warn(`TreasuryHeart: save failed (${res.reason})`, { itemType, itemId });
        return;
      }
      // Normally this agrees with the optimistic flip and changes nothing. It
      // is here for when it doesn't — a concurrent tap from another tab, say —
      // in which case the server's answer is the true one.
      setSaved(res.status === 'saved');
      // The server gets the last word in both places. Normally it agrees with
      // the flip above and this changes nothing; when it doesn't — a
      // concurrent tap from another tab flipped the row the other way — its
      // answer is the true one, and the set has to hear that too.
      noteSaved(record, res.status === 'saved');
      onToggled?.(res.status);
    } catch (err) {
      // The action itself never throws; this is the transport failing.
      setSaved(previous);
      noteSaved(record, previous);
      console.warn('TreasuryHeart: save failed', err);
    }
    finally {
      setPending(false);
    }
  };

  return (
    <HeartToggle
      variant={onImage ? 'chip' : 'bare'}
      pressed={saved}
      onClick={handleToggle}
      // Constant label (HeartToggle's a11y contract): state rides aria-pressed,
      // so screen readers hear "Save <title>, pressed" — not a button renaming
      // itself to "Saved".
      aria-label={itemTitle ? `Save ${itemTitle}` : 'Save'}
      title="Save to your treasury"
    />
  );
}
