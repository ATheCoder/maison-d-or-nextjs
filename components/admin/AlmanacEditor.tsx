'use client';
/**
 * The almanac editor (Phase 6) — one month-day, in every year.
 *
 * The blast radius is stated before anything else (R4.1), because this is the
 * screen where an edit is least reversible in effect: changing 12 June changes
 * every future 12 June. The day editor's date-shaped work is one page away in
 * the other direction (R4.16), so the two keying schemes have doors both ways.
 *
 * Born Today is acknowledged but not owned (R4.15): people are month-day
 * content too, but a person — and the order they appear in — is edited in the
 * library, and giving that decision two homes is how the two drift apart.
 *
 * Phase 8 adds retrieval on the same terms as everywhere else: an ask proposes
 * unpublished rows with citations, the admin reads each claim beside its
 * source, and only Keep publishes it. A proposed moment parks above the ladder
 * rather than in it, so "6 of 10" never counts something nobody has read.
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
import { historySlot, momentSlot } from '@/lib/daily-gold/slots';
import SlotOpener from './SlotOpener';
import AskPanel, { type AskJob } from './AskPanel';
import CandidateCard from './CandidateCard';
import { RewriteButton, RewriteReview, jobForField, useJobPolling, type RewriteJob } from './DgRewrite';
import {
  createEvent, createMoment, deleteEvent, deleteMoment, reorderMoments, reorderYear,
  saveEvent, saveMoment, setEventPublished, setMomentPublished,
  type AlmanacDay, type AlmanacEvent, type AlmanacMoment,
} from '@/app/admin/daily-gold/almanacActions';
import {
  acceptCandidate, getDgJobs, rejectAllCandidates, rejectCandidate,
} from '@/app/admin/daily-gold/aiActions';

const CSS = `
.alm {
  --ground:#f5f0e7; --panel-t:rgba(255,248,238,.82);
  --line:rgba(201,169,110,.25); --line2:rgba(201,169,110,.45);
  --ink:#241a0c; --brown:#5c4a2a; --brown2:#8b7355; --brown3:#a08a63;
  --gold:#c9a96e; --gold-deep:#a8843f; --gold-soft:rgba(201,169,110,.14);
  --green:#7d8a4e; --amber:#c08a2e; --red:#b5533a;
  --serif:"Playfair Display",Georgia,serif; --sans:"Lato",system-ui,sans-serif;
  min-height:100vh; font-family:var(--sans); color:var(--ink); background:var(--ground);
  display:flex; flex-direction:column; -webkit-font-smoothing:antialiased;
}
.alm * { box-sizing:border-box; }
.alm .serif { font-family:var(--serif); }
.alm .kick { font:700 10px/1.4 var(--sans); letter-spacing:.26em; text-transform:uppercase; color:var(--gold-deep); }
.alm .muted { color:var(--brown2); }
.alm .note { font-size:11.5px; color:var(--brown2); line-height:1.6; }
.alm .panel { background:var(--panel-t); border:1px solid var(--line); border-radius:14px; }
.alm a { color:var(--gold-deep); text-decoration:none; }
.alm a:hover { color:var(--ink); text-decoration:underline; }
.alm .hair { height:1px; background:var(--line); border:none; margin:4px 0; }

.alm .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; font:700 12px/1 var(--sans); padding:9px 14px; border-radius:9px; border:1px solid var(--line2); background:#fffdf8; color:var(--brown); cursor:pointer; }
.alm .btn:hover { transform:translateY(-1px); }
.alm .btn:disabled { opacity:.5; cursor:default; transform:none; }
.alm .btn-gold { background:linear-gradient(180deg,#dcc191,#c9a96e); color:#3a2a10; border-color:var(--gold-deep); }
.alm .btn-ghost { background:transparent; border-color:transparent; color:var(--brown2); }
.alm .btn-red { background:transparent; border-color:rgba(181,83,58,.5); color:var(--red); }
.alm .btn-sm { padding:6px 10px; font-size:11px; border-radius:8px; }

.alm .chip { display:inline-flex; align-items:center; gap:5px; font:700 10px/1 var(--sans); letter-spacing:.06em; text-transform:uppercase; padding:5px 9px; border-radius:999px; border:1px solid var(--line2); color:var(--brown); background:#fffdf8; white-space:nowrap; }
.alm .chip-gold { background:var(--gold-soft); color:var(--gold-deep); }
.alm .chip-green { background:rgba(125,138,78,.14); border-color:rgba(125,138,78,.4); color:#5f6c37; }
.alm .chip-amber { background:rgba(192,138,46,.14); border-color:rgba(192,138,46,.42); color:#96681f; }
.alm .chip-red { background:rgba(181,83,58,.12); border-color:rgba(181,83,58,.42); color:#96402b; }
.alm .chip-ink { background:rgba(36,26,12,.06); border-color:var(--line); color:var(--brown); text-transform:none; letter-spacing:0; font-weight:400; }

.alm .dot { width:9px; height:9px; border-radius:50%; flex:0 0 auto; display:inline-block; }
.alm .d-done { background:var(--green); }
.alm .d-part { background:var(--gold); }
.alm .d-warn { background:var(--amber); }
.alm .d-red { background:var(--red); }
.alm .d-empty { background:rgba(92,74,42,.18); }

.alm .banner { display:flex; align-items:center; gap:11px; padding:12px 20px; font-size:12.5px; line-height:1.6; }
.alm .b-gold { background:var(--gold-soft); border-bottom:1px solid var(--line); color:var(--brown); }
.alm .b-amber { background:rgba(192,138,46,.09); border:1px solid rgba(192,138,46,.38); color:#7a5518; border-radius:10px; }
.alm .b-red { background:rgba(181,83,58,.08); border:1px solid rgba(181,83,58,.35); color:#7d3a26; border-radius:10px; }

.alm .topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px 20px; background:var(--panel-t); border-bottom:1px solid var(--line); flex-wrap:wrap; }
.alm .vhair { width:1px; background:var(--line); align-self:stretch; }
.alm .seg { display:inline-flex; padding:3px; background:rgba(36,26,12,.06); border:1px solid var(--line); border-radius:10px; gap:2px; }
.alm .seg > button { font:700 11px/1 var(--sans); padding:8px 13px; border-radius:7px; color:var(--brown2); cursor:pointer; border:none; background:transparent; }
.alm .seg > button.on { background:#fffdf8; color:var(--ink); box-shadow:0 1px 6px rgba(40,26,12,.1); }

.alm .daystrip { display:flex; align-items:center; gap:14px; padding:11px 20px; border-bottom:1px solid var(--line); background:rgba(255,248,238,.55); flex-wrap:wrap; }
.alm .spine { width:13px; height:17px; border-radius:2px 3px 3px 2px; display:inline-block; background:linear-gradient(150deg,#d9c286,#b89a5e 60%,#8f7c4a); }

.alm .body { display:flex; flex:1; min-height:0; align-items:flex-start; }
.alm .rail { width:340px; flex:0 0 340px; padding:14px 12px 40px; border-right:1px solid var(--line); display:flex; flex-direction:column; gap:2px; }
.alm .pane { flex:1; min-width:0; padding:20px 24px 60px; display:flex; flex-direction:column; gap:15px; }

.alm .yg { display:flex; flex-direction:column; gap:2px; margin-bottom:3px; }
.alm .ygh { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:8px; }
.alm .ygh .y { font-family:var(--serif); font-size:14px; font-weight:600; color:var(--ink); min-width:40px; }
.alm .ygh.none .y { color:var(--brown3); font-weight:500; }
.alm .ygh .add { margin-left:auto; opacity:0; }
.alm .yg:hover .add { opacity:1; }
.alm .ev { display:flex; align-items:flex-start; gap:8px; margin-left:16px; padding:6px 9px; border-radius:8px; font-size:11.5px; line-height:1.4; color:var(--brown2); border:1px solid transparent; background:transparent; text-align:left; }
.alm .ev:hover { background:rgba(201,169,110,.1); }
.alm .ev.on { background:#fffdf8; border-color:var(--line2); color:var(--brown); box-shadow:0 2px 10px rgba(40,26,12,.06); }
.alm .ev .n { color:var(--brown3); font-weight:700; flex:0 0 auto; }
.alm .prog { height:5px; border-radius:3px; background:rgba(92,74,42,.1); overflow:hidden; }
.alm .prog > i { display:block; height:100%; background:linear-gradient(90deg,#d8bd86,#c9a96e); }

.alm .fgroup { display:flex; flex-direction:column; gap:8px; }
.alm .flbl { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.alm .field { width:100%; background:#fffdf8; border:1px solid var(--line2); border-radius:10px; color:var(--ink); font:400 13px/1.6 var(--sans); padding:10px 13px; outline:none; resize:vertical; }
.alm .field:focus { border-color:var(--gold-deep); }
.alm .field::placeholder { color:var(--brown3); }

.alm .art { border-radius:7px; background:radial-gradient(ellipse at 34% 28%, #e8d29a, transparent 60%), linear-gradient(150deg,#d9c286,#b89a5e 60%,#8f7c4a); background-size:cover; background-position:center; }
.alm .art-empty { background:repeating-linear-gradient(135deg, rgba(120,90,50,.07) 0 7px, transparent 7px 14px), #f3ead2; border:1px dashed rgba(120,90,50,.35); }
.alm .iso { display:inline-flex; align-items:center; gap:5px; font:700 11px/1 var(--sans); padding:6px 9px; border-radius:7px; background:var(--gold-soft); border:1px solid var(--line2); color:var(--gold-deep); }
.alm .iso-none { background:rgba(181,83,58,.08); border-color:rgba(181,83,58,.3); color:#96402b; }

.alm .rung { display:flex; align-items:center; gap:11px; padding:11px 13px; }
.alm .rank { font-family:var(--serif); font-size:19px; font-weight:600; color:var(--gold-deep); width:26px; text-align:center; flex:0 0 26px; }
.alm .rank.empty { color:var(--brown3); opacity:.5; }
.alm .grip { cursor:grab; color:var(--brown3); font-size:13px; letter-spacing:-2px; user-select:none; }
.alm .open { border-color:var(--gold-deep); box-shadow:0 0 0 2px var(--gold-soft), 0 10px 26px rgba(40,26,12,.1); }
.alm .sw { width:34px; height:19px; border-radius:999px; background:rgba(92,74,42,.2); position:relative; cursor:pointer; border:none; flex:0 0 34px; }
.alm .sw::after { content:""; position:absolute; top:2px; left:2px; width:15px; height:15px; border-radius:50%; background:#fffdf8; transition:left .12s ease; }
.alm .sw.on { background:var(--green); }
.alm .sw.on::after { left:17px; }
`;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const fmtMonthDay = (md: string) => {
  const [m, d] = md.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};
const fmtDate = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
/** BC years live as negatives in this data (−411 is real). */
const fmtYear = (y: number) => (y < 0 ? `${Math.abs(y)} BC` : String(y));
const wordCount = (s: string | null) => (s ? s.trim().split(/\s+/).filter(Boolean).length : 0);

type Tab = 'history' | 'moments';

export default function AlmanacEditor({ day }: { day: AlmanacDay }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('history');
  const [error, setError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    () => day.years.flatMap((y) => y.events)[0]?.id ?? null,
  );

  const allEvents = useMemo(() => day.years.flatMap((y) => y.events), [day.years]);

  // Keep the selection valid when the day reloads (an event may be gone).
  const eventIds = allEvents.map((e) => e.id).join(',');
  const [lastIds, setLastIds] = useState(eventIds);
  if (eventIds !== lastIds) {
    setLastIds(eventIds);
    if (selectedEventId != null && !allEvents.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(allEvents[0]?.id ?? null);
    }
  }

  const selected = allEvents.find((e) => e.id === selectedEventId) ?? null;
  const bandYears = day.years.filter((y) => y.inBand);
  const covered = bandYears.filter((y) => y.events.length > 0).length;
  const publishedEvents = allEvents.filter((e) => e.published).length;
  const outOfBand = day.years.filter((y) => !y.inBand && y.events.length > 0);
  const eventCandidates = allEvents.filter((e) => e.candidate);

  const refresh = () => router.refresh();

  // ── Jobs ──────────────────────────────────────────────────────────────────
  const subject = useMemo(() => ({ kind: 'month_day' as const, key: day.monthDay }), [day.monthDay]);
  // Which tab's ask panel is open. Per tab, not one flag for both: the two tabs
  // ask for different things, and a panel opened on one has no business
  // appearing on the other.
  const [askOpenFor, setAskOpenFor] = useState<Tab | null>(null);

  /**
   * Close the Ask panel whenever this leaves the screen.
   *
   * Under Cache Components <Activity> hides a route instead of unmounting it,
   * so an overlay left open comes back open on return. It is a momentary sheet, not a place the admin was working.
   * The editor's drafts are deliberately left alone — surviving a navigation is
   * what Activity is *for*; it is the transient furniture on top that has to go.
   */
  useLayoutEffect(() => () => { setAskOpenFor(null); }, []);
  const [jobs, setJobs] = useState<{ ask: AskJob | null; rewrites: RewriteJob[] }>({ ask: null, rewrites: [] });

  const loadJobs = useCallback(() => {
    void getDgJobs(subject).then((j) => setJobs({ ask: j.ask, rewrites: j.rewrites }));
  }, [subject]);
  useEffect(() => { loadJobs(); }, [loadJobs]);

  const anyRunning = jobs.ask?.state === 'running' || jobs.rewrites.some((r) => r.state === 'running');
  useJobPolling(anyRunning, () => { loadJobs(); router.refresh(); });

  // A finished ask has written rows the page was rendered without; pull them in
  // once. The panel stays until dismissed, so leaving and returning finds the
  // same result waiting.
  const askDone = jobs.ask?.state === 'done' ? jobs.ask.id : null;
  useEffect(() => { if (askDone) router.refresh(); }, [askDone, router]);

  /**
   * Which tab an existing ask belongs to.
   *
   * A finished ask sits on its own tab until it is dismissed, and it must not
   * haunt the other one: gating both tabs on "is there any ask job" left an
   * undismissed Greatest Moments result silently disabling *Ask for events* —
   * a dead button with no explanation, which is exactly how this looked.
   */
  const askTab: Tab | null = jobs.ask ? (jobs.ask.progress?.ask?.kind === 'moments' ? 'moments' : 'history') : null;
  const tabAsk = askTab === tab ? jobs.ask : null;
  /** The other tab's ask is mid-flight — one runs per month-day at a time. */
  const otherAskRunning = Boolean(jobs.ask) && askTab !== tab && jobs.ask?.state === 'running';

  // Open either because the admin asked for it, or because a job belongs to
  // this tab — that second clause is what makes leaving and returning find the
  // result waiting where it was asked for, with no state to keep in sync.
  const showAsk = !otherAskRunning && (askOpenFor === tab || Boolean(tabAsk));

  return (
    <div className="alm">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Topbar ─────────────────────────────────────────────── */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost btn-sm" href="/admin/daily-gold" style={{ paddingLeft: 0 }}>‹ Desk</Link>
          <div className="vhair" style={{ height: 30 }} />
          <div>
            <div className="serif" style={{ fontSize: 20, fontWeight: 600 }}>{fmtMonthDay(day.monthDay)}</div>
            <div className="kick" style={{ marginTop: 4 }}>The almanac · recurring content</div>
          </div>
          <div className="vhair" style={{ height: 30 }} />
          {/* R4.16 — the door back to a real date. */}
          <Link className="btn btn-ghost btn-sm" href={`/admin/daily-gold/${day.occurrenceDate}`}
            title="This month-day as an actual date">
            {fmtDate(day.occurrenceDate)} →
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-sm"
            onClick={() => setAskOpenFor(tab)}
            disabled={Boolean(tabAsk) || otherAskRunning}
            title={otherAskRunning
              ? `The ${askTab === 'moments' ? 'Greatest Moments' : 'On This Day'} ask is still running — one at a time per month-day.`
              : undefined}
          >
            {tab === 'history' ? '✦ Ask for events' : '✦ Ask for moments'}
          </button>
          <div className="seg">
            <button className={tab === 'history' ? 'on' : undefined} onClick={() => setTab('history')}>On this day</button>
            <button className={tab === 'moments' ? 'on' : undefined} onClick={() => setTab('moments')}>Greatest moments</button>
          </div>
        </div>
      </div>

      {/* ── Blast radius, first thing (R4.1) ───────────────────── */}
      <div className="banner b-gold">
        <span className="dot d-done" />
        {tab === 'history' ? (
          <span>
            <b>This is {fmtMonthDay(day.monthDay)} in every year.</b> On This Day covers the years{' '}
            <b>{day.bandFrom}–{day.bandTo}</b> — the recent past a child can step back through.
            Anything older belongs to <button className="btn btn-ghost btn-sm" style={{ padding: 0 }}
              onClick={() => setTab('moments')}>Greatest Moments</button>, which spans all of history.
          </span>
        ) : (
          <span>
            <b>This is {fmtMonthDay(day.monthDay)} in every year.</b> Greatest Moments has no window:
            the most important things that have <i>ever</i> happened on {fmtMonthDay(day.monthDay)} —
            any year, BC included. Recent events belong to{' '}
            <button className="btn btn-ghost btn-sm" style={{ padding: 0 }}
              onClick={() => setTab('history')}>On This Day</button> instead.
          </span>
        )}
      </div>

      {/* ── Born Today, acknowledged not owned (R4.15) ─────────── */}
      <BornTodayStrip day={day} />

      {error && (
        <div className="banner b-red" style={{ borderRadius: 0 }}>
          <span className="dot d-red" /><span>{error}</span>
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {tab === 'history' ? (
        <div className="body">
          <div className="rail">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 10px 9px' }}>
              <span className="kick">The recent years</span>
              <span className="note">{day.bandFrom} – {day.bandTo}</span>
            </div>

            <div className="panel" style={{ padding: '10px 11px', margin: '0 2px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="note">
                <b style={{ color: 'var(--brown)' }}>{covered} of {bandYears.length} years</b> in the band
                have something to tell{publishedEvents < allEvents.length
                  ? ` — ${publishedEvents} published, ${allEvents.length - publishedEvents} awaiting review.`
                  : '.'}
              </div>
              <div className="prog"><i style={{ width: `${Math.round((covered / bandYears.length) * 100)}%` }} /></div>
              <div className="note">
                A year with nothing worth telling a seven-year-old is finished, not pending.
              </div>
            </div>

            {day.years.map((y) => (
              <div className="yg" key={y.year}>
                <div className={`ygh${y.events.length ? '' : ' none'}`}>
                  <span className={`dot ${y.events.length === 0 ? 'd-empty'
                    : y.events.some((e) => e.published) ? 'd-done' : 'd-part'}`} />
                  <span className="y">{fmtYear(y.year)}</span>
                  {y.events.length > 0 ? (
                    <>
                      {y.events.some((e) => e.published) && (
                        <span className="chip chip-gold" style={{ padding: '3px 7px' }}>
                          {y.events.filter((e) => e.published).length} live
                        </span>
                      )}
                      {y.events.some((e) => !e.published) && (
                        <span className="chip chip-amber" style={{ padding: '3px 7px' }}>
                          {y.events.filter((e) => !e.published).length} draft
                        </span>
                      )}
                      {!y.inBand && <span className="chip chip-ink" style={{ padding: '3px 7px' }}>outside the band</span>}
                    </>
                  ) : (
                    <span className="note">nothing — finished</span>
                  )}
                  <AddEventButton monthDay={day.monthDay} year={y.year} onDone={refresh} onError={setError} />
                </div>

                <YearEvents
                  monthDay={day.monthDay}
                  year={y.year}
                  events={y.events}
                  selectedId={selectedEventId}
                  onSelect={setSelectedEventId}
                  onChanged={refresh}
                  onError={setError}
                />
              </div>
            ))}

            {outOfBand.length > 0 && (
              <>
                <hr className="hair" style={{ margin: '9px 6px' }} />
                <div className="note" style={{ padding: '0 10px' }}>
                  {outOfBand.length} year{outOfBand.length === 1 ? '' : 's'} outside the band still hold
                  events. They stay published and editable — the band governs what gets generated, not
                  what stays.
                </div>
              </>
            )}
          </div>

          <div className="pane">
            {showAsk && (
              <AskPanel
                kind="history"
                subjectKey={day.monthDay}
                title={`Events for ${fmtMonthDay(day.monthDay)}`}
                blurb={
                  `One ask across ${day.bandFrom}–${day.bandTo}, returning candidate events spread over several `
                  + 'years, each with its citation. What is already here is sent as exclusions, so asking twice '
                  + 'proposes different things rather than the same five again.'
                }
                unitNoun={['event', 'events']}
                defaultUnits={6}
                job={tabAsk}
                onChanged={() => { loadJobs(); refresh(); }}
                onError={setError}
                onClose={() => { setAskOpenFor(null); loadJobs(); }}
              />
            )}

            {eventCandidates.length > 0 && (
              <CandidateStrip
                kind="event"
                count={eventCandidates.length}
                monthDay={day.monthDay}
                blurb="Proposed events, not yet shown to families. Select one on the left to read it in full — or judge it here."
                onChanged={refresh}
                onError={setError}
              />
            )}

            {selected ? (
              <EventPane
                key={selected.id}
                monthDay={day.monthDay}
                event={selected}
                siblings={day.years.find((y) => y.year === selected.year)?.events ?? []}
                scene={day.scenes[`history:${selected.year}:${selected.position}`] ?? ''}
                rewrites={jobs.rewrites}
                onJobsChanged={loadJobs}
                onChanged={refresh}
                onError={setError}
              />
            ) : (
              <div className="note" style={{ fontSize: 13, maxWidth: 520 }}>
                Nothing is authored for {fmtMonthDay(day.monthDay)} yet. Hover a year on the left and use
                <b> + </b> to write its first event, or ask for some — or leave the day empty, which is a
                finished state, not an unfinished one.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="pane" style={{ padding: '20px 24px 60px' }}>
          {showAsk && (
            <AskPanel
              kind="moments"
              subjectKey={day.monthDay}
              title={`Moments for ${fmtMonthDay(day.monthDay)}`}
              blurb={
                'All of history, BC included. Results are appended as proposals — never a replacement — and '
                + 'the ask is capped at the free rungs, because a moment there is nowhere to accept is a moment '
                + 'you paid for and cannot use.'
              }
              unitNoun={['moment', 'moments']}
              defaultUnits={5}
              job={tabAsk}
              onChanged={() => { loadJobs(); refresh(); }}
              onError={setError}
              onClose={() => { setAskOpenFor(null); loadJobs(); }}
            />
          )}

          {day.momentCandidates.length > 0 && (
            <div className="panel" style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="kick">{day.momentCandidates.length} proposed · not on the ladder</span>
                <span className="note" style={{ flex: 1 }}>
                  Check the year against the source — year drift is what goes wrong here. Keeping one gives it
                  the next free rung.
                </span>
                <RejectAll kind="moment" monthDay={day.monthDay} onChanged={refresh} onError={setError} />
              </div>
              <div style={{ display: 'grid', gap: 9 }}>
                {day.momentCandidates.map((m) => (
                  <CandidateCard
                    key={m.id}
                    kind="moment"
                    item={{
                      id: m.id,
                      headline: m.headline,
                      body: m.story,
                      year: m.year,
                      source_url: m.source_url,
                      source_title: m.source_title,
                    }}
                    onChanged={refresh}
                    onError={setError}
                  />
                ))}
              </div>
            </div>
          )}

          <MomentLadder day={day} rewrites={jobs.rewrites} onJobsChanged={loadJobs}
            onChanged={refresh} onError={setError} />
        </div>
      )}
    </div>
  );
}

// ── Born Today ───────────────────────────────────────────────────────────────

function BornTodayStrip({ day }: { day: AlmanacDay }) {
  const published = day.people.filter((p) => p.published);
  const drafts = day.people.filter((p) => !p.published);
  const shown = day.people.slice(0, 2);

  return (
    <div className="daystrip">
      <div className="kick" style={{ color: 'var(--brown)' }}>
        Also recurring · born on {fmtMonthDay(day.monthDay)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {day.people.length === 0 ? (
          <span className="note">Nobody in the library was born on this day.</span>
        ) : (
          <>
            {shown.map((p) => (
              <span key={p.slug} className="chip chip-ink" style={{ paddingLeft: 5, gap: 7 }}>
                <span className="art spine" />{p.name}
                {p.birthYear && <span className="muted">{p.birthYear}</span>}
              </span>
            ))}
            {day.people.length > shown.length && (
              <span className="chip chip-ink">+{day.people.length - shown.length} more</span>
            )}
            {published.length > 0 && <span className="chip chip-gold">{published.length} published</span>}
            {drafts.length > 0 && (
              <span className="chip chip-amber">{drafts.length} draft · will not surface</span>
            )}
          </>
        )}
      </div>
      <span className="note" style={{ maxWidth: 340 }}>
        Read-only here. People are recurring like the two tabs above, but a person — and the order they
        appear in — is edited in the library.
      </span>
      <Link className="btn btn-sm" style={{ marginLeft: 'auto' }} href="/admin/people">
        Open the library →
      </Link>
    </div>
  );
}

// ── On This Day: the year rail ───────────────────────────────────────────────

function AddEventButton({ monthDay, year, onDone, onError }: {
  monthDay: string; year: number; onDone: () => void; onError: (m: string) => void;
}) {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-sm btn-ghost add" disabled={pending} title={`Add an event to ${year}`}
      onClick={() => start(async () => {
        const res = await createEvent(monthDay, year);
        if (!res.ok) onError(res.error); else onDone();
      })}>
      +
    </button>
  );
}

function YearEvents({ monthDay, year, events, selectedId, onSelect, onChanged, onError }: {
  monthDay: string; year: number; events: AlmanacEvent[];
  selectedId: number | null; onSelect: (id: number) => void;
  onChanged: () => void; onError: (m: string) => void;
}) {
  const [pending, start] = useTransition();
  const [order, setOrder] = useState(events.map((e) => e.id));

  const serverOrder = events.map((e) => e.id).join(',');
  const [lastOrder, setLastOrder] = useState(serverOrder);
  if (serverOrder !== lastOrder) { setLastOrder(serverOrder); setOrder(events.map((e) => e.id)); }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!events.length) return null;

  const byId = new Map(events.map((e) => [e.id, e]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as AlmanacEvent[];

  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(Number(active.id));
    const to = order.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(order, from, to);
    setOrder(next);
    start(async () => {
      const res = await reorderYear(monthDay, year, next);
      if (!res.ok) { onError(res.error ?? 'Could not reorder.'); setOrder(events.map((e) => e.id)); }
      else onChanged();
    });
  };

  return (
    <DndContext id={`alm-year-${year}`} sensors={sensors} collisionDetection={closestCenter}
      onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        {ordered.map((e, i) => (
          <EventRailRow key={e.id} event={e} index={i} selected={selectedId === e.id}
            onSelect={() => onSelect(e.id)} disabled={pending} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function EventRailRow({ event, index, selected, onSelect, disabled }: {
  event: AlmanacEvent; index: number; selected: boolean; onSelect: () => void; disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: event.id });
  const style = { transform: dndCSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  // The drag activator carries role="button"/tabIndex from dnd-kit, so it must
  // not sit inside the select button — nested interactive elements are invalid
  // and the outer button swallows the pointerdown the sensor needs.
  return (
    <div ref={setNodeRef} style={style} className={`ev${selected ? ' on' : ''}`}>
      <span ref={setActivatorNodeRef} className="n" title="Drag to reorder"
        style={{ cursor: 'grab', touchAction: 'none' }} {...attributes} {...listeners}>
        {index + 1}
      </span>
      <button
        onClick={onSelect}
        disabled={disabled}
        style={{
          flex: 1, textAlign: 'left', background: 'transparent', border: 'none',
          padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer',
        }}
      >
        {event.headline || <i>Untitled event</i>}
        {event.candidate && <b style={{ color: '#96681f' }}> · proposed</b>}
        {event.dateMismatch && <b style={{ color: '#96402b' }}> · date looks wrong</b>}
      </button>
      {!event.published && <span className="dot d-empty" style={{ marginTop: 4 }} />}
    </div>
  );
}

// ── On This Day: the event pane ──────────────────────────────────────────────

function EventPane({ monthDay, event, siblings, scene, rewrites, onJobsChanged, onChanged, onError }: {
  monthDay: string; event: AlmanacEvent; siblings: AlmanacEvent[];
  scene: string; rewrites: RewriteJob[]; onJobsChanged: () => void;
  onChanged: () => void; onError: (m: string) => void;
}) {
  const [pending, start] = useTransition();
  const [local, setLocal] = useState({
    headline: event.headline ?? '', story: event.story ?? '',
    location: event.location ?? '', image_url: event.image_url ?? '',
    year: String(event.year),
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const set = useCallback((key: keyof typeof local) => (value: string) => {
    setLocal((l) => ({ ...l, [key]: value }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const payload = key === 'year' ? { year: Number(value) } : { [key]: value };
      void saveEvent(event.id, payload).then((r) => {
        if (!r.ok) onError(r.error ?? 'Could not save.');
      });
    }, 800);
  }, [event.id, onError]);

  const iso2 = local.location ? resolveLocation(local.location) : null;
  const index = siblings.findIndex((s) => s.id === event.id);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div className="kick">{fmtYear(event.year)} · event {index + 1} of {siblings.length}</div>
          <div className="note" style={{ marginTop: 3 }}>
            A year holds as many events as it deserves. Order decides which one a family meets first.
          </div>
        </div>
      </div>

      {event.dateMismatch && (
        <div className="banner b-amber">
          <span className="dot d-warn" />
          <span>
            The story text names a different day from the one this row is filed under
            ({fmtMonthDay(monthDay)}). One of the two is wrong — worth checking before it goes out.
          </span>
        </div>
      )}

      {/* Provenance, and — while it is still a proposal — the two verbs that
          resolve it (D10, R4.9). Kept visible after accepting, so a later visit
          can tell what was verified from what was merely typed. */}
      {event.source_url && (
        <div className="panel" style={{ padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className={`chip ${event.candidate ? 'chip-amber' : 'chip-green'}`}>
            {event.candidate ? 'Proposed · unreviewed' : 'Sourced'}
          </span>
          <a href={event.source_url} target="_blank" rel="noreferrer noopener" style={{ fontSize: 11.5 }}>
            {event.source_title || 'the source'} ↗
          </a>
          <span className="note" style={{ flex: 1, minWidth: 160 }}>
            Check the year and the day against it before this goes out.
          </span>
          {event.candidate && (
            <CandidateVerbs kind="event" id={event.id} onChanged={onChanged} onError={onError} />
          )}
        </div>
      )}
      {event.candidate && !event.source_url && (
        <div className="banner b-red">
          <span className="dot d-red" />
          <span>
            <b>Proposed with no usable source.</b> The search could not be traced back to a page, so nothing
            here is checkable. Verify it yourself, or reject it.
          </span>
          <CandidateVerbs kind="event" id={event.id} onChanged={onChanged} onError={onError} />
        </div>
      )}

      <div className="fgroup">
        <div className="flbl">
          <span className="kick">Headline</span>
          <RewriteButton
            subject={{ kind: 'month_day', key: monthDay }}
            fieldPath={`event.${event.id}.headline`}
            current={local.headline}
            context={`On This Day, ${fmtMonthDay(monthDay)} ${fmtYear(event.year)}`}
            job={jobForField(rewrites, `event.${event.id}.headline`)}
            onStarted={onJobsChanged}
            onError={onError}
          />
        </div>
        <input className="field serif" style={{ fontSize: 18, fontWeight: 600 }} placeholder="What happened"
          value={local.headline} onChange={(e) => set('headline')(e.target.value)} />
        <FieldReview jobs={rewrites} fieldPath={`event.${event.id}.headline`}
          onAccept={set('headline')} onResolved={onJobsChanged} />
      </div>

      <div className="fgroup">
        <div className="flbl">
          <span className="kick">The story a child reads</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="note">{wordCount(local.story)} words</span>
            <RewriteButton
              subject={{ kind: 'month_day', key: monthDay }}
              fieldPath={`event.${event.id}.story`}
              current={local.story}
              context={`On This Day, ${fmtMonthDay(monthDay)} ${fmtYear(event.year)}: ${local.headline}`}
              job={jobForField(rewrites, `event.${event.id}.story`)}
              onStarted={onJobsChanged}
              onError={onError}
            />
          </span>
        </div>
        <textarea className="field" rows={5} placeholder="For a child of seven…"
          value={local.story} onChange={(e) => set('story')(e.target.value)} />
        <FieldReview jobs={rewrites} fieldPath={`event.${event.id}.story`}
          onAccept={set('story')} onResolved={onJobsChanged} />
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="fgroup" style={{ width: 120, flex: '0 0 120px' }}>
          <span className="kick">Year</span>
          <input className="field serif" style={{ fontSize: 15, fontWeight: 600 }} inputMode="numeric"
            value={local.year} onChange={(e) => set('year')(e.target.value)} />
        </div>

        <div className="fgroup" style={{ flex: 1, minWidth: 220 }}>
          <div className="flbl"><span className="kick">Where</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <input className="field" style={{ flex: 1 }} placeholder="Lisbon, Portugal — or leave blank"
              value={local.location} onChange={(e) => set('location')(e.target.value)} />
            {iso2
              ? <span className="iso">{flagEmoji(iso2)} {iso2}</span>
              : <span className="iso iso-none">—</span>}
          </div>
          <div className="note">
            {iso2
              ? 'This earns a child the flag seal for that country.'
              : local.location
                ? `“${local.location}” resolves to no country, so no flag seal is awarded.`
                : 'No country, so no flag seal — correct for something that happened in the sky.'}
          </div>
        </div>

        <div className="fgroup">
          <div className="flbl"><span className="kick">Painting</span></div>
          <SlotOpener
            slot={historySlot(event.year, event.position)}
            subject={{ kind: 'month_day', key: monthDay }}
            imageUrl={event.image_url}
            scene={scene}
            context={`On This Day · ${fmtMonthDay(monthDay)} ${fmtYear(event.year)}`}
            width={150}
            height={84}
            emptyText={scene ? 'prompt written' : 'no painting'}
            onChanged={onChanged}
          />
        </div>
      </div>

      <hr className="hair" />

      <div className="panel" style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
        <button
          className={`sw${event.published ? ' on' : ''}`}
          disabled={pending}
          aria-label={event.published ? 'Shown to families' : 'Not shown to families'}
          onClick={() => start(async () => {
            const r = await setEventPublished(event.id, !event.published);
            if (!r.ok) onError(r.error ?? 'Could not change that event.'); else onChanged();
          })}
        />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: 'var(--brown)' }}>
            <b>{event.published ? 'Shown to families' : 'Not shown to families'}</b>
          </div>
          <div className="note">
            Per event, not per year. A draft event renders as if it did not exist.
          </div>
        </div>
        <button className="btn btn-sm btn-red" disabled={pending}
          onClick={() => start(async () => {
            const r = await deleteEvent(event.id);
            if (!r.ok) onError(r.error ?? 'Could not delete.'); else onChanged();
          })}>
          Delete this event
        </button>
      </div>
    </>
  );
}

// ── Greatest Moments ─────────────────────────────────────────────────────────

function MomentLadder({ day, rewrites, onJobsChanged, onChanged, onError }: {
  day: AlmanacDay; rewrites: RewriteJob[]; onJobsChanged: () => void;
  onChanged: () => void; onError: (m: string) => void;
}) {
  const [pending, start] = useTransition();
  const [openId, setOpenId] = useState<number | null>(null);
  const [order, setOrder] = useState(day.moments.map((m) => m.id));

  const serverOrder = day.moments.map((m) => m.id).join(',');
  const [lastOrder, setLastOrder] = useState(serverOrder);
  if (serverOrder !== lastOrder) { setLastOrder(serverOrder); setOrder(day.moments.map((m) => m.id)); }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = new Map(day.moments.map((m) => [m.id, m]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as AlmanacMoment[];
  const ranks = ordered.map((_, i) => day.moments.map((m) => m.rank).sort((a, b) => a - b)[i]);
  const free = 10 - day.moments.length;

  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(Number(active.id));
    const to = order.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(order, from, to);
    setOrder(next);
    start(async () => {
      const res = await reorderMoments(day.monthDay, next);
      if (!res.ok) { onError(res.error ?? 'Could not re-rank.'); setOrder(day.moments.map((m) => m.id)); }
      else onChanged();
    });
  };

  const add = () => start(async () => {
    const res = await createMoment(day.monthDay);
    if (!res.ok) { onError(res.error); return; }
    setOpenId(res.id);
    onChanged();
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>
            Greatest Moments · {fmtMonthDay(day.monthDay)}
          </div>
          <div className="kick" style={{ marginTop: 4 }}>All of history · rank is the order a family reads them in</div>
        </div>
        <span className={`chip ${day.moments.length === 10 ? 'chip-green' : 'chip-amber'}`}>
          {day.moments.length} of 10
        </span>
      </div>

      <div className="note">
        Click a rung to open it. Ranks are unique, so dragging one takes its neighbour&rsquo;s rank rather
        than leaving a hole — and a partial ladder renders perfectly: five moments means five.
      </div>

      {day.moments.length > 0 && (
        <DndContext id="alm-moments" sensors={sensors} collisionDetection={closestCenter}
          onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {ordered.map((m, i) => (
                <MomentRung
                  key={m.id}
                  monthDay={day.monthDay}
                  moment={m}
                  displayRank={ranks[i] ?? m.rank}
                  scene={day.scenes[`moment:${m.rank}`] ?? ''}
                  rewrites={rewrites}
                  onJobsChanged={onJobsChanged}
                  open={openId === m.id}
                  onToggle={() => setOpenId((o) => (o === m.id ? null : m.id))}
                  onChanged={onChanged}
                  onError={onError}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="panel rung" style={{ borderStyle: 'dashed', background: 'transparent' }}>
        <span className="grip" style={{ opacity: 0.3 }}>⋮⋮</span>
        <span className="rank empty">{day.moments.length + 1 <= 10 ? day.moments.length + 1 : '—'}</span>
        <div style={{ flex: 1 }} className="note">
          {free > 0
            ? `${free} free rank${free === 1 ? '' : 's'}. Anything you add lands after the ${day.moments.length} you have.`
            : 'All ten ranks are filled — the reader renders no more.'}
        </div>
        <button className="btn btn-sm" onClick={add} disabled={pending || free <= 0}>Write one</button>
      </div>
    </>
  );
}

function MomentRung({
  monthDay, moment, displayRank, scene, rewrites, onJobsChanged, open, onToggle, onChanged, onError,
}: {
  monthDay: string; moment: AlmanacMoment; displayRank: number; open: boolean;
  scene: string; rewrites: RewriteJob[]; onJobsChanged: () => void;
  onToggle: () => void; onChanged: () => void; onError: (m: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: moment.id });
  const [pending, start] = useTransition();
  const [local, setLocal] = useState({
    headline: moment.headline ?? '', story: moment.story ?? '',
    image_url: moment.image_url ?? '', year: String(moment.year),
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const key = `${moment.id}:${moment.headline}:${moment.story}:${moment.image_url}:${moment.year}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setLocal({
      headline: moment.headline ?? '', story: moment.story ?? '',
      image_url: moment.image_url ?? '', year: String(moment.year),
    });
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const set = useCallback((k: keyof typeof local) => (value: string) => {
    setLocal((l) => ({ ...l, [k]: value }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const payload = k === 'year' ? { year: Number(value) } : { [k]: value };
      void saveMoment(moment.id, payload).then((r) => {
        if (!r.ok) onError(r.error ?? 'Could not save.');
      });
    }, 800);
  }, [moment.id, onError]);

  const style = { transform: dndCSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style}>
      <div className={`panel${open ? ' open' : ''}`} style={open ? { padding: 0, overflow: 'hidden' } : undefined}>
        <div className="rung" style={open ? { background: 'var(--gold-soft)' } : undefined}>
          <span ref={setActivatorNodeRef} className="grip" {...attributes} {...listeners}>⋮⋮</span>
          <span className="rank">{displayRank}</span>
          {!open && (
            <div className={`art${local.image_url ? '' : ' art-empty'}`}
              style={{
                width: 74, height: 50, flex: '0 0 74px',
                backgroundImage: local.image_url ? `url(${local.image_url})` : undefined,
              }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="serif" style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.3 }}>
              {local.headline || <i>Untitled moment</i>}
            </div>
            {open
              ? <div className="kick" style={{ marginTop: 4, color: 'var(--gold-deep)' }}>Open for editing</div>
              : local.story && <div className="note" style={{ marginTop: 3 }}>{local.story.slice(0, 110)}{local.story.length > 110 ? '…' : ''}</div>}
          </div>
          {!open && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
              <span className="chip chip-ink">{fmtYear(moment.year)}</span>
              <span className={`chip ${moment.published ? 'chip-green' : 'chip-amber'}`}>
                {moment.published ? 'Live' : 'Draft'}
              </span>
            </div>
          )}
          <button className="btn btn-sm btn-ghost" onClick={onToggle}>{open ? 'Close' : 'Open'}</button>
        </div>

        {open && (
          <>
            <hr className="hair" style={{ margin: 0 }} />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="fgroup" style={{ width: 120, flex: '0 0 120px' }}>
                  <span className="kick">Year</span>
                  <input className="field serif" style={{ fontSize: 15, fontWeight: 600 }}
                    value={local.year} onChange={(e) => set('year')(e.target.value)} />
                  <span className="note">BC is negative: −411</span>
                </div>
                <div className="fgroup" style={{ flex: 1, minWidth: 240 }}>
                  <div className="flbl">
                    <span className="kick">Headline</span>
                    <RewriteButton
                      subject={{ kind: 'month_day', key: monthDay }}
                      fieldPath={`moment.${moment.id}.headline`}
                      current={local.headline}
                      context={`Greatest Moments, ${fmtMonthDay(monthDay)} ${fmtYear(moment.year)}`}
                      job={jobForField(rewrites, `moment.${moment.id}.headline`)}
                      onStarted={onJobsChanged}
                      onError={onError}
                    />
                  </div>
                  <input className="field serif" style={{ fontSize: 15, fontWeight: 600 }}
                    value={local.headline} onChange={(e) => set('headline')(e.target.value)} />
                </div>
              </div>
              <FieldReview jobs={rewrites} fieldPath={`moment.${moment.id}.headline`}
                onAccept={set('headline')} onResolved={onJobsChanged} />

              {moment.source_url && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  <span className="chip chip-green">Sourced</span>
                  <a href={moment.source_url} target="_blank" rel="noreferrer noopener" style={{ fontSize: 11.5 }}>
                    {moment.source_title || 'the source'} ↗
                  </a>
                  <span className="note">Check the year against it — that is what drifts.</span>
                </div>
              )}

              <div className="fgroup">
                <div className="flbl">
                  <span className="kick">The story a child reads</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="note">{wordCount(local.story)} words</span>
                    <RewriteButton
                      subject={{ kind: 'month_day', key: monthDay }}
                      fieldPath={`moment.${moment.id}.story`}
                      current={local.story}
                      context={`Greatest Moments, ${fmtMonthDay(monthDay)} ${fmtYear(moment.year)}: ${local.headline}`}
                      job={jobForField(rewrites, `moment.${moment.id}.story`)}
                      onStarted={onJobsChanged}
                      onError={onError}
                    />
                  </span>
                </div>
                <textarea className="field" rows={4} value={local.story}
                  onChange={(e) => set('story')(e.target.value)} />
                <FieldReview jobs={rewrites} fieldPath={`moment.${moment.id}.story`}
                  onAccept={set('story')} onResolved={onJobsChanged} />
              </div>

              <div className="fgroup">
                <div className="flbl"><span className="kick">Painting</span></div>
                <SlotOpener
                  slot={momentSlot(moment.rank)}
                  subject={{ kind: 'month_day', key: monthDay }}
                  imageUrl={moment.image_url}
                  scene={scene}
                  context={`Greatest Moments · rank ${displayRank}`}
                  width={150}
                  height={84}
                  emptyText={scene ? 'prompt written' : 'no painting'}
                  onChanged={onChanged}
                />
                <div className="note">
                  Also shown as a 46-pixel thumbnail in the ladder a family reads, so it has to survive
                  being tiny.
                </div>
              </div>

              <hr className="hair" />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button className={`sw${moment.published ? ' on' : ''}`} disabled={pending}
                  aria-label={moment.published ? 'Shown to families' : 'Not shown to families'}
                  onClick={() => start(async () => {
                    const r = await setMomentPublished(moment.id, !moment.published);
                    if (!r.ok) onError(r.error ?? 'Could not change that moment.'); else onChanged();
                  })} />
                <span className="note" style={{ flex: 1, minWidth: 200 }}>
                  {moment.published ? 'Shown to families.' : 'Draft — renders as if it did not exist.'}{' '}
                  Everything here is editable, whether you wrote it or accepted it from a proposal.
                </span>
                <button className="btn btn-sm btn-red" disabled={pending}
                  onClick={() => start(async () => {
                    const r = await deleteMoment(moment.id);
                    if (!r.ok) onError(r.error ?? 'Could not delete.'); else onChanged();
                  })}>
                  Delete this moment
                </button>
                <button className="btn btn-sm btn-gold" onClick={onToggle}>Done</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Review pieces ────────────────────────────────────────────────────────────

/** The CURRENT / AI-PROPOSES panel for one field, when a proposal is waiting. */
function FieldReview({ jobs, fieldPath, onAccept, onResolved }: {
  jobs: RewriteJob[]; fieldPath: string; onAccept: (v: string) => void; onResolved: () => void;
}) {
  const job = jobForField(jobs, fieldPath);
  if (!job || job.state === 'running') return null;
  return <RewriteReview job={job} onAccept={onAccept} onResolved={onResolved} />;
}

/**
 * Keep or reject, beside the source they are a judgement about.
 *
 * An event is not repositioned when it is kept — On This Day has no ceiling and
 * `position` only orders one year's list — so accepting here is publishing plus
 * the review stamp. The stamp is what stops it reading as unreviewed for ever.
 */
function CandidateVerbs({ kind, id, onChanged, onError }: {
  kind: 'event' | 'moment'; id: number; onChanged: () => void; onError: (m: string) => void;
}) {
  const [pending, start] = useTransition();
  return (
    <span style={{ display: 'flex', gap: 7 }}>
      <button className="btn btn-sm btn-gold" disabled={pending}
        onClick={() => start(async () => {
          const r = await acceptCandidate(kind, id);
          if (!r.ok) onError(r.error ?? 'Could not keep it.'); else onChanged();
        })}>
        Keep it
      </button>
      <button className="btn btn-sm btn-red" disabled={pending}
        onClick={() => start(async () => {
          const r = await rejectCandidate(kind, id);
          if (!r.ok) onError(r.error ?? 'Could not reject it.'); else onChanged();
        })}>
        Reject
      </button>
    </span>
  );
}

/** A count of what is waiting, with one verb for clearing the lot. */
function CandidateStrip({ kind, count, monthDay, blurb, onChanged, onError }: {
  kind: 'event' | 'moment'; count: number; monthDay: string; blurb: string;
  onChanged: () => void; onError: (m: string) => void;
}) {
  return (
    <div className="banner b-amber" style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
      <span className="dot d-warn" />
      <span style={{ flex: 1, minWidth: 220 }}>
        <b>{count} proposed {count === 1 ? 'event' : 'events'} awaiting review.</b> {blurb}
      </span>
      <RejectAll kind={kind} monthDay={monthDay} onChanged={onChanged} onError={onError} />
    </div>
  );
}

function RejectAll({ kind, monthDay, onChanged, onError }: {
  kind: 'event' | 'moment'; monthDay: string; onChanged: () => void; onError: (m: string) => void;
}) {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-sm btn-ghost" disabled={pending}
      onClick={() => start(async () => {
        const r = await rejectAllCandidates(kind, monthDay);
        if (!r.ok) onError(r.error ?? 'Could not clear these.'); else onChanged();
      })}>
      Reject all
    </button>
  );
}
