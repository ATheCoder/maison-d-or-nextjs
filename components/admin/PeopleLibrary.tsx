'use client';
/**
 * The library of remarkable people (Phase 2) — "Daily Gold Edition" admin view.
 * A searchable, filterable board over existing people with:
 *   • masthead + stat tiles (live / draft / uncovered days),
 *   • a year-at-a-glance calendar coverage grid (which birthdays Born Today can
 *     surface, and which days are still open),
 *   • person cards (cover thumb, one-liner, completeness badges),
 *   • the create flow (name → slug preview → collision-confirmed insert, plus a
 *     "suggest someone born on a date" picker) and a typed-slug delete confirm.
 * Interactive bits only — the server page loads the data and re-renders it on
 * revalidation. Design mirrors the Remarkable Person Editor's house style.
 */
import { useEffect, useMemo, useState, useTransition } from 'react';
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
import { slugify, SLUG_RE } from '@/lib/slug';
import { flagEmoji } from '@/lib/countries';
import { createPerson, deletePerson, reorderBornToday, suggestPeople, type PersonListItem, type PersonSuggestion } from '@/app/admin/people/actions';

// ── House stylesheet (scoped under .lib) ─────────────────────────────────────
const CSS = `
.lib {
  --ground:#f5f0e7; --panel-t:rgba(255,248,238,.82);
  --line:rgba(201,169,110,.25); --line2:rgba(201,169,110,.45);
  --ink:#241a0c; --brown:#5c4a2a; --brown2:#8b7355; --brown3:#a08a63;
  --gold:#c9a96e; --gold-deep:#a8843f; --gold-soft:rgba(201,169,110,.14);
  --green:#7d8a4e; --amber:#c08a2e; --red:#b5533a;
  --serif:"Playfair Display",Georgia,serif; --sans:"Lato",system-ui,sans-serif; --script:"Great Vibes",cursive;
  --noise:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.05'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
  min-height:100vh; font-family:var(--sans); color:var(--ink); -webkit-font-smoothing:antialiased;
  background: var(--noise), radial-gradient(ellipse 120% 80% at 50% -10%, rgba(201,169,110,.10), transparent 55%), var(--ground);
}
.lib * { box-sizing:border-box; }
.lib .wrap { max-width:1340px; margin:0 auto; padding:40px 40px 72px; }
.lib .serif { font-family:var(--serif); }
.lib .script { font-family:var(--script); }
.lib .kick { font:700 10px/1.4 var(--sans); letter-spacing:.26em; text-transform:uppercase; color:var(--gold-deep); }
.lib .muted { color:var(--brown2); }
.lib .panel { background:var(--panel-t); border:1px solid var(--line); border-radius:16px; box-shadow:0 2px 18px rgba(40,26,12,.05); }
.lib .btn { display:inline-flex; align-items:center; gap:7px; font:700 12px/1 var(--sans); letter-spacing:.02em; padding:10px 15px; border-radius:9px; border:1px solid var(--line2); background:#fffdf8; color:var(--brown); cursor:pointer; transition:transform .1s ease; }
.lib .btn:hover { transform:translateY(-1px); }
.lib .btn:disabled { opacity:.5; cursor:default; transform:none; }
.lib .btn-gold { background:linear-gradient(180deg,#dcc191,#c9a96e); color:#3a2a10; border-color:var(--gold-deep); box-shadow:0 1px 0 rgba(255,255,255,.5) inset, 0 6px 16px rgba(168,132,63,.28); }
.lib .btn-ghost { background:transparent; border-color:transparent; color:var(--brown2); }
.lib .btn-danger { background:transparent; border-color:rgba(181,83,58,.5); color:var(--red); }
.lib .btn-sm { padding:7px 11px; font-size:11px; border-radius:8px; }
.lib .chip { display:inline-flex; align-items:center; gap:6px; font:700 10px/1 var(--sans); letter-spacing:.06em; text-transform:uppercase; padding:5px 9px; border-radius:999px; border:1px solid var(--line2); color:var(--brown); background:#fffdf8; white-space:nowrap; }
.lib .chip-gold { background:var(--gold-soft); border-color:var(--line2); color:var(--gold-deep); }
.lib .chip-green { background:rgba(125,138,78,.14); border-color:rgba(125,138,78,.4); color:#5f6c37; }
.lib .chip-amber { background:rgba(192,138,46,.14); border-color:rgba(192,138,46,.42); color:#96681f; }
.lib .chip-red { background:rgba(181,83,58,.12); border-color:rgba(181,83,58,.42); color:#96402b; }
.lib .chip-ink { background:rgba(36,26,12,.06); border:1px solid var(--line); color:var(--brown); text-transform:none; letter-spacing:0; font-weight:400; }
.lib .dot { width:9px; height:9px; border-radius:50%; flex:0 0 auto; }
.lib .d-warn { background:var(--amber); box-shadow:0 0 0 2px rgba(192,138,46,.2); }
.lib .d-green { background:var(--green); box-shadow:0 0 0 2px rgba(125,138,78,.2); }
.lib .field { background:#fffdf8; border:1px solid var(--line2); border-radius:10px; color:var(--ink); font:400 13px/1 var(--sans); }
.lib .seg { display:inline-flex; padding:3px; background:rgba(36,26,12,.06); border:1px solid var(--line); border-radius:10px; gap:2px; }
.lib .seg > button { font:700 11px/1 var(--sans); letter-spacing:.04em; padding:8px 13px; border-radius:7px; color:var(--brown2); cursor:pointer; white-space:nowrap; border:none; background:transparent; }
.lib .seg > button.on { background:#fffdf8; color:var(--ink); box-shadow:0 1px 6px rgba(40,26,12,.1); }
.lib select.control { -webkit-appearance:none; appearance:none; padding:7px 26px 7px 11px; font:700 11px/1 var(--sans); color:var(--brown); border:1px solid var(--line2); border-radius:8px; background:#fffdf8 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235c4a2a' stroke-width='1.4' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 10px center; cursor:pointer; }

.lib .statrow { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.lib .stat { padding:15px 18px; display:flex; flex-direction:column; gap:4px; }
.lib .stat .num { font-family:var(--serif); font-size:30px; font-weight:600; line-height:1; color:var(--ink); }
.lib .stat .num.warn { color:var(--gold-deep); }
.lib .stat .lbl { font-size:11.5px; color:var(--brown2); }

.lib .calgrid { display:grid; grid-template-columns:104px repeat(31,minmax(0,1fr)); gap:4px; align-items:center; }
.lib .mlabel { font:700 11px/1 var(--sans); letter-spacing:.12em; text-transform:uppercase; color:var(--brown); text-align:right; padding:0 12px 0 0; background:none; border:none; cursor:pointer; transition:color .1s ease; }
.lib .mlabel:hover { color:var(--gold-deep); }
.lib .mlabel.on { color:var(--gold-deep); text-decoration:underline; text-underline-offset:3px; text-decoration-thickness:2px; }
.lib .dhead { font:700 9.5px/1 var(--sans); color:var(--brown3); text-align:center; padding-bottom:6px; }
.lib .cell { height:22px; border-radius:5px; cursor:pointer; transition:transform .1s ease; border:none; padding:0; width:100%; display:flex; align-items:center; justify-content:center; font:700 9px/1 var(--sans); color:rgba(58,42,16,.72); }
.lib .cell:hover { transform:translateY(-1px) scale(1.04); }
.lib .c-pub { background:linear-gradient(180deg,#d8bd86,#c9a96e); box-shadow:0 1px 0 rgba(255,255,255,.35) inset, 0 1px 4px rgba(168,132,63,.22); }
.lib .c-draft { background:repeating-linear-gradient(135deg, rgba(201,169,110,.32) 0 4px, rgba(201,169,110,.12) 4px 8px); border:1px solid var(--line2); }
.lib .c-empty { background:rgba(92,74,42,.05); border:1px solid rgba(201,169,110,.16); }
.lib .c-empty:hover { border-color:var(--gold-deep); background:var(--gold-soft); }
.lib .c-na { background:transparent; cursor:default; }
.lib .c-na:hover { transform:none; }
.lib .c-today { background:#fffdf8; border:1.5px solid var(--amber); box-shadow:0 0 0 3px rgba(192,138,46,.18); }
.lib .cell.c-sel { box-shadow:0 0 0 2px var(--brown), 0 2px 7px rgba(40,26,12,.25); position:relative; z-index:1; }

.lib .cards { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.lib .pcard { padding:15px; display:flex; gap:15px; align-items:stretch; transition:transform .12s ease, box-shadow .12s ease; cursor:pointer; position:relative; text-align:left; }
.lib .pcard:hover { transform:translateY(-2px); box-shadow:0 14px 34px rgba(40,26,12,.12); }
.lib .thumb { width:84px; flex:0 0 84px; border-radius:5px 8px 8px 5px; position:relative; overflow:hidden; box-shadow:0 6px 16px rgba(40,26,12,.22); }
.lib .thumb img { width:100%; height:100%; object-fit:cover; display:block; }
.lib .th-art { background:radial-gradient(ellipse at 34% 28%, #e8d29a, transparent 60%), radial-gradient(ellipse at 72% 68%, rgba(154,160,106,.4), transparent 55%), linear-gradient(150deg,#d9c286,#b89a5e 60%,#8f7c4a); }
.lib .th-art::after { content:""; position:absolute; inset:0; box-shadow:inset 0 0 22px rgba(90,60,25,.3); mix-blend-mode:multiply; }
.lib .th-empty { background:repeating-linear-gradient(135deg, rgba(120,90,50,.07) 0 7px, transparent 7px 14px), #f3ead2; border:1px dashed rgba(120,90,50,.35); box-shadow:none; }
.lib .th-spine { position:absolute; left:5px; top:0; bottom:0; width:2px; background:linear-gradient(180deg, transparent, rgba(90,60,25,.4), transparent); }
.lib .th-tag { position:absolute; left:0; right:0; bottom:0; text-align:center; font:700 8px/1.3 var(--sans); letter-spacing:.16em; text-transform:uppercase; color:rgba(58,42,16,.7); padding:5px 2px; }
.lib .th-empty-tag { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; text-align:center; font:700 8px/1.4 var(--sans); letter-spacing:.12em; text-transform:uppercase; color:var(--brown3); padding:6px; }
.lib .badges { display:flex; flex-wrap:wrap; gap:5px; }
.lib .pdel { position:absolute; top:9px; right:9px; width:24px; height:24px; border-radius:7px; border:1px solid transparent; background:transparent; color:var(--brown3); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; opacity:0; transition:opacity .12s ease; }
.lib .pcard:hover .pdel { opacity:1; }
.lib .pdel:hover { background:rgba(181,83,58,.12); border-color:rgba(181,83,58,.42); color:var(--red); }

.lib .search { display:flex; align-items:center; gap:9px; padding:0 13px; height:40px; }
.lib .search input { border:none; outline:none; background:transparent; font:400 13px/1 var(--sans); color:var(--ink); width:100%; }
.lib .search input::placeholder { color:var(--brown3); }
.lib .legend { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.lib .lgi { display:flex; align-items:center; gap:7px; font-size:11px; color:var(--brown2); }
.lib .swatch { width:15px; height:15px; border-radius:4px; flex:0 0 auto; }

.lib .overlay { position:fixed; inset:0; background:rgba(36,26,12,.45); display:flex; align-items:center; justify-content:center; padding:24px; z-index:50; }
.lib .modal { background:var(--ground); border:1px solid var(--line2); border-radius:16px; padding:26px; width:min(460px,100%); box-shadow:0 24px 70px rgba(36,26,12,.35); max-height:90vh; overflow-y:auto; }
.lib .flabel { font:700 10px/1.4 var(--sans); letter-spacing:.14em; text-transform:uppercase; color:var(--brown2); display:block; margin:0 0 7px; }
.lib .finput { width:100%; padding:11px 12px; border-radius:10px; box-sizing:border-box; border:1px solid var(--line2); background:#fffdf8; font-family:var(--sans); font-size:14px; color:var(--ink); outline:none; }
.lib .finput:focus { border-color:var(--gold-deep); }
.lib .err { font-size:12px; color:var(--red); margin:8px 0 0; }

.lib .rlist { display:flex; flex-direction:column; gap:9px; }
.lib .prow { display:flex; align-items:center; gap:13px; padding:11px 13px; position:relative; }
.lib .prow.draft { background:repeating-linear-gradient(135deg, rgba(201,169,110,.05) 0 8px, transparent 8px 16px), var(--panel-t); }
.lib .grip { display:flex; align-items:center; justify-content:center; width:28px; height:36px; flex:0 0 auto; border:none; background:transparent; color:var(--brown3); cursor:grab; border-radius:8px; touch-action:none; }
.lib .grip:hover { background:var(--gold-soft); color:var(--gold-deep); }
.lib .grip:active { cursor:grabbing; }
.lib .grip:focus-visible { outline:2px solid var(--gold-deep); outline-offset:2px; }
.lib .rank { flex:0 0 auto; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font:600 13px/1 var(--serif); color:#3a2a10; background:linear-gradient(180deg,#dcc191,#c9a96e); box-shadow:0 1px 0 rgba(255,255,255,.5) inset, 0 3px 9px rgba(168,132,63,.26); }
.lib .rank.off { background:rgba(36,26,12,.07); color:var(--brown3); box-shadow:none; }
.lib .rthumb { width:38px; height:50px; flex:0 0 38px; border-radius:2px 4px 4px 2px; overflow:hidden; box-shadow:0 3px 9px rgba(40,26,12,.2); position:relative; }
.lib .rthumb img { width:100%; height:100%; object-fit:cover; display:block; }
.lib .rthumb.empty { box-shadow:none; background:repeating-linear-gradient(135deg, rgba(120,90,50,.07) 0 6px, transparent 6px 12px), #f3ead2; border:1px dashed rgba(120,90,50,.3); }
.lib .rname { font-family:var(--serif); font-size:15px; font-weight:600; line-height:1.2; color:var(--ink); }
.lib .rmeta { font-size:11.5px; color:var(--brown2); margin-top:2px; }

@media (max-width:900px){ .lib .cards{ grid-template-columns:1fr 1fr; } .lib .statrow{ grid-template-columns:1fr; } .lib .wrap{ padding:28px 22px 56px; } }
@media (max-width:620px){ .lib .cards{ grid-template-columns:1fr; } }
@media (prefers-reduced-motion:reduce){ .lib .cell, .lib .pcard, .lib .btn{ transition:none; } }
`;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

type Segment = 'all' | 'published' | 'draft' | 'incomplete';
type SortKey = 'birthday' | 'name';

const pad = (n: number) => String(n).padStart(2, '0');

/** 'MM-DD' → '15 April'. */
function dayMonthLabel(md: string): string {
  const [m, d] = md.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** Whole days until this month-day next comes around (0 = today). */
function daysUntilBirthday(md: string, now: Date): number {
  const [m, d] = md.split('-').map(Number);
  const y = now.getFullYear();
  const today = new Date(y, now.getMonth(), now.getDate());
  let next = new Date(y, m - 1, d);
  if (next < today) next = new Date(y + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

function surfacesLabel(n: number): string {
  if (n === 0) return 'Surfaces today';
  if (n === 1) return 'Surfaces tomorrow';
  return `Surfaces in ${n} days`;
}

// ── Person card ──────────────────────────────────────────────────────────────

function PersonCard({ p, now, onDelete }: { p: PersonListItem; now: Date; onDelete: () => void }) {
  const router = useRouter();
  const href = `/admin/people/${p.slug}`;
  const filled = p.totalImages - p.emptyImages;
  const subtitle = p.role || p.storyTitle;
  const meta = [p.field, p.country].filter(Boolean).join(' · ');
  const flag = p.countryCode ? flagEmoji(p.countryCode) : '';
  const lastName = p.name.trim().split(/\s+/).slice(-1)[0] || p.name;
  const daysUntil = p.monthDay ? daysUntilBirthday(p.monthDay, now) : null;

  const badges: React.ReactNode[] = [];
  if (p.missingBirthDate) {
    badges.push(<span key="nb" className="chip chip-red">No birth date · can’t surface</span>);
  } else if (p.published && daysUntil !== null && daysUntil <= 21) {
    badges.push(<span key="soon" className="chip chip-gold">◗ {surfacesLabel(daysUntil)}</span>);
  }
  if (p.chapterCount === 0) {
    badges.push(<span key="nc" className="chip chip-red">No chapters</span>);
  } else if (p.emptyImages > 0) {
    badges.push(<span key="art" className="chip chip-amber">{filled} / {p.totalImages} art</span>);
  } else {
    badges.push(<span key="done" className="chip chip-green">✓ Complete · {p.totalImages} / {p.totalImages} art</span>);
  }
  if (!p.coverUrl) badges.push(<span key="nocov" className="chip chip-amber">No cover</span>);
  // Its absence costs the child a flag chip silently, which is why it is a
  // badge rather than something you only notice on the reader (R5.3).
  if (p.missingCountryCode) {
    badges.push(<span key="nocc" className="chip chip-amber">No country code · no flag</span>);
  }

  const hasContent = p.published || p.chapterCount > 0;

  return (
    <div
      className="panel pcard"
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => { if (e.key === 'Enter') router.push(href); }}
    >
      <button
        className="pdel"
        title={`Delete ${p.name}`}
        aria-label={`Delete ${p.name}`}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >✕</button>

      {p.coverUrl ? (
        <div className="thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.coverUrl} alt="" />
        </div>
      ) : hasContent ? (
        <div className="thumb th-art"><div className="th-spine" /><div className="th-tag">{lastName}</div></div>
      ) : (
        <div className="thumb th-empty"><div className="th-empty-tag">No cover yet</div></div>
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, paddingRight: 22 }}>
          <div className="serif" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>{p.name}</div>
          {p.published
            ? <span className="chip chip-gold">Live</span>
            : <span className="chip chip-amber">Draft</span>}
        </div>

        {subtitle && (
          <div className="muted" style={{ fontSize: 12, fontStyle: 'italic', lineHeight: 1.35 }}>{subtitle}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', flexWrap: 'wrap' }}>
          <span className="chip chip-ink">b. {p.monthDay ? dayMonthLabel(p.monthDay) : '—'}</span>
          {meta && <span className="muted" style={{ fontSize: 11 }}>{flag && `${flag} `}{meta}</span>}
        </div>

        <div className="badges">{badges}</div>
      </div>
    </div>
  );
}

// ── Create dialog ────────────────────────────────────────────────────────────

function CreateDialog({ onClose, existingNames, initialDate }: {
  onClose: () => void;
  existingNames: string[];
  initialDate: string | null;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collision, setCollision] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // "Suggest a person born on a date" — the year is irrelevant, only the
  // month-day matters for Born Today.
  const [sugDate, setSugDate] = useState(initialDate ?? '');
  const [suggestions, setSuggestions] = useState<PersonSuggestion[] | null>(null);
  const [sugError, setSugError] = useState<string | null>(null);
  const [sugPending, startSug] = useTransition();

  function runSuggest(dateStr: string) {
    setSugError(null);
    setSuggestions(null);
    const monthDay = dateStr.slice(5); // 'YYYY-MM-DD' → 'MM-DD'
    startSug(async () => {
      const res = await suggestPeople(monthDay, existingNames);
      if (res.ok) setSuggestions(res.suggestions);
      else setSugError(res.error);
    });
  }

  // Opened from a calendar day / "Suggest for a date" — fetch on mount. State
  // updates ride the transition's async callback (initial state is already
  // empty, so nothing needs clearing synchronously).
  useEffect(() => {
    if (!initialDate) return;
    const monthDay = initialDate.slice(5);
    startSug(async () => {
      const res = await suggestPeople(monthDay, existingNames);
      if (res.ok) setSuggestions(res.suggestions);
      else setSugError(res.error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveSlug = slugTouched ? slugify(slug) : slugify(name);
  const slugValid = SLUG_RE.test(effectiveSlug);

  function submit(overwrite: boolean) {
    setError(null);
    start(async () => {
      const res = await createPerson({ name, slug: effectiveSlug, overwrite });
      // On success the action redirects to the editor; only failures return.
      if (res?.collision) { setCollision(res.collision); return; }
      if (res?.error) { setError(res.error); setCollision(null); }
    });
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="kick">Daily Gold Edition · New book</div>
        <h2 className="serif" style={{ fontSize: 24, fontWeight: 600, margin: '8px 0 18px' }}>Add a remarkable person</h2>

        <label className="flabel">Name</label>
        <input
          autoFocus
          className="finput"
          value={name}
          onChange={(e) => { setName(e.target.value); setCollision(null); }}
          placeholder="Marie Curie"
        />

        <label className="flabel" style={{ marginTop: 16 }}>Slug · folder key, set once here</label>
        <input
          className="finput"
          style={{ fontFamily: 'monospace', fontSize: 13 }}
          value={slugTouched ? slug : effectiveSlug}
          onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); setCollision(null); }}
          placeholder="marie-curie"
        />
        {!slugValid && effectiveSlug.length > 0 && (
          <p className="err">Lowercase letters, numbers and single dashes only.</p>
        )}

        <div className="panel" style={{ marginTop: 18, padding: '14px 15px', background: 'var(--gold-soft)' }}>
          <label className="flabel" style={{ margin: 0, color: 'var(--gold-deep)' }}>✦ Suggest a person born on a date</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 9, alignItems: 'center' }}>
            <input
              type="date"
              className="finput"
              style={{ maxWidth: 200 }}
              value={sugDate}
              onChange={(e) => setSugDate(e.target.value)}
            />
            <button
              className="btn btn-sm"
              onClick={() => runSuggest(sugDate)}
              disabled={!sugDate || sugPending}
            >{sugPending ? 'Thinking…' : 'Suggest'}</button>
          </div>
          {sugError && <p className="err">{sugError}</p>}
          {suggestions && suggestions.length === 0 && !sugPending && (
            <p className="muted" style={{ fontSize: 12, margin: '9px 0 0' }}>No suggestions for that day.</p>
          )}
          {suggestions && suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 11 }}>
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  onClick={() => { setName(s.name); setCollision(null); }}
                  style={{
                    textAlign: 'left', background: '#fffdf8', border: '1px solid var(--line)',
                    borderRadius: 9, padding: '9px 11px', cursor: 'pointer', fontFamily: 'var(--sans)',
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>{s.name}</span>
                  <span className="muted" style={{ fontSize: 12 }}> · {s.birth_date} · {s.field}</span>
                  <span style={{ display: 'block', color: 'var(--brown)', fontSize: 12, marginTop: 3 }}>{s.why}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="err" style={{ marginTop: 14 }}>{error}</p>}

        {collision && (
          <div className="chip-amber" style={{
            marginTop: 14, padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(192,138,46,.42)',
            fontSize: 12.5, lineHeight: 1.5, textTransform: 'none', letterSpacing: 0, fontWeight: 400,
          }}>
            A person already exists at <code>{effectiveSlug}</code>. Overwrite <strong>{collision}</strong>?
            This resets them to a blank draft (their published story goes offline; art files are kept).
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>Cancel</button>
          {collision ? (
            <button className="btn btn-danger" onClick={() => submit(true)} disabled={pending}>
              {pending ? 'Overwriting…' : `Overwrite ${collision}`}
            </button>
          ) : (
            <button
              className="btn btn-gold"
              onClick={() => submit(false)}
              disabled={!name.trim() || !slugValid || pending}
            >
              {pending ? 'Creating…' : 'Create & edit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Delete dialog ────────────────────────────────────────────────────────────

function DeleteDialog({ person, onClose }: { person: PersonListItem; onClose: () => void }) {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    setError(null);
    start(async () => {
      const res = await deletePerson(person.slug, typed);
      if (res.ok) { onClose(); router.refresh(); }
      else setError(res.error ?? 'Could not delete.');
    });
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="serif" style={{ fontSize: 24, fontWeight: 600, margin: '0 0 10px' }}>Delete {person.name}?</h2>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
          This removes the person and their story brief. Art files in storage are left in place.
          Type <code style={{ color: 'var(--ink)' }}>{person.slug}</code> to confirm.
        </p>
        <input
          autoFocus
          className="finput"
          style={{ fontFamily: 'monospace', fontSize: 13 }}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={person.slug}
        />
        {error && <p className="err">{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>Cancel</button>
          <button className="btn btn-danger" onClick={confirm} disabled={typed !== person.slug || pending}>
            {pending ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Born Today priority reorder ──────────────────────────────────────────────
// Priority only ranks people against others born the SAME month-day (that's the
// only set they compete in on the edition), so reordering is scoped to a single
// calendar day — reached by clicking a day in the coverage grid above.

function GripIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="3" r="1.4" /><circle cx="9" cy="3" r="1.4" />
      <circle cx="3" cy="8" r="1.4" /><circle cx="9" cy="8" r="1.4" />
      <circle cx="3" cy="13" r="1.4" /><circle cx="9" cy="13" r="1.4" />
    </svg>
  );
}

// Highest priority first, name as the stable tie-break — mirrors getPeopleForDate.
const byPriority = (list: PersonListItem[]) =>
  [...list].sort((a, b) => b.bornTodayPriority - a.bornTodayPriority || a.name.localeCompare(b.name));

// One sortable row (dnd-kit): the grip is the sole drag activator so the Open
// link stays clickable. Drafts are dimmed — they don't surface to families
// until published, but they're still ranked so the order is ready on publish.
function PriorityRow({ p, rank }: { p: PersonListItem; rank: number }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: p.slug });
  const meta = [p.role, [p.field, p.country].filter(Boolean).join(' · ')].filter(Boolean).join(' — ');
  const clamp = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
  return (
    <div
      ref={setNodeRef}
      className={`panel prow${p.published ? '' : ' draft'}`}
      style={{
        transform: dndCSS.Transform.toString(transform),
        transition,
        ...(isDragging ? { position: 'relative' as const, zIndex: 5, boxShadow: '0 12px 30px rgba(40,26,12,.2)' } : null),
      }}
    >
      <button
        ref={setActivatorNodeRef}
        className="grip"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        aria-label={`Reorder ${p.name}`}
      ><GripIcon /></button>
      <span
        className={`rank${p.published ? '' : ' off'}`}
        title={p.published ? `Position ${rank} for families` : 'Draft — not shown to families yet'}
      >{rank}</span>
      {p.coverUrl ? (
        <div className="rthumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.coverUrl} alt="" />
        </div>
      ) : (
        <div className="rthumb empty" />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="rname" style={clamp}>{p.name}</div>
        {meta && <div className="rmeta" style={clamp}>{meta}</div>}
      </div>
      {p.published
        ? <span className="chip chip-gold">Live</span>
        : <span className="chip chip-amber">Draft</span>}
      <Link href={`/admin/people/${p.slug}`} className="btn btn-sm" style={{ textDecoration: 'none' }}>Open</Link>
    </div>
  );
}

function BornTodayReorder({ people }: { people: PersonListItem[] }) {
  const [order, setOrder] = useState<PersonListItem[]>(() => byPriority(people));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [, start] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = order.map((p) => p.slug);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(order, from, to);
    setOrder(next); // optimistic — commit locally, persist in the background
    setStatus('saving');
    start(async () => {
      const res = await reorderBornToday(next.map((p) => p.slug));
      if (res.ok) setStatus('saved');
      else { setStatus('error'); setOrder(byPriority(people)); } // roll back on failure
    });
  }

  const publishedCount = order.filter((p) => p.published).length;

  return (
    <div className="panel" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="kick">Drag a row to arrange the order</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.5 }}>
            {publishedCount > 0
              ? <>Only the <b style={{ color: 'var(--brown)' }}>{publishedCount}</b> live {publishedCount === 1 ? 'person appears' : 'people appear'} to families, top-first; drafts are ranked for when you publish them.</>
              : <>Nobody here is published yet — the order takes effect once you publish.</>}
          </div>
        </div>
        <span
          aria-live="polite"
          style={{ fontSize: 11.5, minWidth: 92, textAlign: 'right', color: status === 'error' ? 'var(--red)' : 'var(--brown2)' }}
        >
          {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Order saved' : status === 'error' ? 'Couldn’t save — reverted' : ''}
        </span>
      </div>

      {order.length < 2 ? (
        <div className="muted" style={{ fontSize: 13 }}>Only one person is born on this day — nothing to order yet.</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="rlist">
              {order.map((p, i) => <PriorityRow key={p.slug} p={p} rank={i + 1} />)}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ── Library ──────────────────────────────────────────────────────────────────

export default function PeopleLibrary({ people }: { people: PersonListItem[] }) {
  const now = useMemo(() => new Date(), []);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [month, setMonth] = useState<number | null>(null); // 0-11 or null = Any
  const [selectedMd, setSelectedMd] = useState<string | null>(null); // 'MM-DD' calendar-day filter
  const [reorderMode, setReorderMode] = useState(false); // Born Today reorder view for the selected day
  const [sortKey, setSortKey] = useState<SortKey>('birthday');
  const [creating, setCreating] = useState(false);
  const [createSeed, setCreateSeed] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PersonListItem | null>(null);

  const publishedCount = people.filter((p) => p.published).length;
  const draftCount = people.length - publishedCount;

  // ── Calendar coverage: md → best state, and the people behind each day. ──────
  const { coverage, peopleByMd, coveredDays } = useMemo(() => {
    const coverage = new Map<string, 'pub' | 'draft'>();
    const peopleByMd = new Map<string, PersonListItem[]>();
    for (const p of people) {
      if (!p.monthDay) continue;
      const list = peopleByMd.get(p.monthDay) ?? [];
      list.push(p);
      peopleByMd.set(p.monthDay, list);
      if (p.published) coverage.set(p.monthDay, 'pub');
      else if (!coverage.get(p.monthDay)) coverage.set(p.monthDay, 'draft');
    }
    return { coverage, peopleByMd, coveredDays: coverage.size };
  }, [people]);

  const totalDaySlots = DAYS_IN.reduce((a, b) => a + b, 0); // 366, Feb 29 counted
  const uncovered = totalDaySlots - coveredDays;
  const todayMD = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const todayState = coverage.get(todayMD);
  const todayPerson = peopleByMd.get(todayMD)?.[0] ?? null;
  const todayLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  function openCreate(seed: string | null) { setCreateSeed(seed); setCreating(true); }

  // Clicking a day filters the cards to people born then; clicking it again clears.
  // Switching days always drops back out of reorder mode.
  function onCell(m: number, d: number) {
    if (d > DAYS_IN[m]) return;
    const md = `${pad(m + 1)}-${pad(d)}`;
    setSelectedMd((cur) => (cur === md ? null : md));
    setReorderMode(false);
  }

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = people.filter((p) => {
      if (selectedMd && p.monthDay !== selectedMd) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.slug.includes(q)) return false;
      if (segment === 'published' && !p.published) return false;
      if (segment === 'draft' && p.published) return false;
      if (segment === 'incomplete' && !p.incomplete) return false;
      if (month !== null && (!p.monthDay || Number(p.monthDay.slice(0, 2)) !== month + 1)) return false;
      return true;
    });
    filtered.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      const da = a.monthDay ? daysUntilBirthday(a.monthDay, now) : Infinity;
      const db = b.monthDay ? daysUntilBirthday(b.monthDay, now) : Infinity;
      return da - db || a.name.localeCompare(b.name);
    });
    return filtered;
  }, [people, search, segment, month, sortKey, now, selectedMd]);

  const segments: { key: Segment; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'draft', label: 'Drafts' },
    { key: 'incomplete', label: 'Incomplete' },
  ];

  // Everyone born on the selected day (unfiltered by search/segment — priority
  // is a property of the whole day's set). Reordering is only offered when the
  // day holds more than one story; showReorder gates the actual reorder view so
  // a lingering reorderMode can never render against an ineligible day.
  const dayPeople = selectedMd ? (peopleByMd.get(selectedMd) ?? []) : [];
  const canReorder = !!selectedMd && dayPeople.length > 1;
  const showReorder = reorderMode && canReorder;
  // Remount the reorder panel (re-seeding its local order) whenever the day or
  // its persisted priorities change — e.g. after a revalidating refresh. An
  // optimistic drag leaves the props untouched, so this key stays stable and
  // the in-progress order survives until real data arrives.
  const reorderKey = selectedMd
    ? `${selectedMd}:${dayPeople.map((p) => `${p.slug}:${p.bornTodayPriority}`).sort().join(',')}`
    : '';

  return (
    <div className="lib">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Masthead */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <Link href="/admin" style={{ textDecoration: 'none' }}>
              <div className="kick">Daily Gold Edition · Admin</div>
            </Link>
            <div className="serif" style={{ fontSize: 34, fontWeight: 600, marginTop: 8, letterSpacing: '-.01em' }}>
              The library of remarkable people
            </div>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 7 }}>
              <b style={{ color: 'var(--brown)' }}>{people.length}</b> books ·{' '}
              <b style={{ color: 'var(--brown)' }}>{draftCount}</b> in draft ·{' '}
              <b style={{ color: 'var(--gold-deep)' }}>{uncovered}</b> days of the year still uncovered
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => openCreate(`2024-${todayMD}`)}>✦ Suggest for a date</button>
            <button className="btn btn-gold" style={{ padding: '11px 17px' }} onClick={() => openCreate(null)}>+ New person</button>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="statrow">
          <div className="panel stat">
            <span className="kick" style={{ color: 'var(--brown)' }}>Live to families</span>
            <span className="num">{publishedCount}</span>
            <span className="lbl">books families can read right now</span>
          </div>
          <div className="panel stat">
            <span className="kick" style={{ color: 'var(--brown)' }}>In draft</span>
            <span className="num">{draftCount}</span>
            <span className="lbl">started, not yet published</span>
          </div>
          <div className="panel stat" style={{ background: 'var(--gold-soft)', borderColor: 'var(--line2)' }}>
            <span className="kick" style={{ color: 'var(--gold-deep)' }}>Uncovered days</span>
            <span className="num warn">{uncovered}</span>
            <span className="lbl">days with nobody for Born&nbsp;Today — your queue</span>
          </div>
        </div>

        {/* Calendar coverage */}
        <div className="panel" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <div className="kick">Calendar coverage · what to make next</div>
              <div className="serif" style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>Every day of the year, at a glance</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>
                Born&nbsp;Today surfaces a person on their birthday — click a day to order who appears first, or an open day to draft someone born then.
              </div>
            </div>
            <div className="legend">
              <span className="lgi"><span className="swatch c-pub" />Live</span>
              <span className="lgi"><span className="swatch c-draft" />Draft</span>
              <span className="lgi"><span className="swatch c-empty" />Open day</span>
              <span className="lgi"><span className="swatch c-today" />Today</span>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '9px 13px', borderRadius: 10, flexWrap: 'wrap',
            background: todayState === 'pub' ? 'rgba(125,138,78,.1)' : 'rgba(192,138,46,.09)',
            border: `1px solid ${todayState === 'pub' ? 'rgba(125,138,78,.35)' : 'rgba(192,138,46,.3)'}`,
          }}>
            <span className={todayState === 'pub' ? 'dot d-green' : 'dot d-warn'} />
            <span style={{ fontSize: 12.5, color: 'var(--brown)' }}>
              <b>{todayLabel}</b> —{' '}
              {todayState === 'pub'
                ? <><b>{todayPerson?.name}</b> is born-today and live for families.</>
                : todayState === 'draft'
                  ? <><b>{todayPerson?.name}</b> is drafted for today but not published yet.</>
                  : 'nobody is born-today. Families opening the edition see an empty slot.'}
            </span>
            {todayState === 'pub' ? (
              <Link href={`/admin/people/${todayPerson?.slug}`} className="btn btn-sm" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
                Open {todayPerson?.name}
              </Link>
            ) : todayState === 'draft' ? (
              <Link href={`/admin/people/${todayPerson?.slug}`} className="btn btn-sm btn-gold" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
                Finish {todayPerson?.name}
              </Link>
            ) : (
              <button className="btn btn-sm btn-gold" style={{ marginLeft: 'auto' }} onClick={() => openCreate(`2024-${todayMD}`)}>
                ✦ Suggest someone born {now.getDate()} {ABBR[now.getMonth()]}
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 940 }}>
              <div className="calgrid" style={{ marginBottom: 4 }}>
                <div />
                {Array.from({ length: 31 }, (_, i) => {
                  const n = i + 1;
                  const label = n === 1 || n === 31 || n % 5 === 0 ? String(n) : '';
                  return <div key={n} className="dhead">{label}</div>;
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ABBR.map((ab, m) => (
                  <div className="calgrid" key={ab}>
                    <button
                      className={`mlabel${month === m ? ' on' : ''}`}
                      title={month === m ? `Clear ${MONTHS[m]} filter` : `Show ${MONTHS[m]} birthdays`}
                      aria-pressed={month === m}
                      onClick={() => setMonth((cur) => (cur === m ? null : m))}
                    >{ab}</button>
                    {Array.from({ length: 31 }, (_, i) => {
                      const d = i + 1;
                      const md = `${pad(m + 1)}-${pad(d)}`;
                      const inRange = d <= DAYS_IN[m];
                      const list = inRange ? peopleByMd.get(md) : undefined;
                      const count = list?.length ?? 0;
                      let cls = 'cell ';
                      if (!inRange) { cls += 'c-na'; }
                      else if (md === todayMD) { cls += 'c-today'; }
                      else if (coverage.get(md) === 'pub') { cls += 'c-pub'; }
                      else if (coverage.get(md) === 'draft') { cls += 'c-draft'; }
                      else { cls += 'c-empty'; }
                      if (md === selectedMd) cls += ' c-sel';
                      let title = '';
                      if (inRange) {
                        const base = count ? `${dayMonthLabel(md)} · ${list!.map((x) => x.name).join(', ')}` : `${dayMonthLabel(md)} · open`;
                        title = md === todayMD ? `Today · ${base}` : base;
                      }
                      return (
                        <button
                          key={d}
                          className={cls}
                          title={title}
                          disabled={!inRange}
                          aria-pressed={md === selectedMd}
                          onClick={() => onCell(m, d)}
                        >{count > 0 ? count : ''}</button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* People — the searchable browse grid, day-filtered when a calendar day
            is picked. A day holding more than one story offers a button to switch
            into Born Today reorder mode. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div className="serif" style={{ fontSize: 20, fontWeight: 600 }}>
              {showReorder ? `Born Today order · ${dayMonthLabel(selectedMd!)}` : 'In the library'}
            </div>
            <div className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {selectedMd && (
                <button
                  className="chip chip-gold"
                  style={{ cursor: 'pointer' }}
                  title="Clear day filter"
                  onClick={() => { setSelectedMd(null); setReorderMode(false); }}
                >Born {dayMonthLabel(selectedMd)} ✕</button>
              )}
              {canReorder && (
                showReorder
                  ? <button className="btn btn-sm" onClick={() => setReorderMode(false)}>← Back to cards</button>
                  : <button className="btn btn-sm btn-gold" onClick={() => setReorderMode(true)}>⇅ Reorder Born Today</button>
              )}
              {!showReorder && <span>Showing {shown.length} of {people.length}</span>}
            </div>
          </div>
          {!showReorder && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div className="field search" style={{ flex: 1, minWidth: 260, maxWidth: 420 }}>
                <span className="muted" style={{ fontSize: 15 }}>⌕</span>
                <input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="seg">
                {segments.map((s) => (
                  <button key={s.key} className={segment === s.key ? 'on' : ''} onClick={() => setSegment(s.key)}>{s.label}</button>
                ))}
              </div>
              <select className="control" style={{ marginLeft: 'auto' }} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                <option value="birthday">Sort · Birthday</option>
                <option value="name">Sort · Name</option>
              </select>
            </div>
          )}
        </div>

        {showReorder ? (
          <BornTodayReorder key={reorderKey} people={dayPeople} />
        ) : shown.length === 0 ? (
          <div className="panel" style={{ padding: '48px 24px', textAlign: 'center', border: '1px dashed var(--line2)' }}>
            <div className="serif muted" style={{ fontSize: 16 }}>
              {people.length === 0
                ? 'No people yet. Create the first one.'
                : selectedMd
                  ? `Nobody in the library was born on ${dayMonthLabel(selectedMd)}.`
                  : 'No people match this view.'}
            </div>
            {selectedMd && (
              <button
                className="btn btn-gold btn-sm"
                style={{ marginTop: 14 }}
                onClick={() => openCreate(`2024-${selectedMd}`)}
              >✦ Draft someone born {dayMonthLabel(selectedMd)}</button>
            )}
          </div>
        ) : (
          <div className="cards">
            {shown.map((p) => (
              <PersonCard key={p.slug} p={p} now={now} onDelete={() => setDeleting(p)} />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <CreateDialog
          onClose={() => setCreating(false)}
          existingNames={people.map((p) => p.name)}
          initialDate={createSeed}
        />
      )}
      {deleting && <DeleteDialog person={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
