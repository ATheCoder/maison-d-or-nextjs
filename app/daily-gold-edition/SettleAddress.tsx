'use client';

import { useEffect } from 'react';

/**
 * Settles the address bar on the day actually rendered.
 *
 * When the bare route falls back to the last good day, the server renders that
 * day's paper directly in the same request — no redirect, no second render —
 * and this effect brings the URL (and tab title) in line with what is on
 * screen. `history.replaceState` integrates with the Next router (see
 * next/dist/docs .../04-linking-and-navigating.md, "Using the native History
 * API"), so `useSearchParams` readers see `?date=` as if the reader had
 * arrived there, and copying the address still shares the day being read.
 * `replace`, not `push`: the blank bare route is not a place Back should
 * return to, matching what the old redirect did.
 */
export default function SettleAddress({ url, title }: { url: string; title: string }) {
  useEffect(() => {
    window.history.replaceState(null, '', url);
    document.title = title;
  }, [url, title]);
  return null;
}
