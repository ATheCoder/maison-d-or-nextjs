'use client';

/**
 * The single client-side entry point for earning flag seals
 * (docs/flag-seal-spec.md §7.5). Calls the earnFlagSeal server action — which
 * resolves the child from the session, so no child id exists on the client —
 * and queues celebrations FIFO so rapid earns play one at a time instead of
 * overwriting each other.
 *
 * Consumers MUST key the celebration on `celebration.id`:
 *   <FlagSealCelebration key={celebration.id} ... onDone={dismissCelebration} />
 * FlagSealCelebration runs its timeline in a mount effect, so an un-keyed
 * second celebration of the same type would never restart and the queue
 * would stall.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { earnFlagSeal } from '@/app/(dg)/passport/actions';
import { useSignupInvite } from '@/components/dailygold/SignupInvite';
import { isValidIso2 } from '@/lib/countries';
import type { FlagSource } from '@/lib/flag-seal-input';

/**
 * The `onFlagEarned` prop every earning section takes — this hook's `earn`,
 * seen from the other side. Declared here so the three sections and the page
 * that wires them together all agree with the implementation by construction.
 */
export type OnFlagEarned = (
  countryName: string | null,
  countryCode: string,
  source: FlagSource,
) => void;

export type CelebrationItem = {
  id: number;
  countryCode: string;
  countryName: string;
  type: 'new' | 'repeat';
};

export function useFlagEarn({ editionDate }: { editionDate?: string } = {}) {
  // Page-session dedupe, keyed on the country code alone (R6.3/R7.20): two
  // surfaces both mentioning France produce one earn. Keys are added before
  // the request and released only on a thrown error, so a transient failure
  // can retry on a later encounter while a `noop` (no child mode) stays quiet.
  const attempted = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<CelebrationItem[]>([]);
  const seq = useRef(0);
  const alive = useRef(true);
  // Inert unless the edition is being read without a session.
  const { signedOut, invite } = useSignupInvite();

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // `countryName` is nullable because every caller's is: the sections earn from
  // `good_news_item.location` / `on_this_day_event.location` / an edition's
  // `destination_country`, all nullable columns. The `|| ''` below was already
  // handling it; the signature now says so, rather than making four newly-typed
  // callers coerce a null the hook is happy to take.
  const earn = useCallback((countryName: string | null, countryCode: string, source: FlagSource) => {
    const code = (countryCode || '').trim().toUpperCase();
    if (!isValidIso2(code)) return;            // no server call on junk (R7.22)
    if (attempted.current.has(code)) return;
    attempted.current.add(code);

    /**
     * A visitor with no session has no passport to earn into, so the action
     * would only answer `noop` — don't ask. Whether that silence is worth
     * breaking depends on how the earn was triggered: good news earns from a
     * mount effect, and a toast that appears on its own the moment
     * the page loads is an interruption, not an invitation. The destination
     * earns from a press (opening the country's story), which is a visitor
     * reaching for the thing an account would keep — that one gets answered.
     */
    if (signedOut) {
      if (source === 'destination') invite('flag');
      return;
    }

    earnFlagSeal({ countryCode: code, countryName: countryName || '', source, editionDate })
      .then((res) => {
        // Only a genuinely new country celebrates. Repeat earns still count
        // server-side, but replaying an animation for a country the child
        // already holds — on every page load, via the auto-earning surfaces —
        // is noise, not a reward.
        if (!alive.current || res.status !== 'new_seal') return;
        seq.current += 1;
        setQueue((q) => [...q, {
          id: seq.current,
          countryCode: res.countryCode,
          countryName: res.countryName,
          type: 'new',
        }]);
      })
      .catch(() => {
        // Swallowed on purpose — earns are invisible when they fail (R6.4).
        attempted.current.delete(code);
      });
  }, [editionDate, signedOut, invite]);

  const dismissCelebration = useCallback(() => setQueue((q) => q.slice(1)), []);

  return { earn, celebration: queue[0] ?? null, dismissCelebration };
}
