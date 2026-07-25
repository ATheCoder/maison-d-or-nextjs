'use client';
/**
 * The Daily Gold desk (Phase 4) — "what is missing, and what is missing
 * soonest". Interactive shell only; the server page loads the data.
 *
 * Two keying schemes share this screen and are kept visually apart on purpose
 * (§2.1): the dates table is perishable content pinned to a calendar date, the
 * almanac grid is content that recurs every year. Editing 25 July in the
 * almanac changes every 25 July, forever — so it gets its own panel, its own
 * legend and its own copy saying so.
 *
 * Every verb here creates or navigates. Generation lives inside a day's editor,
 * where its cost is visible (§8.2).
 */
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  deleteEditionRow, prepareDate, prepareWeek,
  type AlmanacCell, type DeskCoverage, type DuplicateEdition, type WeekDay,
} from '@/app/admin/daily-gold/actions';
import { flagEmoji } from '@/lib/countries';

const CSS = `
.dgd {
  --ground:#f5f0e7; --panel-t:rgba(255,248,238,.82);
  --line:rgba(201,169,110,.25); --line2:rgba(201,169,110,.45);
  --ink:#241a0c; --brown:#5c4a2a; --brown2:#8b7355; --brown3:#a08a63;
  --gold:#c9a96e; --gold-deep:#a8843f; --gold-soft:rgba(201,169,110,.14);
  --green:#7d8a4e; --amber:#c08a2e; --red:#b5533a;
  --serif:"Playfair Display",Georgia,serif; --sans:"Lato",system-ui,sans-serif;
  --noise:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.05'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
  min-height:100vh; font-family:var(--sans); color:var(--ink); -webkit-font-smoothing:antialiased;
  background: var(--noise), radial-gradient(ellipse 120% 80% at 50% -10%, rgba(201,169,110,.10), transparent 55%), var(--ground);
}
.dgd * { box-sizing:border-box; }
.dgd .wrap { max-width:1340px; margin:0 auto; padding:40px 40px 72px; display:flex; flex-direction:column; gap:20px; }
.dgd .serif { font-family:var(--serif); }
.dgd .kick { font:700 10px/1.4 var(--sans); letter-spacing:.26em; text-transform:uppercase; color:var(--gold-deep); }
.dgd .muted { color:var(--brown2); }
.dgd .h2 { font-family:var(--serif); font-size:19px; font-weight:600; }
.dgd .note { font-size:11.5px; color:var(--brown2); line-height:1.6; }
.dgd .panel { background:var(--panel-t); border:1px solid var(--line); border-radius:16px; box-shadow:0 2px 18px rgba(40,26,12,.05); }
.dgd a { color:var(--gold-deep); text-decoration:none; }
.dgd a:hover { color:var(--ink); text-decoration:underline; }

.dgd .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; font:700 12px/1 var(--sans); letter-spacing:.02em; padding:10px 15px; border-radius:9px; border:1px solid var(--line2); background:#fffdf8; color:var(--brown); cursor:pointer; transition:transform .1s ease; }
.dgd .btn:hover { transform:translateY(-1px); }
.dgd .btn:disabled { opacity:.5; cursor:default; transform:none; }
.dgd .btn-gold { background:linear-gradient(180deg,#dcc191,#c9a96e); color:#3a2a10; border-color:var(--gold-deep); box-shadow:0 1px 0 rgba(255,255,255,.5) inset, 0 6px 16px rgba(168,132,63,.28); }
.dgd .btn-ghost { background:transparent; border-color:transparent; color:var(--brown2); }
.dgd .btn-sm { padding:7px 11px; font-size:11px; border-radius:8px; }

.dgd .chip { display:inline-flex; align-items:center; gap:6px; font:700 10px/1 var(--sans); letter-spacing:.06em; text-transform:uppercase; padding:5px 9px; border-radius:999px; border:1px solid var(--line2); color:var(--brown); background:#fffdf8; white-space:nowrap; }
.dgd .chip-gold { background:var(--gold-soft); border-color:var(--line2); color:var(--gold-deep); }
.dgd .chip-green { background:rgba(125,138,78,.14); border-color:rgba(125,138,78,.4); color:#5f6c37; }
.dgd .chip-amber { background:rgba(192,138,46,.14); border-color:rgba(192,138,46,.42); color:#96681f; }
.dgd .chip-red { background:rgba(181,83,58,.12); border-color:rgba(181,83,58,.42); color:#96402b; }
.dgd .chip-ink { background:rgba(36,26,12,.06); border:1px solid var(--line); color:var(--brown); text-transform:none; letter-spacing:0; font-weight:400; }
.dgd .mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }

.dgd .dot { width:9px; height:9px; border-radius:50%; flex:0 0 auto; display:inline-block; }
.dgd .d-red { background:var(--red); box-shadow:0 0 0 2px rgba(181,83,58,.2); }
.dgd .d-warn { background:var(--amber); box-shadow:0 0 0 2px rgba(192,138,46,.2); }
.dgd .d-done { background:var(--green); box-shadow:0 0 0 2px rgba(125,138,78,.2); }
.dgd .d-part { background:var(--gold); box-shadow:0 0 0 2px rgba(201,169,110,.25); }
.dgd .d-empty { background:rgba(92,74,42,.18); }

.dgd .banner { display:flex; align-items:center; gap:12px; padding:13px 17px; border-radius:13px; font-size:13px; line-height:1.55; }
.dgd .b-red { background:rgba(181,83,58,.08); border:1px solid rgba(181,83,58,.35); color:#7d3a26; }
.dgd .b-amber { background:rgba(192,138,46,.09); border:1px solid rgba(192,138,46,.38); color:#7a5518; }
.dgd .b-green { background:rgba(125,138,78,.1); border:1px solid rgba(125,138,78,.38); color:#4f5a2e; }

.dgd .statrow { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.dgd .stat { padding:15px 18px; display:flex; flex-direction:column; gap:4px; }
.dgd .stat .num { font-family:var(--serif); font-size:30px; font-weight:600; line-height:1; color:var(--ink); }
.dgd .stat .num.warn { color:var(--gold-deep); }
.dgd .stat .lbl { font-size:11.5px; color:var(--brown2); }

.dgd .week { display:grid; grid-template-columns:repeat(7,1fr); gap:10px; }
.dgd .day { padding:13px; display:flex; flex-direction:column; gap:10px; }
.dgd .day.today { border-color:var(--amber); box-shadow:0 0 0 3px rgba(192,138,46,.16); }
.dgd .daynum { font-family:var(--serif); font-size:17px; font-weight:600; }
.dgd .slots { display:flex; flex-direction:column; gap:5px; }
.dgd .slotrow { display:flex; align-items:center; gap:7px; font-size:11px; color:var(--brown2); }
.dgd .slotrow .nm { flex:1; }
.dgd .slotrow b { color:var(--brown); font-weight:700; }

.dgd .tbl { width:100%; border-collapse:collapse; font-size:13px; }
.dgd .tbl th { text-align:left; font:700 9.5px/1 var(--sans); letter-spacing:.16em; text-transform:uppercase; color:var(--brown3); padding:0 12px 10px; }
.dgd .tbl td { padding:11px 12px; border-top:1px solid var(--line); color:var(--brown); vertical-align:middle; }
.dgd .tbl tr:hover td { background:rgba(201,169,110,.06); }
.dgd .iso { display:inline-flex; align-items:center; gap:5px; font:700 11px/1 var(--sans); letter-spacing:.08em; padding:5px 8px; border-radius:7px; background:var(--gold-soft); border:1px solid var(--line2); color:var(--gold-deep); }
.dgd .iso-none { background:rgba(181,83,58,.08); border-color:rgba(181,83,58,.3); color:#96402b; }
.dgd .two { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.dgd .src { background:#fffdf8; border:1px solid var(--line); border-radius:9px; padding:9px 11px; font-size:12px; }

.dgd .calgrid { display:grid; grid-template-columns:52px repeat(31,minmax(0,1fr)); gap:4px; align-items:center; }
.dgd .mlabel { font:700 11px/1 var(--sans); letter-spacing:.12em; text-transform:uppercase; color:var(--brown); text-align:right; padding:0 10px 0 0; }
.dgd .dhead { font:700 9.5px/1 var(--sans); color:var(--brown3); text-align:center; padding-bottom:6px; }
.dgd .cell { height:22px; border-radius:5px; cursor:pointer; transition:transform .1s ease; border:none; padding:0; width:100%; display:block; }
.dgd .cell:hover { transform:translateY(-1px) scale(1.06); }
.dgd .c-full { background:linear-gradient(180deg,#d8bd86,#c9a96e); box-shadow:0 1px 0 rgba(255,255,255,.35) inset, 0 1px 4px rgba(168,132,63,.22); }
.dgd .c-part { background:repeating-linear-gradient(135deg, rgba(201,169,110,.34) 0 4px, rgba(201,169,110,.12) 4px 8px); border:1px solid var(--line2); }
.dgd .c-empty { background:rgba(92,74,42,.05); border:1px solid rgba(201,169,110,.16); }
.dgd .c-empty:hover { border-color:var(--gold-deep); background:var(--gold-soft); }
.dgd .c-na { background:transparent; cursor:default; }
.dgd .c-na:hover { transform:none; }
.dgd .c-today { background:#fffdf8; border:1.5px solid var(--amber); box-shadow:0 0 0 3px rgba(192,138,46,.18); }

.dgd .legend { display:flex; align-items:center; gap:15px; flex-wrap:wrap; }
.dgd .lgi { display:flex; align-items:center; gap:7px; font-size:11px; color:var(--brown2); }
.dgd .swatch { width:15px; height:15px; border-radius:4px; flex:0 0 auto; }
.dgd .seg { display:inline-flex; padding:3px; background:rgba(36,26,12,.06); border:1px solid var(--line); border-radius:10px; gap:2px; }
.dgd .seg > button { font:700 11px/1 var(--sans); letter-spacing:.04em; padding:8px 13px; border-radius:7px; color:var(--brown2); cursor:pointer; white-space:nowrap; border:none; background:transparent; }
.dgd .seg > button.on { background:#fffdf8; color:var(--ink); box-shadow:0 1px 6px rgba(40,26,12,.1); }
.dgd .field { background:#fffdf8; border:1px solid var(--line2); border-radius:10px; color:var(--ink); font:400 13px/1 var(--sans); }
.dgd .search { display:flex; align-items:center; gap:9px; padding:0 13px; height:40px; width:210px; }
.dgd .search input { border:none; outline:none; background:transparent; font:400 13px/1 var(--sans); color:var(--ink); width:100%; }

@media (max-width:1100px) {
  .dgd .week { grid-template-columns:repeat(4,1fr); }
  .dgd .statrow { grid-template-columns:1fr; }
}
`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Dates are parsed as UTC midnight throughout: 'YYYY-MM-DD' parsed as local
// time shifts a day backwards west of Greenwich, which would put the desk's
// "today" on the wrong date for half the world.
const parse = (date: string) => new Date(`${date}T00:00:00Z`);
const fmtShort = (date: string) => {
  const d = parse(date);
  return `${WEEKDAY[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
const fmtLong = (date: string) => {
  const d = parse(date);
  return `${WEEKDAY_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]}`;
};
const fmtDayNum = (date: string) => {
  const d = parse(date);
  return `${WEEKDAY[d.getUTCDay()]} ${d.getUTCDate()}`;
};

/** Whole days from `today` to `date` — negative for the past. */
function dayGap(date: string, today: string): number {
  return Math.round((parse(date).getTime() - parse(today).getTime()) / 86400000);
}

function relativeLabel(date: string, today: string): string {
  const n = dayGap(date, today);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n > 1) return `in ${n} days`;
  const ago = -n;
  if (ago < 14) return `${ago} days ago`;
  if (ago < 60) return `${Math.round(ago / 7)} weeks ago`;
  return `${Math.round(ago / 30)} months ago`;
}

type Filter = 'all' | 'live' | 'draft' | 'work';

export default function DailyGoldDesk({ coverage, week, duplicates, credit, today }: {
  coverage: DeskCoverage;
  week: WeekDay[];
  duplicates: DuplicateEdition[];
  credit: number | null;
  today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [prepareResult, setPrepareResult] = useState<string | null>(null);

  const todayRow = week[0];
  const readyThisWeek = week.filter((d) => d.status === 'ready').length;
  const dupeDates = new Set(duplicates.map((d) => d.date));

  const rows = useMemo(() => coverage.dates.filter((d) => {
    if (filter === 'live' && d.status !== 'ready') return false;
    if (filter === 'draft' && d.status !== 'draft') return false;
    if (filter === 'work') {
      const needsWork = d.status !== 'ready' || dupeDates.has(d.date)
        || (d.publishedNews > 0 && !d.leadHasImage) || !d.destination;
      if (!needsWork) return false;
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!d.date.includes(q) && !(d.destination ?? '').toLowerCase().includes(q)
        && !fmtShort(d.date).toLowerCase().includes(q)) return false;
    }
    return true;
  }), [coverage.dates, filter, query, dupeDates]);

  const runPrepareWeek = () => start(async () => {
    const res = await prepareWeek(today);
    if (!res.ok) { setPrepareResult(res.error); return; }
    // R2.5: say exactly what happened, including what was left alone.
    const created = res.created.length;
    const skipped = res.skipped.map((d) => fmtShort(d));
    setPrepareResult(
      created === 0
        ? 'Every one of the next seven days already has an edition — nothing created.'
        : `${created} draft${created === 1 ? '' : 's'} created${skipped.length ? ` — ${skipped.join(', ')} already had one.` : '.'}`,
    );
    router.refresh();
  });

  const openDate = (date: string) => start(async () => { await prepareDate(date); });

  return (
    <div className="dgd">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">

        {/* ── Masthead ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div className="kick">Daily Gold Edition · Admin</div>
            <div className="serif" style={{ fontSize: 34, fontWeight: 600, marginTop: 8, letterSpacing: '-.01em' }}>
              The Daily Gold desk
            </div>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 7 }}>
              <b style={{ color: 'var(--brown)' }}>{coverage.liveDates}</b> date{coverage.liveDates === 1 ? '' : 's'} live
              {' · '}
              {todayRow?.status === 'ready'
                ? <b style={{ color: 'var(--green)' }}>today is live</b>
                : <b style={{ color: 'var(--gold-deep)' }}>nothing for today</b>}
              {coverage.newestLiveDate && <>
                {' · '}newest edition <b style={{ color: 'var(--brown)' }}>{fmtShort(coverage.newestLiveDate)}</b>,{' '}
                {relativeLabel(coverage.newestLiveDate, today)}
              </>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {credit != null && (
                <span className="chip chip-ink mono" title="OpenRouter balance">
                  ${credit.toFixed(2)} credit
                </span>
              )}
              <button className="btn btn-ghost" onClick={runPrepareWeek} disabled={pending}>
                Prepare next 7 days
              </button>
              <button className="btn btn-gold" style={{ padding: '11px 17px' }}
                onClick={() => openDate(today)} disabled={pending}>
                {todayRow?.status ? 'Open today' : 'Prepare today'}
              </button>
            </div>
            <div className="note" style={{ textAlign: 'right', maxWidth: 440 }}>
              Prepare creates empty drafts and never writes anything. Drafting a day happens inside
              that day&rsquo;s editor, where the cost is visible.
            </div>
          </div>
        </div>

        {prepareResult && (
          <div className="banner b-green">
            <span className="dot d-done" />
            <span>{prepareResult}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}
              onClick={() => setPrepareResult(null)}>Dismiss</button>
          </div>
        )}

        {/* ── Today's alarm ────────────────────────────────────────── */}
        {todayRow && <TodayAlarm row={todayRow} today={today} onPrepare={() => openDate(today)} pending={pending} />}

        {/* ── Stat tiles ───────────────────────────────────────────── */}
        <div className="statrow">
          <div className="panel stat">
            <span className="kick" style={{ color: 'var(--brown)' }}>Live to families</span>
            <span className="num">{coverage.liveDates}</span>
            <span className="lbl">dates a family can open</span>
          </div>
          <div className="panel stat" style={readyThisWeek === 0
            ? { background: 'rgba(181,83,58,.06)', borderColor: 'rgba(181,83,58,.3)' }
            : undefined}>
            <span className="kick" style={{ color: readyThisWeek === 0 ? '#96402b' : 'var(--brown)' }}>
              Next seven days ready
            </span>
            <span className="num" style={{ color: readyThisWeek === 0 ? '#96402b' : undefined }}>
              {readyThisWeek} <span className="muted" style={{ fontSize: 15 }}>/ 7</span>
            </span>
            <span className="lbl">the only number with a deadline attached</span>
          </div>
          <div className="panel stat" style={{ background: 'var(--gold-soft)', borderColor: 'var(--line2)' }}>
            <span className="kick">Almanac days covered</span>
            <span className="num warn">
              {coverage.almanacDaysCovered} <span className="muted" style={{ fontSize: 15 }}>/ 366</span>
            </span>
            <span className="lbl">On&nbsp;This&nbsp;Day and Greatest&nbsp;Moments recur every year</span>
          </div>
        </div>

        {/* ── The week ahead ───────────────────────────────────────── */}
        <div className="panel" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 15, flexWrap: 'wrap' }}>
            <div>
              <div className="kick">The week ahead · what a family will see</div>
              <div className="h2" style={{ marginTop: 6 }}>Seven days, five columns each</div>
            </div>
            <div className="legend">
              <span className="lgi"><span className="dot d-done" />Live</span>
              <span className="lgi"><span className="dot d-part" />Draft</span>
              <span className="lgi"><span className="dot d-empty" />Absent</span>
            </div>
          </div>

          <div className="week">
            {week.map((d, i) => (
              <WeekCell key={d.date} d={d} index={i} pending={pending} onOpen={() => openDate(d.date)} />
            ))}
          </div>

          <div className="note" style={{ marginTop: 13 }}>
            Born&nbsp;Today, On&nbsp;This&nbsp;Day and Moments are keyed to the month-day, so they are the
            same every year — they are shown here because a family sees them on this date, but they are
            edited in the <Link href={`/admin/daily-gold/almanac/${today.slice(5)}`}>almanac</Link> and the{' '}
            <Link href="/admin/people">people library</Link>.
          </div>
        </div>

        {/* ── Dates with content ───────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 12, flexWrap: 'wrap' }}>
          <div className="h2">Dates with content</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="field search">
              <span className="muted" style={{ fontSize: 13 }}>⌕</span>
              <input placeholder="Jump to a date…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="seg">
              {([['all', 'All'], ['live', 'Live'], ['draft', 'Drafts'], ['work', 'Needs work']] as const).map(([k, label]) => (
                <button key={k} className={filter === k ? 'on' : undefined} onClick={() => setFilter(k)}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: '16px 12px 6px' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 150 }}>Date</th>
                <th>Destination</th>
                <th style={{ width: 112 }}>Edition</th>
                <th style={{ width: 172 }}>Good news</th>
                <th style={{ width: 120 }}>Flag seal</th>
                <th style={{ width: 92 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <DateRow key={d.date} d={d} today={today} duplicated={dupeDates.has(d.date)} />
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ padding: '22px 12px', fontStyle: 'italic' }}>
                  No dates match.
                </td></tr>
              )}
            </tbody>
          </table>

          {duplicates.map((dup) => (
            <DuplicateBanner key={dup.date} dup={dup} onResolved={() => router.refresh()} />
          ))}
        </div>

        {/* ── Almanac coverage ─────────────────────────────────────── */}
        <AlmanacGrid cells={coverage.almanac} today={today} />

        {/* ── Flag codes nudge ─────────────────────────────────────── */}
        {coverage.peopleMissingCountryCode > 0 && (
          <div className="panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span className="iso iso-none">??</span>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 13, color: 'var(--brown)' }}>
                <b>{coverage.peopleMissingCountryCode} of your {coverage.peopleTotal} people have no country code.</b>{' '}
                Born&nbsp;Today then guesses the flag from free text, and a miss costs a child a flag seal silently.
              </div>
              <div className="note" style={{ marginTop: 3 }}>
                Set it once per person in the library — it is the field the flag resolver prefers over any name table.
              </div>
            </div>
            <Link className="btn btn-sm" href="/admin/people">Open the library</Link>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The loudest thing on the screen when today is empty — and R2.8's other half:
 * a past date with no edition is a fact, but *today* with no edition is urgent,
 * so this states what a family opening the page right now actually gets.
 */
function TodayAlarm({ row, today, onPrepare, pending }: {
  row: WeekDay; today: string; onPrepare: () => void; pending: boolean;
}) {
  const live = row.status === 'ready';
  const sections = [
    row.peopleCount > 0 && `${row.peopleCount} Born Today book${row.peopleCount === 1 ? '' : 's'}`,
    row.historyYears > 0 && `${row.historyYears} year${row.historyYears === 1 ? '' : 's'} of history`,
    row.momentsFilled > 0 && `${row.momentsFilled} of 10 moments`,
  ].filter(Boolean) as string[];
  const empty = 5 - (live ? 1 : 0) - (row.publishedNews > 0 ? 1 : 0) - sections.length;

  if (live && row.publishedNews > 0) {
    return (
      <div className="banner b-green">
        <span className="dot d-done" />
        <span>
          <b>Today, {fmtLong(today)}</b> — live, with {row.publishedNews} good-news{' '}
          {row.publishedNews === 1 ? 'story' : 'stories'}
          {sections.length ? ` and ${sections.join(', ')}` : ''}.
        </span>
        <Link className="btn btn-sm" style={{ marginLeft: 'auto' }} href={`/admin/daily-gold/${today}`}>Open today</Link>
      </div>
    );
  }

  return (
    <div className="banner b-red">
      <span className="dot d-red" />
      <span>
        <b>Today, {fmtLong(today)}</b> — {row.status === null ? 'no edition' : `edition is a ${row.status}`} and{' '}
        {row.publishedNews === 0 ? 'no good news' : `${row.publishedNews} good-news stories`}. A family opening
        Daily Gold right now sees the masthead
        {sections.length ? `, ${sections.join(', ')}` : ''}
        {empty > 0 ? `, and ${empty} empty column${empty === 1 ? '' : 's'}.` : '.'}
      </span>
      <button className="btn btn-sm btn-gold" style={{ marginLeft: 'auto' }} onClick={onPrepare} disabled={pending}>
        {row.status ? 'Open' : 'Prepare'} {fmtShort(today)}
      </button>
    </div>
  );
}

function slotDot(state: 'live' | 'draft' | 'empty') {
  return <span className={`dot ${state === 'live' ? 'd-done' : state === 'draft' ? 'd-part' : 'd-empty'}`} />;
}

function WeekCell({ d, index, pending, onOpen }: {
  d: WeekDay; index: number; pending: boolean; onOpen: () => void;
}) {
  const heading = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : WEEKDAY[parse(d.date).getUTCDay()];
  const editionState = d.status === 'ready' ? 'live' : d.status ? 'draft' : 'empty';

  return (
    <div className={`panel day${d.isToday ? ' today' : ''}`}>
      <div>
        <div className="kick" style={{ color: d.isToday ? 'var(--amber)' : 'var(--brown3)' }}>{heading}</div>
        <div className="daynum" style={{ marginTop: 3 }}>{fmtDayNum(d.date)}</div>
      </div>
      <div className="slots">
        <div className="slotrow">
          {slotDot(editionState)}<span className="nm">Edition</span><b>{d.status ?? 'none'}</b>
        </div>
        <div className="slotrow">
          {slotDot(d.publishedNews > 0 ? 'live' : d.draftNews > 0 ? 'draft' : 'empty')}
          <span className="nm">Good news</span>
          <b>{d.publishedNews > 0 ? d.publishedNews : d.draftNews > 0 ? `${d.draftNews} draft` : 'none'}</b>
        </div>
        <div className="slotrow">
          {slotDot(d.peopleCount > 0 ? 'live' : 'empty')}<span className="nm">Born today</span><b>{d.peopleCount}</b>
        </div>
        <div className="slotrow">
          {slotDot(d.historyYears > 0 ? 'live' : 'empty')}<span className="nm">On this day</span><b>{d.historyYears}</b>
        </div>
        <div className="slotrow">
          {slotDot(d.momentsFilled >= 10 ? 'live' : d.momentsFilled > 0 ? 'draft' : 'empty')}
          <span className="nm">Moments</span><b>{d.momentsFilled}/10</b>
        </div>
      </div>
      <button className={`btn btn-sm${d.isToday && !d.status ? ' btn-gold' : ''}`} onClick={onOpen} disabled={pending}>
        {d.status ? 'Continue' : 'Prepare'}
      </button>
    </div>
  );
}

function DateRow({ d, today, duplicated }: {
  d: DeskCoverage['dates'][number]; today: string; duplicated: boolean;
}) {
  const gap = dayGap(d.date, today);
  const isFuture = gap > 0;

  return (
    <tr>
      <td>
        <b style={{ color: 'var(--ink)' }}>{fmtShort(d.date)}</b>
        <div className="muted" style={{ fontSize: 11 }}>{relativeLabel(d.date, today)}</div>
      </td>
      <td>
        {d.destination
          ? d.destination
          : <span className="muted" style={{ fontStyle: 'italic' }}>no destination yet</span>}
      </td>
      <td>
        {duplicated ? <span className="chip chip-red">{d.editionCount} rows</span>
          : d.status === 'ready' ? <span className="chip chip-gold">Live</span>
          : d.status ? <span className="chip chip-amber">{d.status}</span>
          // R2.8 — absence in the past is a fact, not a failure.
          : <span className="chip chip-ink">{isFuture ? 'not prepared' : 'news only'}</span>}
      </td>
      <td>
        {d.publishedNews === 0 && d.draftNews === 0
          ? <span className="chip chip-ink">—</span>
          : d.publishedNews > 0 && !d.leadHasImage
            ? <span className="chip chip-amber">{d.publishedNews} · lead has no image</span>
            : d.publishedNews > 0
              ? <span className="chip chip-green">{d.publishedNews} stories</span>
              : <span className="chip chip-amber">{d.draftNews} draft</span>}
      </td>
      <td>
        {d.iso2
          ? <span className="iso">{flagEmoji(d.iso2)} {d.iso2}</span>
          : d.destination
            ? <span className="iso iso-none" title={`“${d.destination}” does not resolve`}>??</span>
            : <span className="chip chip-ink">—</span>}
      </td>
      <td>
        <Link className="btn btn-sm" href={`/admin/daily-gold/${d.date}`}>Open</Link>
      </td>
    </tr>
  );
}

function DuplicateBanner({ dup, onResolved }: { dup: DuplicateEdition; onResolved: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // ids[0] is newest — the row a family actually sees.
  const shadowed = dup.ids.slice(1);

  const resolve = () => start(async () => {
    for (const id of shadowed) {
      const res = await deleteEditionRow(id);
      if (!res.ok) { setError(res.error ?? 'Could not delete that row.'); return; }
    }
    onResolved();
  });

  return (
    <div className="banner b-amber" style={{ margin: '8px 12px 14px', alignItems: 'flex-start' }}>
      <span className="dot d-warn" style={{ marginTop: 3 }} />
      <div style={{ flex: 1 }}>
        <div>
          <b>{fmtShort(dup.date)} has {dup.ids.length} editions.</b>{' '}
          Families see the newest; the {shadowed.length === 1 ? 'other is' : 'others are'} invisible and un-editable.
          {dup.differing.length
            ? ` They disagree on ${dup.differing.length} field${dup.differing.length === 1 ? '' : 's'}:`
            : ' They hold identical content.'}
        </div>
        {dup.differing.length > 0 && (
          <div className="two" style={{ marginTop: 9, maxWidth: 620 }}>
            <div className="src">
              <div className="kick" style={{ color: 'var(--brown3)' }}>Newer · shown</div>
              {dup.differing.map((f) => (
                <div key={f.field} style={{ marginTop: 5 }}>{f.label} — <b>{f.newer ?? '—'}</b></div>
              ))}
            </div>
            <div className="src">
              <div className="kick" style={{ color: 'var(--brown3)' }}>Older · hidden</div>
              {dup.differing.map((f) => (
                <div key={f.field} style={{ marginTop: 5 }}>{f.label} — <b>{f.older ?? '—'}</b></div>
              ))}
            </div>
          </div>
        )}
        {error && <div style={{ marginTop: 8, color: 'var(--red)', fontSize: 12 }}>{error}</div>}
        <div className="note" style={{ marginTop: 8 }}>
          Resolving deletes the hidden {shadowed.length === 1 ? 'row' : 'rows'} and keeps the one families
          already see. Copy anything worth keeping into the newer row first.
        </div>
      </div>
      <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={resolve} disabled={pending}>
        {pending ? 'Resolving…' : 'Resolve'}
      </button>
    </div>
  );
}

/**
 * 366 cells, one per month-day (R2.3). A cell is *not* a date: filling 12 June
 * fills it for every year, which is why this grid is a separate panel from the
 * dates table above and why its copy says so.
 */
function AlmanacGrid({ cells, today }: { cells: AlmanacCell[]; today: string }) {
  const byMonthDay = useMemo(() => new Map(cells.map((c) => [c.monthDay, c])), [cells]);
  const todayMd = today.slice(5);
  const emptyDays = cells.filter((c) => c.historyYears === 0 && c.momentsFilled === 0).length;

  return (
    <div className="panel" style={{ padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="kick">The almanac · recurring every year</div>
          <div className="h2" style={{ marginTop: 6 }}>On This Day and Greatest Moments, all 366 days</div>
          <div className="note" style={{ marginTop: 5, maxWidth: 620 }}>
            A cell is one month-day, not one date. Filling 12 June fills it for every year — which is
            why this grid is separate from the dates above.
          </div>
        </div>
        <div className="legend">
          <span className="lgi"><span className="swatch c-full" />History + ten moments</span>
          <span className="lgi"><span className="swatch c-part" />Partly filled</span>
          <span className="lgi"><span className="swatch c-empty" />Nothing yet</span>
          <span className="lgi"><span className="swatch c-today" />Today</span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 920 }}>
          <div className="calgrid" style={{ marginBottom: 4 }}>
            <div />
            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
              <div key={n} className="dhead">{n === 1 || n === 31 || n % 5 === 0 ? n : ''}</div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {MONTHS.map((abbr, m) => (
              <div className="calgrid" key={abbr}>
                <div className="mlabel">{abbr}</div>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                  if (d > DAYS_IN[m]) return <div key={d} className="cell c-na" />;
                  const md = `${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const c = byMonthDay.get(md);
                  const full = (c?.historyYears ?? 0) > 0 && (c?.momentsFilled ?? 0) >= 10;
                  const some = (c?.historyYears ?? 0) > 0 || (c?.momentsFilled ?? 0) > 0;
                  const cls = md === todayMd ? 'c-today' : full ? 'c-full' : some ? 'c-part' : 'c-empty';
                  return (
                    <Link
                      key={d}
                      href={`/admin/daily-gold/almanac/${md}`}
                      className={`cell ${cls}`}
                      title={`${d} ${abbr} — ${c?.historyYears ?? 0} year(s) of history, ${c?.momentsFilled ?? 0}/10 moments, ${c?.peopleCount ?? 0} born`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="note" style={{ marginTop: 14 }}>
        {emptyDays} days hold nothing. That is a fact about a young almanac, not a backlog — a family
        only ever sees the day they open, and an absent column is a designed state.
      </div>
    </div>
  );
}
