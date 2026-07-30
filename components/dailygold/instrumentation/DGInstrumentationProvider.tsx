'use client';

/**
 * The one place child-activity events are collected, timed and sent
 * (docs/daily-gold-analytics-plan.md §4). Sections reach it through context,
 * never through an `onTrack` prop — prop threading is how Greatest Moments
 * ended up with no tracking at all.
 *
 * Everything that changes per event lives in refs, never in state: the buffer
 * grows dozens of times a minute and no consumer may re-render because of it.
 * The context value is assembled once, from callbacks that are identity-stable
 * for the life of the mount.
 *
 * The client reports what, never who: nothing here carries a child id into a
 * payload. `childId` is used to decide whether to instrument at all and to
 * route the localStorage carryover — the server stamps identity from the
 * session (see app/analytics/actions.ts).
 *
 * Instrumentation must never be visible to the child, so every send, every
 * collector and every storage touch is wrapped and swallowed.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { recordEvents } from '@/app/analytics/actions';
import {
  chunkIntoBatches,
  parseCarryover,
  type AnalyticsContentType,
  type AnalyticsSection,
  type AnalyticsSource,
  type AssembledBatch,
  type BufferedEvent,
  type Carryover,
  type ClientEventType,
} from '@/lib/analytics-events';

/** Everything an emitter may say about an event; the provider fills the rest. */
export type TrackPayload = {
  section?: AnalyticsSection | null;
  contentType?: AnalyticsContentType | null;
  contentId?: string | null;
  label?: string | null;
  source?: AnalyticsSource | null;
  editionDate?: string | null;
  durationMs?: number | null;
};

export type InstrumentationApi = {
  track: (type: ClientEventType, payload?: TrackPayload) => void;
  /** Live attention state — read it, never write it. */
  attention: { readonly current: boolean };
  subscribeAttention: (cb: (attentive: boolean) => void) => () => void;
  /**
   * Called synchronously at the start of every flush, so a component holding a
   * running dwell clock (TrackedSection, a modal) can push its in-progress
   * segment into the buffer before the batch is assembled.
   */
  registerFlushCollector: (cb: () => void) => () => void;
  setActiveSection: (id: AnalyticsSection | null) => void;
  /** Which section owns the viewport right now — read-only companion to setActiveSection. */
  activeSection: { readonly current: AnalyticsSection | null };
  editionDate: string | null;
  /** False under the no-op API: consumers can skip observers and clocks entirely. */
  enabled: boolean;
};

/** Never waits to be full — whatever accumulated goes (§4). */
const FLUSH_INTERVAL_MS = 20_000;
/** A busy child hits this long before the interval; keeps batches small. */
const FLUSH_AT_BUFFERED = 25;
const HEARTBEAT_INTERVAL_MS = 30_000;
const CARRYOVER_KEY = 'dg.analytics.carryover';
/** Roughly a session's tail. Older batches are worth less than the quota risk. */
const CARRYOVER_MAX_EVENTS = 200;

const NOOP_UNSUBSCRIBE = () => {};

/**
 * The API handed out when there is no provider (DGModal and the nav renderers
 * also mount on /passport and /treasury) or no child to attribute to. Frozen
 * and module-level so consumers can compare against it and so a stray write
 * fails loudly in development.
 */
const NOOP_API: InstrumentationApi = Object.freeze({
  track: () => {},
  attention: Object.freeze({ current: true }),
  subscribeAttention: () => NOOP_UNSUBSCRIBE,
  registerFlushCollector: () => NOOP_UNSUBSCRIBE,
  setActiveSection: () => {},
  activeSection: Object.freeze({ current: null }),
  editionDate: null,
  enabled: false,
});

const InstrumentationContext = createContext<InstrumentationApi | null>(null);

/**
 * Silently no-op outside a provider. This fallback is load-bearing: shared
 * components render on routes that have no instrumentation, and a tracking
 * call must never be the reason a section fails to render.
 */
export function useInstrumentation(): InstrumentationApi {
  return useContext(InstrumentationContext) ?? NOOP_API;
}

/**
 * Keep the newest `maxEvents`, dropping whole batches from the front. A batch
 * is the unit of idempotency — half a batch is not worth storing — and the
 * newest events are the ones the roll-up would otherwise be missing.
 */
function capBatches(batches: readonly AssembledBatch[], maxEvents: number): AssembledBatch[] {
  const kept: AssembledBatch[] = [];
  let total = 0;
  for (let i = batches.length - 1; i >= 0; i -= 1) {
    const size = batches[i].events.length;
    if (kept.length > 0 && total + size > maxEvents) break;
    kept.unshift(batches[i]);
    total += size;
  }
  return kept;
}

export function DGInstrumentationProvider({
  childId,
  editionDate = null,
  staticSection = null,
  children,
}: {
  childId: string | null;
  editionDate?: string | null;
  /** Fallback section for routes that are one section end to end (the story). */
  staticSection?: AnalyticsSection | null;
  children: ReactNode;
}) {
  // No child means nobody to attribute to and a server that would reject the
  // batch anyway: the whole machine stays off, but the context is still
  // provided so consumers below need no null checks.
  const enabled = childId !== null;

  const bufferRef = useRef<BufferedEvent[]>([]);
  const retryRef = useRef<AssembledBatch[]>([]);
  const inFlightRef = useRef(false);
  const collectorsRef = useRef<Set<() => void>>(new Set());
  const attentionSubscribersRef = useRef<Set<(attentive: boolean) => void>>(new Set());
  const activeSectionRef = useRef<AnalyticsSection | null>(null);
  // SSR-safe: no document exists at first render, and assuming attention keeps
  // the first heartbeat honest for the common case (the tab you just opened).
  const attentionRef = useRef(true);

  // Props behind refs so no context method has to close over them; the methods
  // must stay identity-stable even when the edition changes under them. Seeded
  // at first render and re-synced in an effect (refs may not be written during
  // render) — in practice these only ever change by remounting: the shell is
  // keyed on the child id and the edition date comes from the route.
  const childIdRef = useRef(childId);
  const editionDateRef = useRef(editionDate);
  const staticSectionRef = useRef(staticSection);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    childIdRef.current = childId;
    editionDateRef.current = editionDate;
    staticSectionRef.current = staticSection;
    enabledRef.current = enabled;
  }, [childId, editionDate, staticSection, enabled]);

  /** Let every registered clock bank its in-progress segment into the buffer. */
  const harvest = useCallback(() => {
    for (const collect of Array.from(collectorsRef.current)) {
      try {
        collect();
      } catch {
        // One broken collector must not cost the rest of the flush.
      }
    }
  }, []);

  const flush = useCallback(async () => {
    if (!enabledRef.current) return;
    harvest();

    if (bufferRef.current.length > 0) {
      // seq is frozen here and never renumbered; with the UNIQUE (batch_id, seq)
      // index that is the entire idempotency story for replays and retries.
      retryRef.current = retryRef.current.concat(chunkIntoBatches(bufferRef.current));
      bufferRef.current = [];
    }
    if (retryRef.current.length === 0) return;
    // A flush already walking the queue will pick up what we just assembled.
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    try {
      // Sequential: the client dispatches server actions one at a time anyway,
      // and a failure has to stop the loop with the remainder still queued.
      while (retryRef.current.length > 0) {
        const batch = retryRef.current[0];
        let keep = false;
        try {
          const result = await recordEvents({ batchId: batch.batchId, events: batch.events });
          // 'ok', 'no_child' and 'over_budget' are all "stop carrying this".
          // 'invalid' drops too: a batch the server calls malformed will never
          // become valid, and keeping it would jam the queue forever.
          keep = result?.status === 'error';
        } catch {
          // Transport failure — offline, aborted navigation. Try again later.
          keep = true;
        }
        if (keep) break;
        // Filter by identity: a concurrent assembly may have appended behind us.
        retryRef.current = retryRef.current.filter((queued) => queued !== batch);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [harvest]);

  const track = useCallback((type: ClientEventType, payload: TrackPayload = {}) => {
    if (!enabledRef.current) return;
    bufferRef.current.push({
      ...payload,
      type,
      // An explicit null is treated as "not provided": callers say what they
      // know, and the section a child is looking at is the provider's business.
      section: payload.section ?? activeSectionRef.current ?? staticSectionRef.current,
      editionDate: payload.editionDate ?? editionDateRef.current,
      // Stamped now, not at send time: a batch that waits out a night in
      // localStorage still reports when it actually happened.
      occurredAt: Date.now(),
    });
    if (bufferRef.current.length >= FLUSH_AT_BUFFERED) {
      flush().catch(() => {});
    }
  }, [flush]);

  const subscribeAttention = useCallback((cb: (attentive: boolean) => void) => {
    attentionSubscribersRef.current.add(cb);
    return () => {
      attentionSubscribersRef.current.delete(cb);
    };
  }, []);

  const registerFlushCollector = useCallback((cb: () => void) => {
    collectorsRef.current.add(cb);
    return () => {
      collectorsRef.current.delete(cb);
    };
  }, []);

  const setActiveSection = useCallback((id: AnalyticsSection | null) => {
    activeSectionRef.current = id;
  }, []);

  const applyAttention = useCallback((attentive: boolean) => {
    if (attentionRef.current === attentive) return;
    attentionRef.current = attentive;
    // Subscribers before the event: every dwell clock has to stop at the same
    // instant the pause is stamped, or the away time gets counted anyway.
    for (const cb of Array.from(attentionSubscribersRef.current)) {
      try {
        cb(attentive);
      } catch {
        // A subscriber's bookkeeping is not the provider's problem.
      }
    }
    track(attentive ? 'session_resume' : 'session_pause', { section: activeSectionRef.current });
  }, [track]);

  const clearCarryover = useCallback(() => {
    try {
      window.localStorage.removeItem(CARRYOVER_KEY);
    } catch {
      // Private mode / disabled storage.
    }
  }, []);

  /**
   * Persist the unsent tail before the tab goes away. The stored `childId` is a
   * ROUTING HINT ONLY and is NEVER sent to the server — it exists so a sibling
   * who switches profiles cannot inherit the previous reader's tail.
   */
  const writeCarryover = useCallback(() => {
    const owner = childIdRef.current;
    if (!owner) return;
    if (bufferRef.current.length > 0) {
      retryRef.current = retryRef.current.concat(chunkIntoBatches(bufferRef.current));
      bufferRef.current = [];
    }
    const batches = capBatches(retryRef.current, CARRYOVER_MAX_EVENTS);
    if (batches.length === 0) {
      clearCarryover();
      return;
    }
    const envelope: Carryover = { childId: owner, savedAt: Date.now(), batches };
    try {
      window.localStorage.setItem(CARRYOVER_KEY, JSON.stringify(envelope));
    } catch {
      // Private mode or quota — the tail is simply uninsured for this hide.
    }
  }, [clearCarryover]);

  /**
   * Leaving is a flush trigger. Insure the tail first, then send: on mobile the
   * send often does not survive the hide, and the carryover is what replaces it
   * on the next load. Cleared only once the queue is actually empty.
   */
  const handleLeaving = useCallback(() => {
    if (!enabledRef.current) return;
    harvest();
    writeCarryover();
    flush()
      .then(() => {
        if (retryRef.current.length === 0) clearCarryover();
      })
      .catch(() => {});
  }, [harvest, writeCarryover, flush, clearCarryover]);

  // Replay whatever the previous session could not deliver. Batch ids and seq
  // numbers are the originals, so anything that did land is absorbed by the
  // unique index rather than duplicated.
  useEffect(() => {
    if (!childId) return;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(CARRYOVER_KEY);
    } catch {
      return;
    }
    const batches = parseCarryover(raw, childId);
    // A mismatched or malformed blob is dead weight either way.
    clearCarryover();
    if (!batches || batches.length === 0) return;
    retryRef.current = batches.concat(retryRef.current);
    flush().catch(() => {});
  }, [childId, flush, clearCarryover]);

  // Attention = visible AND focused. Blur counts as away, so the numbers err
  // toward undercounting — which is what makes them defensible to a parent.
  useEffect(() => {
    if (!enabled) return;
    const measure = () => document.visibilityState === 'visible' && document.hasFocus();
    const onVisibility = () => {
      applyAttention(measure());
      if (document.visibilityState === 'hidden') handleLeaving();
    };
    const onBlur = () => {
      applyAttention(measure());
      handleLeaving();
    };
    const onFocus = () => applyAttention(measure());

    applyAttention(measure());
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, applyAttention, handleLeaving]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      flush().catch(() => {});
    }, FLUSH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, flush]);

  // Liveness: bounds worst-case tail loss and distinguishes a child reading
  // from a tablet left open on the page. Silent while away, by construction.
  useEffect(() => {
    if (!enabled) return;
    let accrued = 0;
    let since: number | null = attentionRef.current ? Date.now() : null;
    const unsubscribe = subscribeAttention((attentive) => {
      if (attentive) {
        since = Date.now();
        return;
      }
      if (since !== null) {
        accrued += Date.now() - since;
        since = null;
      }
    });
    const timer = window.setInterval(() => {
      if (!attentionRef.current) return;
      const now = Date.now();
      if (since !== null) {
        accrued += now - since;
        since = now;
      }
      const durationMs = Math.max(0, accrued);
      accrued = 0;
      track('session_heartbeat', { section: activeSectionRef.current, durationMs });
    }, HEARTBEAT_INTERVAL_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [enabled, subscribeAttention, track]);

  // Unmount is the reader switch (the shell is keyed on the child id) and the
  // route change. Best effort, kicked off synchronously: React runs a deleted
  // subtree's cleanups top-down, so the collectors below are still registered
  // here. No carryover write — the page is alive, this send is the insurance.
  useEffect(() => {
    if (!enabled) return;
    return () => {
      harvest();
      flush().catch(() => {});
    };
  }, [enabled, harvest, flush]);

  const api = useMemo<InstrumentationApi>(() => (enabled ? {
    track,
    attention: attentionRef,
    subscribeAttention,
    registerFlushCollector,
    setActiveSection,
    activeSection: activeSectionRef,
    editionDate,
    enabled: true,
  } : NOOP_API), [
    enabled,
    editionDate,
    track,
    subscribeAttention,
    registerFlushCollector,
    setActiveSection,
  ]);

  return (
    <InstrumentationContext value={api}>
      {children}
    </InstrumentationContext>
  );
}
