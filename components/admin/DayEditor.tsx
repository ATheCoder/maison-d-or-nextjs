'use client';
/**
 * The day editor (Phase 5) — one date, two panes, and no reader preview (D9).
 *
 * Every rule the reader applies to these fields is surfaced *at the field that
 * causes it* rather than through a rendered preview: the two-sentence cut is
 * drawn live, the four cards are drawn at size so an empty one shows its real
 * em-dash, the news list renders row 0 at lead proportions, and the masthead
 * says which image a family will actually get. Those affordances are the
 * feature — see §5.3 — not decoration around the inputs.
 *
 * Phase 8 adds the AI without changing that shape: a ✦ beside a field drafts an
 * alternative *beside* the current text, the ask writes into a draft nobody can
 * see, and retrieved good news arrives as proposals in their own column with a
 * link to the source — never as text that has quietly appeared in the form.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove,
} from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS as dndCSS } from '@dnd-kit/utilities';
import { flagEmoji, resolveLocation } from '@/lib/countries';
import { CONTINENTS } from '@/lib/daily-gold/edition';
import { destinationSlot, heroSlot, newsSlot } from '@/lib/daily-gold/slots';
import SlotOpener from './SlotOpener';
import AskPanel, { type AskJob } from './AskPanel';
import CandidateCard from './CandidateCard';
import { RewriteButton, RewriteReview, jobForField, useJobPolling, type RewriteJob } from './DgRewrite';
import {
  createNewsItem, deleteNewsItem, getPreflight, prepareThisDate, reorderNews,
  saveEdition, saveNewsItem, setEditionStatus, setNewsPublished,
  type DayForEditor, type EditorNewsItem, type Preflight,
} from '@/app/admin/daily-gold/dayActions';
import { getDgJobs, paintMissing, rejectAllCandidates } from '@/app/admin/daily-gold/aiActions';

const CSS = `
.dge {
  --ground:var(--surface-page); --panel-t:color-mix(in srgb, var(--surface-raised) 82%, transparent);
  --line:var(--border-fine); --line2:var(--border-accent);
  --ink:var(--text-primary); --brown:var(--text-secondary); --brown2:var(--text-faint); --brown3:var(--text-faint);
  --gold:var(--accent); --gold-deep:var(--accent-readable); --gold-soft:color-mix(in srgb, var(--accent) 14%, transparent);
  --green:#7d8a4e; --amber:#c08a2e; --red:var(--danger-readable);
  --serif:var(--face-display); --sans:var(--face-sans);
  min-height:100vh; font-family:var(--sans); color:var(--ink); background:var(--ground);
  display:flex; flex-direction:column; -webkit-font-smoothing:antialiased;
}
.dge * { box-sizing:border-box; }
.dge .serif { font-family:var(--serif); }
.dge .kick { font:700 10px/1.4 var(--sans); letter-spacing:.26em; text-transform:uppercase; color:var(--gold-deep); }
.dge .muted { color:var(--brown2); }
.dge .note { font-size:11.5px; color:var(--brown2); line-height:1.6; }
.dge .panel { background:var(--panel-t); border:1px solid var(--line); border-radius:14px; }
.dge a { color:var(--gold-deep); text-decoration:none; }
.dge a:hover { color:var(--ink); text-decoration:underline; }
.dge .hair { height:1px; background:var(--line); border:none; margin:4px 0; }

.dge .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; font:700 12px/1 var(--sans); padding:9px 14px; border-radius:9px; border:1px solid var(--line2); background:#fffdf8; color:var(--brown); cursor:pointer; }
.dge .btn:hover { transform:translateY(-1px); }
.dge .btn:disabled { opacity:.5; cursor:default; transform:none; }
.dge .btn-gold { background:linear-gradient(180deg,#dcc191,#c9a96e); color:#3a2a10; border-color:var(--gold-deep); }
.dge .btn-ghost { background:transparent; border-color:transparent; color:var(--brown2); }
.dge .btn-red { background:transparent; border-color:rgba(181,83,58,.5); color:var(--red); }
.dge .btn-sm { padding:6px 10px; font-size:11px; border-radius:8px; }

.dge .chip { display:inline-flex; align-items:center; gap:6px; font:700 10px/1 var(--sans); letter-spacing:.06em; text-transform:uppercase; padding:5px 9px; border-radius:999px; border:1px solid var(--line2); color:var(--brown); background:#fffdf8; white-space:nowrap; }
.dge .chip-gold { background:var(--gold-soft); color:var(--gold-deep); }
.dge .chip-green { background:rgba(125,138,78,.14); border-color:rgba(125,138,78,.4); color:#5f6c37; }
.dge .chip-amber { background:rgba(192,138,46,.14); border-color:rgba(192,138,46,.42); color:#96681f; }
.dge .chip-red { background:rgba(181,83,58,.12); border-color:rgba(181,83,58,.42); color:#96402b; }
.dge .chip-ink { background:rgba(36,26,12,.06); border-color:var(--line); color:var(--brown); text-transform:none; letter-spacing:0; font-weight:400; }

.dge .dot { width:9px; height:9px; border-radius:50%; flex:0 0 auto; display:inline-block; }
.dge .d-done { background:var(--green); }
.dge .d-warn { background:var(--amber); }
.dge .d-red { background:var(--red); }
.dge .d-empty { background:rgba(92,74,42,.18); }

.dge .banner { display:flex; align-items:center; gap:11px; padding:11px 15px; border-radius:11px; font-size:12.5px; line-height:1.6; }
.dge .b-amber { background:rgba(192,138,46,.09); border:1px solid rgba(192,138,46,.38); color:#7a5518; }
.dge .b-gold { background:var(--gold-soft); border:1px solid var(--line2); color:var(--brown); }
.dge .b-red { background:rgba(181,83,58,.08); border:1px solid rgba(181,83,58,.35); color:#7d3a26; }

.dge .topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px 20px; background:var(--panel-t); border-bottom:1px solid var(--line); flex-wrap:wrap; }
.dge .vhair { width:1px; background:var(--line); align-self:stretch; }
.dge .save-dot { width:8px; height:8px; border-radius:50%; background:var(--green); }
.dge .save-dot.dirty { background:var(--amber); }
.dge .seg { display:inline-flex; padding:3px; background:rgba(36,26,12,.06); border:1px solid var(--line); border-radius:10px; gap:2px; }
.dge .seg > button { font:700 11px/1 var(--sans); padding:7px 12px; border-radius:7px; color:var(--brown2); cursor:pointer; border:none; background:transparent; }
.dge .seg > button.on { background:#fffdf8; color:var(--ink); box-shadow:0 1px 6px rgba(40,26,12,.1); }
.dge .seg > button.on.draft { color:#96681f; }

.dge .body { display:flex; flex:1; min-height:0; align-items:flex-start; }
.dge .rail { width:262px; flex:0 0 262px; padding:16px 12px; border-right:1px solid var(--line); display:flex; flex-direction:column; gap:2px; position:sticky; top:0; }
.dge .navrow { display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:9px; font-size:12.5px; color:var(--brown); cursor:pointer; border:none; background:transparent; width:100%; text-align:left; }
.dge .navrow:hover { background:var(--gold-soft); }
.dge .navrow.on { background:#fffdf8; box-shadow:0 1px 6px rgba(40,26,12,.08); color:var(--ink); font-weight:700; }
.dge .navrow .tail { margin-left:auto; font-size:11px; }
.dge .slotrow { display:flex; align-items:center; gap:7px; font-size:11.5px; color:var(--brown2); }
.dge .slotrow .nm { flex:1; }
.dge .slotrow b { color:var(--brown); }

.dge .pane { flex:1; min-width:0; padding:22px 26px 60px; display:flex; flex-direction:column; gap:18px; }
.dge .fgroup { display:flex; flex-direction:column; gap:9px; scroll-margin-top:16px; }
.dge .flbl { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.dge .field { width:100%; background:#fffdf8; border:1px solid var(--line2); border-radius:10px; color:var(--ink); font:400 13px/1.6 var(--sans); padding:10px 13px; outline:none; resize:vertical; }
.dge .field:focus { border-color:var(--gold-deep); }
.dge .field::placeholder { color:var(--brown3); }
.dge select.field { cursor:pointer; }

.dge .cut { background:rgba(201,169,110,.10); border-left:3px solid var(--gold); border-radius:0 9px 9px 0; padding:9px 13px; font:400 12.5px/1.7 var(--sans); color:var(--brown); font-style:italic; }

.dge .art { border-radius:8px; background:radial-gradient(ellipse at 34% 28%, #e8d29a, transparent 60%), linear-gradient(150deg,#d9c286,#b89a5e 60%,#8f7c4a); background-size:cover; background-position:center; }
.dge .art-empty { background:repeating-linear-gradient(135deg, rgba(120,90,50,.07) 0 7px, transparent 7px 14px), #f3ead2; border:1px dashed rgba(120,90,50,.35); }
.dge .treat { position:relative; border-radius:8px; overflow:hidden; }
.dge .treat-card::after { content:""; position:absolute; inset:0; background:linear-gradient(to bottom, transparent 40%, rgba(247,242,232,.97) 100%); }
.dge .treat-hero::after { content:""; position:absolute; inset:0; background:linear-gradient(160deg, rgba(243,233,216,.6), rgba(240,228,208,.5) 40%, rgba(243,233,216,.6)); }
.dge .treat-hero > .art { opacity:.75; -webkit-mask-image:radial-gradient(ellipse 100% 90% at 50% 50%, black 40%, transparent 100%); mask-image:radial-gradient(ellipse 100% 90% at 50% 50%, black 40%, transparent 100%); }

.dge .sens { display:grid; grid-template-columns:1fr 1fr; gap:8px; width:330px; }
.dge .scard { background:#fffdf8; border:1px solid var(--line); border-radius:11px; padding:10px 11px; display:flex; flex-direction:column; gap:3px; min-height:74px; }
.dge .scard.empty { border-color:rgba(192,138,46,.45); background:rgba(192,138,46,.05); }
.dge .scard .sl { font:700 8.5px/1.3 var(--sans); letter-spacing:.14em; text-transform:uppercase; color:var(--brown3); }
.dge .scard .sv { font-family:var(--serif); font-size:14px; font-weight:600; color:var(--ink); line-height:1.25; }
.dge .scard .st { font-size:11px; font-style:italic; color:var(--brown2); }

.dge .nrow { display:flex; align-items:center; gap:11px; padding:10px 12px; }
.dge .lead { display:flex; align-items:stretch; gap:13px; padding:13px; border-color:var(--line2); background:var(--gold-soft); }
.dge .lead > .btn, .dge .lead > .grip { align-self:center; }
.dge .grip { cursor:grab; color:var(--brown3); font-size:13px; letter-spacing:-2px; user-select:none; }
.dge .leadart { width:150px; flex:0 0 150px; min-height:96px; border-radius:8px; }
.dge .nrowart { width:56px; flex:0 0 56px; height:42px; border-radius:6px; }

.dge .overlay { position:fixed; inset:0; background:rgba(36,26,12,.45); display:flex; align-items:center; justify-content:center; padding:24px; z-index:60; }
.dge .modal { background:var(--ground); border:1px solid var(--line2); border-radius:16px; padding:24px; width:min(620px,100%); max-height:90vh; overflow-y:auto; display:flex; flex-direction:column; gap:15px; }
.dge .callout { background:var(--gold-soft); border:1px solid var(--line); border-radius:10px; padding:10px 13px; }
`;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmtDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAY[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function fmtMonthDay(monthDay: string): string {
  const [m, d] = monthDay.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
function fmtTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * The first two sentences — what `DGDestination` actually puts on the card.
 * Deliberately the same naive split the reader uses: showing the admin a
 * cleverer cut than the reader performs would defeat the point.
 */
function twoSentences(text: string): string {
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g);
  if (!parts) return text;
  return parts.slice(0, 2).join('').trim();
}

const paragraphCount = (text: string) =>
  text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length;

type Section = 'hero' | 'destination' | 'cards' | 'child' | 'quote' | 'news';

/** The edition row as editable strings — the single source for both the
 *  initial draft and every re-sync, so the two can never drift apart. */
function draftFrom(e: DayForEditor['edition']): Record<string, string> {
  return {
    hero_image_url: e?.hero_image_url ?? '',
    destination_country: e?.destination_country ?? '',
    continent: e?.continent ?? '',
    destination_description: e?.destination_description ?? '',
    destination_image_url: e?.destination_image_url ?? '',
    child_life_story: e?.child_life_story ?? '',
    taste_of_day: e?.taste_of_day ?? '',
    sound_of_day: e?.sound_of_day ?? '',
    nature_detail: e?.nature_detail ?? '',
    tiny_phrase: e?.tiny_phrase ?? '',
    tiny_phrase_language: e?.tiny_phrase_language ?? '',
    tiny_phrase_translation: e?.tiny_phrase_translation ?? '',
    daily_quote: e?.daily_quote ?? '',
    daily_quote_author: e?.daily_quote_author ?? '',
  };
}

export default function DayEditor({ day }: { day: DayForEditor }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [active, setActive] = useState<Section>('destination');
  const [showPreflight, setShowPreflight] = useState(false);
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<'day' | 'news' | null>(null);

  /**
   * Close the Ask panel and the preflight sheet whenever this leaves the screen.
   *
   * Under Cache Components <Activity> hides a route instead of unmounting it,
   * so an overlay left open comes back open on return. Neither is a place the admin was working; both are
   * momentary. `ask` is also re-derived from a running job just below, so a
   * generation still in flight reopens its own panel on return.
   * The editor's drafts are deliberately left alone — surviving a navigation is
   * what Activity is *for*; it is the transient furniture on top that has to go.
   */
  useLayoutEffect(() => () => { setAsk(null); setShowPreflight(false); }, []);

  const e = day.edition;
  const subject = useMemo(() => ({ kind: 'edition' as const, key: day.date }), [day.date]);

  // ── Draft + autosave ──────────────────────────────────────────────────────
  // The draft is what the inputs read, so typing stays responsive; a debounced
  // patch of only the changed keys goes to the server (R3.8).
  const [draft, setDraft] = useState<Record<string, string>>(() => draftFrom(e));
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(e?.updated_at ?? null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queued = useRef<Record<string, string>>({});

  // Re-sync when the server sends a different edition (a reload, or the next
  // date). Adjusted during render rather than in an effect, which would paint
  // the previous day's text for a frame first. `draft` is *initialised* from
  // the same function — a guard alone never fires on mount.
  const editionKey = `${e?.id ?? ''}:${e?.updated_at ?? ''}`;
  const [lastKey, setLastKey] = useState(editionKey);
  if (editionKey !== lastKey) {
    setLastKey(editionKey);
    setDraft(draftFrom(e));
    setSavedAt(e?.updated_at ?? null);
    setDirty(false);
  }

  const flush = useCallback(async () => {
    const patch = queued.current;
    queued.current = {};
    if (!Object.keys(patch).length) return;
    const res = await saveEdition(day.date, patch);
    if (res.ok) { setSavedAt(res.updatedAt); setDirty(false); setError(null); }
    else setError(res.error);
  }, [day.date]);

  const set = useCallback((key: string) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    queued.current[key] = value;
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 800);
  }, [flush]);

  // Long prose must survive navigation and a closed tab (R3.8).
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const onHide = () => { if (Object.keys(queued.current).length) void flush(); };
    window.addEventListener('beforeunload', onHide);
    return () => window.removeEventListener('beforeunload', onHide);
  }, [flush]);

  const refresh = () => router.refresh();

  // ── Jobs ──────────────────────────────────────────────────────────────────
  // Polled only while something is in flight, and the ask panel stays visible
  // once a job finishes so its result can be read before it is dismissed.
  const [jobs, setJobs] = useState<{ ask: AskJob | null; rewrites: RewriteJob[]; images: AskJob | null }>(
    { ask: null, rewrites: [], images: null },
  );
  const loadJobs = useCallback(() => {
    void getDgJobs(subject).then((j) => setJobs({ ask: j.ask, rewrites: j.rewrites, images: j.images }));
  }, [subject]);
  useEffect(() => { loadJobs(); }, [loadJobs]);

  const anyRunning = jobs.ask?.state === 'running'
    || jobs.images?.state === 'running'
    || jobs.rewrites.some((r) => r.state === 'running');
  useJobPolling(anyRunning, () => { loadJobs(); router.refresh(); });

  // A finished ask has written rows the page was rendered without; pull them in
  // once. The panel itself stays until it is dismissed, so its result can be
  // read — leaving and returning finds the same thing waiting.
  const askDone = jobs.ask?.state === 'done' ? jobs.ask.id : null;
  useEffect(() => { if (askDone) router.refresh(); }, [askDone, router]);
  if (jobs.ask && !ask) setAsk(jobs.ask.progress?.ask?.kind === 'news' ? 'news' : 'day');

  // What the row makes true, so a rewrite of "taste of the day" knows where it is.
  const context = [
    `Daily Gold for ${day.date}`,
    draft.destination_country ? `destination ${draft.destination_country}` : '',
  ].filter(Boolean).join('; ');

  const rewriteProps = (fieldPath: string, current: string) => ({
    subject,
    fieldPath,
    current,
    context,
    job: jobForField(jobs.rewrites, fieldPath),
    onStarted: loadJobs,
    onError: setError,
  });

  // ── Derived affordances ───────────────────────────────────────────────────
  const destIso2 = draft.destination_country ? resolveLocation(draft.destination_country) : null;
  const destCity = (draft.destination_country ?? '').split(',')[0].trim();
  const sensoryFilled = [draft.taste_of_day, draft.sound_of_day, draft.nature_detail].filter((v) => v?.trim()).length;
  const paragraphs = paragraphCount(draft.child_life_story ?? '');
  const publishedNews = day.news.filter((n) => n.published).length;

  const openPreflight = () => start(async () => {
    const p = await getPreflight(day.date);
    setPreflight(p);
    setShowPreflight(true);
  });

  const publish = (status: 'draft' | 'ready') => start(async () => {
    if (Object.keys(queued.current).length) await flush();
    const res = await setEditionStatus(day.date, status);
    if (!res.ok) { setError(res.error ?? 'Could not change the status.'); return; }
    setShowPreflight(false);
    refresh();
  });

  // ── Not prepared ──────────────────────────────────────────────────────────
  if (!e) {
    return (
      <div className="dge">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="topbar">
          <Link className="btn btn-ghost btn-sm" href="/admin/daily-gold">‹ Desk</Link>
        </div>
        <div className="pane" style={{ maxWidth: 620 }}>
          <div className="kick">Daily Gold edition</div>
          <div className="serif" style={{ fontSize: 26, fontWeight: 600 }}>{fmtDate(day.date)}</div>
          <p className="note" style={{ fontSize: 13 }}>
            This date has no edition row yet. Preparing creates an empty draft — it writes nothing
            and no family can see it until you publish.
          </p>
          <div>
            <button className="btn btn-gold" disabled={pending}
              onClick={() => start(async () => { await prepareThisDate(day.date); refresh(); })}>
              Prepare {fmtDate(day.date)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const live = e.status === 'ready';

  return (
    <div className="dge">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Topbar ─────────────────────────────────────────────── */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link className="btn btn-ghost btn-sm" href="/admin/daily-gold" style={{ paddingLeft: 0 }}>‹ Desk</Link>
          <div className="vhair" style={{ height: 30 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="serif" style={{ fontSize: 20, fontWeight: 600 }}>{fmtDate(day.date)}</div>
              {live
                ? <span className="chip chip-green">Live · families can open this date</span>
                : <span className="chip chip-amber">Draft · not visible to families</span>}
            </div>
            <div className="kick" style={{ marginTop: 4 }}>Daily Gold edition</div>
          </div>
          <div className="vhair" style={{ height: 30 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <Link className="btn btn-sm btn-ghost" href={`/admin/daily-gold/${day.prevDate}`} title={fmtDate(day.prevDate)}>‹</Link>
            <Link className="btn btn-sm btn-ghost" href={`/admin/daily-gold/${day.nextDate}`} title={fmtDate(day.nextDate)}>›</Link>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
          <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className={`save-dot${dirty ? ' dirty' : ''}`} />
            <span style={{ fontSize: 12 }}>
              {dirty ? 'Saving…' : savedAt ? `Saved · ${fmtTime(savedAt)}` : 'Nothing written yet'}
            </span>
          </div>
          {/* §8.2 — whole-day drafting is triggered from in here, one day at a
              time, and never from the desk: the desk creates and navigates, the
              editor writes. */}
          <button className="btn" onClick={() => setAsk('day')} disabled={pending || Boolean(jobs.ask)}>
            ✦ Draft this day
          </button>
          <div className="seg">
            <button className={!live ? 'on draft' : undefined} onClick={() => publish('draft')} disabled={pending || !live}>Draft</button>
            <button className={live ? 'on' : undefined} onClick={openPreflight} disabled={pending || live}>Live</button>
          </div>
          <button className="btn btn-gold" onClick={openPreflight} disabled={pending}>
            {live ? 'Review what families see' : 'Publish to families'}
          </button>
        </div>
      </div>

      {day.editionCount > 1 && (
        <div className="banner b-red" style={{ borderRadius: 0, padding: '10px 20px' }}>
          <span className="dot d-red" />
          <span>
            <b>This date has {day.editionCount} edition rows.</b> You are editing the one families see;
            the others are invisible. <Link href="/admin/daily-gold">Resolve it on the desk</Link>.
          </span>
        </div>
      )}

      {error && (
        <div className="banner b-red" style={{ borderRadius: 0, padding: '10px 20px' }}>
          <span className="dot d-red" /><span>{error}</span>
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="body">
        {/* ── Rail ─────────────────────────────────────────────── */}
        <div className="rail">
          <div className="kick" style={{ padding: '4px 10px 9px' }}>This date</div>
          <RailRow id="hero" active={active} onGo={setActive}
            state={draft.hero_image_url ? 'done' : 'empty'} label="Masthead painting" />
          <RailRow id="destination" active={active} onGo={setActive}
            state={draft.destination_country ? 'done' : 'empty'} label="Destination" />
          <RailRow id="cards" active={active} onGo={setActive}
            state={sensoryFilled === 3 ? 'done' : sensoryFilled === 0 ? 'empty' : 'warn'}
            label="The four cards" tail={sensoryFilled < 3 ? `${sensoryFilled} / 3` : undefined}
            tailColour={sensoryFilled < 3 ? 'var(--amber)' : undefined} />
          <RailRow id="child" active={active} onGo={setActive}
            state={draft.child_life_story ? 'done' : 'empty'}
            label={destCity ? `A child in ${destCity}` : 'A child in…'} />
          <RailRow id="quote" active={active} onGo={setActive}
            state={draft.daily_quote ? 'done' : 'empty'} label="Daily quote"
            tail={draft.daily_quote ? undefined : 'rotation'} />
          <RailRow id="news" active={active} onGo={setActive}
            state={day.news.length ? 'done' : 'red'} label="Good news"
            tail={day.news.length ? String(day.news.length) : 'none'}
            tailColour={day.news.length ? undefined : '#96402b'} />

          <hr className="hair" style={{ margin: '13px 6px' }} />

          <div className="panel" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="kick" style={{ color: 'var(--brown)' }}>{fmtMonthDay(day.recurring.monthDay)} in every year</div>
            <div className="note">
              Recurring content. Editing it changes every future {fmtMonthDay(day.recurring.monthDay)},
              so it lives in the almanac.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
              <div className="slotrow">
                <span className={`dot ${day.recurring.historyYears ? 'd-done' : 'd-empty'}`} />
                <span className="nm">On this day</span><b>{day.recurring.historyYears} years</b>
              </div>
              <div className="slotrow">
                <span className={`dot ${day.recurring.momentsFilled ? 'd-done' : 'd-empty'}`} />
                <span className="nm">Greatest moments</span><b>{day.recurring.momentsFilled} / 10</b>
              </div>
              <div className="slotrow">
                <span className={`dot ${day.recurring.peopleCount ? 'd-done' : 'd-empty'}`} />
                <span className="nm">Born today</span><b>{day.recurring.peopleCount} books</b>
              </div>
            </div>
            <Link className="btn btn-sm" style={{ justifyContent: 'center', marginTop: 3 }}
              href={`/admin/daily-gold/almanac/${day.recurring.monthDay}`}>
              Open the almanac →
            </Link>
          </div>
        </div>

        {/* ── Pane ─────────────────────────────────────────────── */}
        <div className="pane">
          {ask === 'day' && (
            <AskPanel
              kind="day"
              subjectKey={day.date}
              title={`Draft ${fmtDate(day.date)}`}
              blurb={
                'Chooses a destination and writes the atmosphere, the child’s day and the four cards straight '
                + 'into this draft. The quote and the good news are retrieved instead — the quote is only written '
                + 'if its source can be confirmed, and the stories arrive as proposals for you to check.'
              }
              unitNoun={['story', 'stories']}
              defaultUnits={6}
              job={jobs.ask ?? null}
              onChanged={() => { loadJobs(); refresh(); }}
              onError={setError}
              onClose={() => { setAsk(null); loadJobs(); }}
            />
          )}

          {/* Masthead */}
          <div className="fgroup" id="sec-hero">
            <div className="flbl">
              <span className="kick">Masthead painting</span>
              <span className={`chip ${draft.hero_image_url ? 'chip-green' : 'chip-amber'}`}>
                {draft.hero_image_url ? 'Painted' : 'Empty'}
              </span>
            </div>
            <SlotOpener
              slot={heroSlot()}
              subject={subject}
              imageUrl={e.hero_image_url}
              scene={day.scenes.hero ?? ''}
              context={`Daily Gold · ${fmtDate(day.date)}`}
              previewTitle="Daily Gold"
              emptyText={day.scenes.hero ? 'prompt written · not painted' : 'no painting for this date'}
              onChanged={() => { refresh(); loadJobs(); }}
            />
            {/* R3.16 — name the URL the reader will actually use. */}
            {!draft.hero_image_url && (
              <div className="banner b-amber">
                <span className="dot d-warn" />
                <span>
                  {draft.destination_image_url
                    ? <>Left blank, the masthead quietly borrows the <b>destination painting</b> — that is what families will see behind the title.</>
                    : <>Left blank, the masthead borrows the destination painting — and there isn&rsquo;t one, so the title sits on plain parchment.</>}
                </span>
              </div>
            )}
          </div>

          <hr className="hair" />

          {/* Destination */}
          <div className="fgroup" id="sec-destination">
            <div className="flbl"><span className="kick">Destination</span></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input className="field" style={{ flex: 1, minWidth: 220 }} placeholder="Lisbon, Portugal"
                value={draft.destination_country ?? ''} onChange={(ev) => set('destination_country')(ev.target.value)} />
              <select className="field" style={{ width: 190 }}
                value={draft.continent ?? ''} onChange={(ev) => set('continent')(ev.target.value)}>
                <option value="">— continent —</option>
                {CONTINENTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {(draft.continent || destCity) && (
                <span className="chip chip-ink">
                  Shown as <b style={{ marginLeft: 3 }}>{[draft.continent, destCity].filter(Boolean).join(' · ')}</b>
                </span>
              )}
              {destIso2
                ? <span className="chip chip-green">{flagEmoji(destIso2)} Earns the {destIso2} seal</span>
                : draft.destination_country
                  ? <span className="chip chip-amber">No flag seal — this text resolves to no country</span>
                  : null}
              {destIso2 && <span className="note">Resolved from the destination text.</span>}
            </div>
          </div>

          {/* Destination painting */}
          <div className="fgroup">
            <div className="flbl">
              <span className="kick">Destination painting</span>
              <span className={`chip ${draft.destination_image_url ? 'chip-green' : 'chip-amber'}`}>
                {draft.destination_image_url ? 'Painted' : 'Empty'}
              </span>
            </div>
            <SlotOpener
              slot={destinationSlot()}
              subject={subject}
              imageUrl={e.destination_image_url}
              scene={day.scenes.destination ?? ''}
              context={`Daily Gold · ${fmtDate(day.date)}`}
              emptyText={day.scenes.destination ? 'prompt written · not painted' : 'no destination painting'}
              onChanged={() => { refresh(); loadJobs(); }}
            />
            <PaintMissing subject={subject} onChanged={() => { refresh(); loadJobs(); }} onError={setError}
              job={jobs.images ?? null} />
          </div>

          {/* Atmosphere + the two-sentence cut (R3.12) */}
          <div className="fgroup">
            <div className="flbl">
              <span className="kick">Atmosphere</span>
              <RewriteButton {...rewriteProps('destination_description', draft.destination_description ?? '')} />
            </div>
            <textarea className="field" rows={5} placeholder="What the place feels like…"
              value={draft.destination_description ?? ''}
              onChange={(ev) => set('destination_description')(ev.target.value)} />
            <FieldReview jobs={jobs.rewrites} fieldPath="destination_description"
              onAccept={set('destination_description')} onResolved={loadJobs} />
            {draft.destination_description?.trim() && (
              <>
                <div className="cut">
                  <div className="kick" style={{ color: 'var(--brown3)', marginBottom: 4 }}>
                    On the card, a family reads only this
                  </div>
                  {twoSentences(draft.destination_description)}
                </div>
                <div className="note">
                  Two sentences, then it stops. The rest appears only if a child opens the destination —
                  so the first two have to stand alone.
                </div>
              </>
            )}
          </div>

          {/* A child in… (R3.18) */}
          <div className="fgroup" id="sec-child">
            <div className="flbl">
              <span className="kick">A child in {destCity || '…'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="chip chip-ink">{paragraphs} paragraph{paragraphs === 1 ? '' : 's'}</span>
                <RewriteButton {...rewriteProps('child_life_story', draft.child_life_story ?? '')} />
              </span>
            </div>
            <textarea className="field" rows={6} placeholder="One child's ordinary day…"
              value={draft.child_life_story ?? ''} onChange={(ev) => set('child_life_story')(ev.target.value)} />
            <FieldReview jobs={jobs.rewrites} fieldPath="child_life_story"
              onAccept={set('child_life_story')} onResolved={loadJobs} />
            <div className="note">
              Blank lines make paragraphs. This appears only inside the destination, under the
              title “A Child in {destCity || '…'}”.
            </div>
          </div>

          <hr className="hair" />

          {/* The four cards (R3.13) */}
          <div className="fgroup" id="sec-cards">
            <div className="flbl">
              <span className="kick">The four cards</span>
              {sensoryFilled < 3 && (
                <span className="chip chip-amber">
                  All four always render · {3 - sensoryFilled} empty
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, minWidth: 300, maxWidth: 440 }}>
                <MiniField label="Taste" value={draft.taste_of_day} onChange={set('taste_of_day')} placeholder="Pastéis de Nata"
                  action={<RewriteButton {...rewriteProps('taste_of_day', draft.taste_of_day ?? '')} />} />
                <FieldReview jobs={jobs.rewrites} fieldPath="taste_of_day" onAccept={set('taste_of_day')} onResolved={loadJobs} />
                <MiniField label="Sound" value={draft.sound_of_day} onChange={set('sound_of_day')} placeholder="Portuguese guitar"
                  action={<RewriteButton {...rewriteProps('sound_of_day', draft.sound_of_day ?? '')} />} />
                <FieldReview jobs={jobs.rewrites} fieldPath="sound_of_day" onAccept={set('sound_of_day')} onResolved={loadJobs} />
                <MiniField label="Nature" value={draft.nature_detail} onChange={set('nature_detail')} placeholder="The Tagus estuary"
                  action={<RewriteButton {...rewriteProps('nature_detail', draft.nature_detail ?? '')} />} />
                <FieldReview jobs={jobs.rewrites} fieldPath="nature_detail" onAccept={set('nature_detail')} onResolved={loadJobs} />
                <hr className="hair" />
                <MiniField label="Tiny phrase" value={draft.tiny_phrase} onChange={set('tiny_phrase')} placeholder="Obrigado" />
                <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <span className="note" style={{ width: 74, flex: '0 0 74px' }}>— language</span>
                  <input className="field" style={{ width: 140 }} placeholder="Portuguese"
                    value={draft.tiny_phrase_language ?? ''} onChange={(ev) => set('tiny_phrase_language')(ev.target.value)} />
                  <span className="note" style={{ flex: '0 0 52px', textAlign: 'right' }}>means</span>
                  <input className="field" style={{ flex: 1 }} placeholder="Thank you"
                    value={draft.tiny_phrase_translation ?? ''} onChange={(ev) => set('tiny_phrase_translation')(ev.target.value)} />
                </div>
                <div className="note">The language is the destination&rsquo;s, not English.</div>
              </div>

              {/* Drawn at size: the em-dashes are the warning (§5.3 R3.13). */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div className="sens">
                  <SensoryCard label="Taste of the Day" value={draft.taste_of_day} />
                  <SensoryCard label="Sound of the Day" value={draft.sound_of_day} />
                  <SensoryCard label="Nature Detail" value={draft.nature_detail} />
                  <SensoryCard
                    label={`Tiny Phrase${draft.tiny_phrase_language ? ` · ${draft.tiny_phrase_language}` : ''}`}
                    value={draft.tiny_phrase}
                    sub={draft.tiny_phrase_translation}
                  />
                </div>
                <span className="note" style={{ textAlign: 'center', maxWidth: 330 }}>
                  The block a family sees. An empty field is an em-dash, not a missing card.
                </span>
              </div>
            </div>
          </div>

          <hr className="hair" />

          {/* Quote (R3.17) */}
          <div className="fgroup" id="sec-quote">
            <div className="flbl">
              <span className="kick">Daily quote</span>
              <span className="chip chip-ink">Optional</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input className="field" style={{ flex: 1, minWidth: 240 }}
                placeholder="Leave blank to use the curated rotation…"
                value={draft.daily_quote ?? ''} onChange={(ev) => set('daily_quote')(ev.target.value)} />
              <input className="field" style={{ width: 220 }} placeholder="Attributed to…"
                value={draft.daily_quote_author ?? ''} onChange={(ev) => set('daily_quote_author')(ev.target.value)} />
            </div>
            <div className="note">
              Blank is a choice, not a gap: the inspiration bar rotates ten curated quotes.
              {draft.daily_quote && !draft.daily_quote_author && (
                <b style={{ color: 'var(--amber)' }}> This quote has no attribution.</b>
              )}
            </div>
          </div>

          <hr className="hair" />

          {/* Good news */}
          <NewsColumn
            date={day.date}
            items={day.news}
            candidates={day.candidates}
            scenes={day.scenes}
            live={live}
            askOpen={ask === 'news'}
            askJob={jobs.ask ?? null}
            rewrites={jobs.rewrites}
            onOpenAsk={() => setAsk('news')}
            onCloseAsk={() => { setAsk(null); loadJobs(); }}
            onJobsChanged={loadJobs}
            onChanged={refresh}
            onError={setError}
          />
        </div>
      </div>

      {showPreflight && preflight && (
        <PreflightDialog
          preflight={preflight}
          date={day.date}
          live={live}
          publishedNews={publishedNews}
          pending={pending}
          onClose={() => setShowPreflight(false)}
          onPublish={() => publish('ready')}
          onUnpublish={() => publish('draft')}
        />
      )}
    </div>
  );
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function RailRow({ id, label, state, tail, tailColour, active, onGo }: {
  id: Section; label: string; state: 'done' | 'warn' | 'empty' | 'red';
  tail?: string; tailColour?: string; active: Section; onGo: (s: Section) => void;
}) {
  return (
    <button
      className={`navrow${active === id ? ' on' : ''}`}
      onClick={() => {
        onGo(id);
        document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
    >
      <span className={`dot d-${state}`} />
      {label}
      {tail && <span className="tail" style={{ color: tailColour ?? 'var(--brown2)' }}>{tail}</span>}
    </button>
  );
}

function MiniField({ label, value, onChange, placeholder, action }: {
  label: string; value?: string; onChange: (v: string) => void; placeholder?: string;
  /** The field's ✦ rewrite, when it has one. */
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
      <span className="note" style={{ width: 74, flex: '0 0 74px' }}>{label}</span>
      <input className="field" style={{ flex: 1, fontSize: 12.5 }} placeholder={placeholder}
        value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      {action}
    </div>
  );
}

/** The CURRENT / AI-PROPOSES panel for one field, when a proposal is waiting. */
function FieldReview({ jobs, fieldPath, onAccept, onResolved }: {
  jobs: RewriteJob[]; fieldPath: string; onAccept: (v: string) => void; onResolved: () => void;
}) {
  const job = jobForField(jobs, fieldPath);
  if (!job || job.state === 'running') return null;
  return <RewriteReview job={job} onAccept={onAccept} onResolved={onResolved} />;
}

/**
 * "Paint what is missing" — the follow-up a words-only ask is designed to leave
 * open (R6.2). Every slot with a written scene and no picture, in one batch,
 * failing per slot.
 */
function PaintMissing({ subject, job, onChanged, onError }: {
  subject: { kind: 'edition' | 'month_day'; key: string };
  job: AskJob | null;
  onChanged: () => void;
  onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const running = job?.state === 'running';
  const slots = Object.entries(job?.progress?.slots ?? {});
  const done = slots.filter(([, s]) => s.state === 'done').length;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button className="btn btn-sm" disabled={busy || running}
        onClick={() => {
          setBusy(true);
          void paintMissing(subject)
            .then((r) => { if (!r.ok) onError(r.error ?? 'Nothing to paint.'); else onChanged(); })
            .finally(() => setBusy(false));
        }}>
        {running ? `✦ painting ${done} of ${slots.length}…` : '✦ Paint every empty slot with a prompt'}
      </button>
      <span className="note">
        Slots whose prompt is written but which have no picture yet. One failing never discards the others.
      </span>
    </div>
  );
}

/** One of the 2×2 cards, drawn exactly as the reader draws it — em-dash and all. */
function SensoryCard({ label, value, sub }: { label: string; value?: string; sub?: string }) {
  const empty = !value?.trim();
  return (
    <div className={`scard${empty ? ' empty' : ''}`}>
      <span className="sl" style={empty ? { color: 'var(--amber)' } : undefined}>{label}</span>
      <span className="sv">{empty ? '—' : value}</span>
      {sub?.trim() && <span className="st">{sub}</span>}
    </div>
  );
}

// ── Good news column ─────────────────────────────────────────────────────────

function NewsColumn({
  date, items, candidates, scenes, live, askOpen, askJob, rewrites,
  onOpenAsk, onCloseAsk, onJobsChanged, onChanged, onError,
}: {
  date: string;
  items: EditorNewsItem[];
  candidates: EditorNewsItem[];
  scenes: Record<string, string>;
  live: boolean;
  askOpen: boolean;
  askJob: AskJob | null;
  rewrites: RewriteJob[];
  onOpenAsk: () => void;
  onCloseAsk: () => void;
  onJobsChanged: () => void;
  onChanged: () => void;
  onError: (m: string) => void;
}) {
  const [pending, start] = useTransition();
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [openId, setOpenId] = useState<number | null>(null);

  // Re-sync with the server's ordering when the day reloads, during render.
  const serverOrder = items.map((i) => i.id).join(',');
  const [lastOrder, setLastOrder] = useState(serverOrder);
  if (serverOrder !== lastOrder) { setLastOrder(serverOrder); setOrder(items.map((i) => i.id)); }

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as EditorNewsItem[];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(Number(active.id));
    const to = order.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(order, from, to);
    setOrder(next); // optimistic
    start(async () => {
      const res = await reorderNews(date, next);
      if (!res.ok) { onError(res.error ?? 'Could not reorder.'); setOrder(items.map((i) => i.id)); }
      else onChanged();
    });
  };

  const add = () => start(async () => {
    const res = await createNewsItem(date);
    if (!res.ok) { onError(res.error); return; }
    setOpenId(res.id);
    onChanged();
  });

  return (
    <div className="fgroup" id="sec-news">
      <div className="flbl">
        <span className="kick">Good news · the column, in order</span>
        <span className="note">Position 0 is the lead · ten render, the rest never do</span>
      </div>

      {askOpen && (
        <AskPanel
          kind="news"
          subjectKey={date}
          title="Find good news for this date"
          blurb={
            'Searches a curated list of outlets, within a week of this date, for things that genuinely got '
            + 'better. Each result arrives as a proposal with its source — nothing is published until you keep it. '
            + 'Finding nothing is a real answer.'
          }
          unitNoun={['story', 'stories']}
          defaultUnits={6}
          job={askJob}
          onChanged={() => { onJobsChanged(); onChanged(); }}
          onError={onError}
          onClose={onCloseAsk}
        />
      )}

      {candidates.length > 0 && (
        <div className="panel" style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="kick">{candidates.length} proposed · not in the column</span>
            <span className="note" style={{ flex: 1 }}>
              Read the claim against its source. Keeping one gives it the next free place in the ten;
              rejecting deletes it.
            </span>
            <button className="btn btn-sm btn-ghost" disabled={pending}
              onClick={() => start(async () => {
                const r = await rejectAllCandidates('news', date);
                if (!r.ok) onError(r.error ?? 'Could not clear these.'); else onChanged();
              })}>
              Reject all
            </button>
          </div>
          <div style={{ display: 'grid', gap: 9 }}>
            {candidates.map((c) => (
              <CandidateCard
                key={c.id}
                kind="news"
                item={{
                  id: c.id,
                  headline: c.headline,
                  body: c.description,
                  location: c.location,
                  source_url: c.source_url,
                  source_title: c.source_title,
                  source_published_at: c.source_published_at,
                  stale: c.stale,
                }}
                onChanged={onChanged}
                onError={onError}
              />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="panel" style={{ padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="art art-empty nrowart" />
          <div className="note" style={{ flex: 1 }}>
            No good news in the column for this date. An absent column is a designed state — a family
            simply sees the other sections.
          </div>
          <button className="btn btn-sm" onClick={onOpenAsk} disabled={pending}>✦ Find some</button>
          <button className="btn btn-sm" onClick={add} disabled={pending}>Add by hand</button>
        </div>
      ) : (
        // The stable id keeps dnd-kit's generated aria-describedby identical on
        // the server and the client; without it every drag handle hydrates with
        // a mismatched attribute.
        <DndContext id="dg-news-sortable" sensors={sensors} collisionDetection={closestCenter}
          onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {ordered.map((item, index) => (
                <NewsRow
                  key={item.id}
                  date={date}
                  item={item}
                  index={index}
                  live={live}
                  scene={scenes[`news:${item.position}`] ?? ''}
                  rewrites={rewrites}
                  onJobsChanged={onJobsChanged}
                  open={openId === item.id}
                  onToggle={() => setOpenId((o) => (o === item.id ? null : item.id))}
                  onChanged={onChanged}
                  onError={onError}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {items.length > 0 && items.length < 10 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={add} disabled={pending}>Add another story</button>
          {!askOpen && <button className="btn btn-sm" onClick={onOpenAsk} disabled={pending}>✦ Find more</button>}
          <span className="note">
            {10 - items.length} of the ten the reader renders still free.
          </span>
        </div>
      )}
      {items.length >= 10 && (
        <div className="note">
          Ten stories — the reader renders no more, so an eleventh would be invisible.
        </div>
      )}
    </div>
  );
}

function NewsRow({
  date, item, index, live, scene, rewrites, onJobsChanged, open, onToggle, onChanged, onError,
}: {
  date: string; item: EditorNewsItem; index: number; live: boolean; open: boolean;
  scene: string; rewrites: RewriteJob[]; onJobsChanged: () => void;
  onToggle: () => void; onChanged: () => void; onError: (m: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const [pending, start] = useTransition();
  const [local, setLocal] = useState({
    headline: item.headline, description: item.description ?? '',
    location: item.location ?? '', image_url: item.image_url ?? '',
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemKey = `${item.id}:${item.headline}:${item.description}:${item.location}:${item.image_url}`;
  const [lastItem, setLastItem] = useState(itemKey);
  if (itemKey !== lastItem) {
    setLastItem(itemKey);
    setLocal({
      headline: item.headline, description: item.description ?? '',
      location: item.location ?? '', image_url: item.image_url ?? '',
    });
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const set = useCallback((key: keyof typeof local) => (value: string) => {
    setLocal((l) => ({ ...l, [key]: value }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveNewsItem(item.id, { [key]: value }).then((r) => {
        if (!r.ok) onError(r.error ?? 'Could not save that story.');
      });
    }, 800);
  }, [item.id, onError]);

  const style = { transform: dndCSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const lead = index === 0;
  const iso2 = local.location ? resolveLocation(local.location) : null;
  const teaser = (local.description || '').split(/(?<=[.!?])\s/)[0] ?? '';

  return (
    <div ref={setNodeRef} style={style}>
      <div className={`panel ${lead ? 'lead' : 'nrow'}`}>
        <span ref={setActivatorNodeRef} className="grip" {...attributes} {...listeners}>⋮⋮</span>

        {lead ? (
          <div className={`art leadart${local.image_url ? '' : ' art-empty'}`}
            style={local.image_url ? { backgroundImage: `url(${local.image_url})` } : undefined} />
        ) : (
          <>
            <span className="chip chip-ink" style={{ width: 26, justifyContent: 'center' }}>{index}</span>
            <div className={`art nrowart${local.image_url ? '' : ' art-empty'}`}
              style={local.image_url ? { backgroundImage: `url(${local.image_url})` } : undefined} />
          </>
        )}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {lead && <span className="chip chip-gold">Lead · position 0</span>}
            {live && !item.published && <span className="chip chip-amber">Held back</span>}
            {!live && <span className="chip chip-ink">Draft</span>}
            {/* The lead's missing image is a real defect; row 9's is not (R3.1). */}
            {lead && !local.image_url && <span className="chip chip-amber">No image · gets the large card</span>}
            {iso2 && <span className="chip chip-green">{flagEmoji(iso2)} {iso2}</span>}
            {local.location && !iso2 && <span className="chip chip-amber">No flag from “{local.location}”</span>}
          </div>

          <div className="serif" style={{ fontSize: lead ? 16 : 13, fontWeight: 600, lineHeight: 1.25 }}>
            {local.headline || 'Untitled story'}
          </div>
          {lead && teaser && (
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{teaser}</div>
          )}
        </div>

        <button className="btn btn-sm" onClick={onToggle} disabled={pending}>
          {open ? 'Close' : 'Edit'}
        </button>
      </div>

      {open && (
        <div className="panel" style={{ padding: 14, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Provenance stays visible after accepting: a later visit has to be
              able to tell what was verified from what was merely typed (D10). */}
          {item.source_url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="chip chip-green">Sourced</span>
              <a href={item.source_url} target="_blank" rel="noreferrer noopener" style={{ fontSize: 11.5 }}>
                {item.source_title || 'the source'} ↗
              </a>
              {item.source_published_at && (
                <span className="note">published {item.source_published_at.slice(0, 10)}</span>
              )}
              {item.stale && <span className="chip chip-amber">not from this week</span>}
            </div>
          )}

          <div className="flbl">
            <span className="kick">Headline</span>
            <RewriteButton
              subject={{ kind: 'edition', key: date }}
              fieldPath={`news.${item.id}.headline`}
              current={local.headline}
              context={`Good news for ${date}`}
              job={jobForField(rewrites, `news.${item.id}.headline`)}
              onStarted={onJobsChanged}
              onError={onError}
            />
          </div>
          <input className="field" placeholder="Headline" value={local.headline}
            onChange={(e) => set('headline')(e.target.value)} />
          <FieldReview jobs={rewrites} fieldPath={`news.${item.id}.headline`} onAccept={set('headline')} onResolved={onJobsChanged} />

          <div className="flbl">
            <span className="kick">The story</span>
            <RewriteButton
              subject={{ kind: 'edition', key: date }}
              fieldPath={`news.${item.id}.description`}
              current={local.description}
              context={`Good news for ${date}: ${local.headline}`}
              job={jobForField(rewrites, `news.${item.id}.description`)}
              onStarted={onJobsChanged}
              onError={onError}
            />
          </div>
          <textarea className="field" rows={3} placeholder="What happened, for a child of seven…"
            value={local.description} onChange={(e) => set('description')(e.target.value)} />
          <FieldReview jobs={rewrites} fieldPath={`news.${item.id}.description`} onAccept={set('description')} onResolved={onJobsChanged} />
          <div className="note">
            The list shows only the first sentence; the whole text appears when a child opens the story.
            {item.source_url && ' A rewrite keeps the facts as they stand — it is for tone, not for new claims.'}
          </div>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="note" style={{ width: 58 }}>Where</span>
            <input className="field" style={{ flex: 1, minWidth: 180 }} placeholder="Berlin, Germany"
              value={local.location} onChange={(e) => set('location')(e.target.value)} />
            {iso2
              ? <span className="chip chip-green">{flagEmoji(iso2)} {iso2}</span>
              : <span className="chip chip-ink">no seal</span>}
          </div>
          <div className="note">
            This is the field that earns a flag seal — none of the 52 imported stories have one.
          </div>
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <span className="note" style={{ width: 58, paddingTop: 8 }}>Painting</span>
            <SlotOpener
              slot={newsSlot(item.position)}
              subject={{ kind: 'edition', key: date }}
              imageUrl={item.image_url}
              scene={scene}
              context={`Good news · ${lead ? 'the lead' : `story ${index + 1}`}`}
              width={150}
              height={84}
              emptyText={scene ? 'prompt written' : 'no painting'}
              onChanged={onChanged}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {live && (
              <button className="btn btn-sm" disabled={pending} onClick={() => start(async () => {
                const r = await setNewsPublished(item.id, !item.published);
                if (!r.ok) onError(r.error ?? 'Could not change that story.'); else onChanged();
              })}>
                {item.published ? 'Hold back from families' : 'Show to families'}
              </button>
            )}
            <button className="btn btn-sm btn-red" style={{ marginLeft: 'auto' }} disabled={pending}
              onClick={() => start(async () => {
                const r = await deleteNewsItem(item.id);
                if (!r.ok) onError(r.error ?? 'Could not delete.'); else onChanged();
              })}>
              Delete this story
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Preflight ────────────────────────────────────────────────────────────────

function PreflightDialog({ preflight, date, live, publishedNews, pending, onClose, onPublish, onUnpublish }: {
  preflight: Preflight; date: string; live: boolean; publishedNews: number; pending: boolean;
  onClose: () => void; onPublish: () => void; onUnpublish: () => void;
}) {
  const chip = (level: string) =>
    level === 'ready' ? <span className="chip chip-green">Ready</span>
      : level === 'substitute' ? <span className="chip chip-amber">Substitute</span>
        : <span className="chip chip-amber">Visible gap</span>;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="kick">{live ? 'Already live' : 'Publish'} · {fmtDate(date)}</div>
          <div className="serif" style={{ fontSize: 21, fontWeight: 600, marginTop: 6 }}>
            {live
              ? 'This date is a wax seal families can open'
              : 'This date becomes a wax seal families can open'}
          </div>
          <div className="note" style={{ marginTop: 6 }}>
            {live
              ? 'It is in the navigator on the reader page now. Here is what a family does and does not see.'
              : 'It joins the navigator on the reader page immediately, and its good-news column is published with it. Nothing below blocks you.'}
          </div>
        </div>
        <hr className="hair" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {preflight.items.map((it) => (
            <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--brown)' }}>
              <span className={`dot ${it.level === 'ready' ? 'd-done' : 'd-warn'}`} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {chip(it.level)}
            </div>
          ))}
        </div>

        {preflight.recurringNote && (
          <div className="callout"><div className="note" style={{ color: 'var(--brown)' }}>{preflight.recurringNote}</div></div>
        )}

        <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="btn" onClick={onClose} disabled={pending}>
            {live ? 'Close' : 'Keep as draft'}
          </button>
          {live ? (
            <button className="btn btn-red" onClick={onUnpublish} disabled={pending}>
              Withdraw from families
            </button>
          ) : (
            <button className="btn btn-gold" onClick={onPublish} disabled={pending}>
              Publish {fmtDate(date)}{publishedNews === 0 ? '' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
