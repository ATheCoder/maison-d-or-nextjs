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
import { earnFlagSeal, type FlagSource } from '@/app/passport/actions';
import { isValidIso2 } from '@/lib/countries';

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

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const earn = useCallback((countryName: string, countryCode: string, source: FlagSource) => {
    const code = (countryCode || '').trim().toUpperCase();
    if (!isValidIso2(code)) return;            // no server call on junk (R7.22)
    if (attempted.current.has(code)) return;
    attempted.current.add(code);

    earnFlagSeal({ countryCode: code, countryName: countryName || '', source, editionDate })
      .then((res) => {
        if (!alive.current || res.status === 'noop') return;
        seq.current += 1;
        setQueue((q) => [...q, {
          id: seq.current,
          countryCode: res.countryCode,
          countryName: res.countryName,
          type: res.status === 'new_seal' ? 'new' : 'repeat',
        }]);
      })
      .catch(() => {
        // Swallowed on purpose — earns are invisible when they fail (R6.4).
        attempted.current.delete(code);
      });
  }, [editionDate]);

  const dismissCelebration = useCallback(() => setQueue((q) => q.slice(1)), []);

  return { earn, celebration: queue[0] ?? null, dismissCelebration };
}
