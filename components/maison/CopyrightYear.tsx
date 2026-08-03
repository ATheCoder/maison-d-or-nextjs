'use client';
/**
 * The year in the footer's copyright line.
 *
 * A component for four characters, because `new Date().getFullYear()` inline in
 * MaisonFooter was the one thing keeping `/` off the prerender. Under Cache
 * Components the clock is request data: reading it during a render with no
 * other request data raises `next-prerender-current-time`, and the homepage —
 * which otherwise reads nothing at all — was failing the build on a copyright
 * line.
 *
 * So the year has two snapshots. On the server it is the build clock, stamped
 * into the bundle by next.config.ts, which runs at config load and is therefore
 * not request data. On the client it is the real clock. A deployment left
 * running across New Year's Eve serves last year's digits until hydration and
 * then corrects itself; it never renders empty, so the line does not reflow.
 *
 * useSyncExternalStore rather than an effect: this is a value that differs
 * between server and client, which is exactly what its two-snapshot shape is
 * for. The same pattern reads the browser's time zone in WelcomeWizard.
 */
import { useSyncExternalStore } from 'react';

// Nothing to subscribe to — the year does not change under us within a session
// in any way worth re-rendering for.
const subscribeToNothing = () => () => {};
const clientYear = () => String(new Date().getFullYear());
const buildYear = () => process.env.NEXT_PUBLIC_BUILD_YEAR ?? '';

export default function CopyrightYear() {
  return <>{useSyncExternalStore(subscribeToNothing, clientYear, buildYear)}</>;
}
