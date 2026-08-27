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
import { useEffect, useLayoutEffect, useMemo, useState, useTransition } from 'react';
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
import DatePicker from '@/components/ui/DatePicker';
import { Button, buttonClasses, Code, Confirm, Field, Heading, Overlay, Stat } from '@/components/ds';
import { slugify, SLUG_RE } from '@/lib/slug';
import { flagEmoji } from '@/lib/countries';
import { createPerson, deletePerson, reorderBornToday, suggestPeople, type PersonListItem, type PersonSuggestion } from '@/app/admin/people/actions';

// ── House stylesheet (scoped under .lib) ─────────────────────────────────────
const CSS = `
.lib {
  --ground:var(--surface-page); --panel-t:color-mix(in srgb, var(--surface-raised) 82%, transparent);
  --line:var(--border-fine); --line2:var(--border-accent);
  --ink:var(--text-primary); --brown:var(--text-secondary); --brown2:var(--text-faint); --brown3:var(--text-faint);
  --gold:var(--accent); --gold-deep:var(--accent-readable); --gold-soft:color-mix(in srgb, var(--accent) 14%, transparent);
  --green:#7d8a4e; --amber:#c08a2e; --red:var(--danger-readable);
  --serif:var(--face-display); --sans:var(--face-sans); --script:"Great Vibes",cursive;
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
/* .btn / .btn-gold / .btn-danger / .field / .finput / .flabel / select.control
   are all gone: every one of them was a private copy of a primitive that
   already exists. Buttons are <Button size="sm">, the destructive ones wear
   the house's own btn-danger coat, and every box you type into is <Field>.
   What is left below is geometry the primitives genuinely do not have — the
   calendar cells, the segmented track, the book thumbnails, the drag grips. */
.lib .chip { display:inline-flex; align-items:center; gap:6px; font:700 10px/1 var(--sans); letter-spacing:.06em; text-transform:uppercase; padding:5px 9px; border-radius:999px; border:1px solid var(--line2); color:var(--brown); background:#fffdf8; white-space:nowrap; }
.lib .chip-gold { background:var(--gold-soft); border-color:var(--line2); color:var(--gold-deep); }
.lib .chip-green { background:rgba(125,138,78,.14); border-color:rgba(125,138,78,.4); color:#5f6c37; }
.lib .chip-amber { background:rgba(192,138,46,.14); border-color:rgba(192,138,46,.42); color:#96681f; }
.lib .chip-red { background:rgba(181,83,58,.12); border-color:rgba(181,83,58,.42); color:#96402b; }
.lib .chip-ink { background:rgba(36,26,12,.06); border:1px solid var(--line); color:var(--brown); text-transform:none; letter-spacing:0; font-weight:400; }
.lib .dot { width:9px; height:9px; border-radius:50%; flex:0 0 auto; }
.lib .d-warn { background:var(--amber); box-shadow:0 0 0 2px rgba(192,138,46,.2); }
.lib .d-green { background:var(--green); box-shadow:0 0 0 2px rgba(125,138,78,.2); }
.lib .seg { display:inline-flex; padding:3px; background:rgba(36,26,12,.06); border:1px solid var(--line); border-radius:10px; gap:2px; }
.lib .seg > button { font:700 11px/1 var(--sans); letter-spacing:.04em; padding:8px 13px; border-radius:7px; color:var(--brown2); white-space:nowrap; border:none; background:transparent; }
.lib .seg > button.on { background:#fffdf8; color:var(--ink); box-shadow:0 1px 6px rgba(40,26,12,.1); }

.lib .statrow { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
/* The tile's padding only — the rest is the ds Stat primitive. This block and
   the one in DailyGoldDesk were the same four rules twice, which is what got
   the primitive written. */
.lib .stat { padding:15px 18px; }

.lib .calgrid { display:grid; grid-template-columns:104px repeat(31,minmax(0,1fr)); gap:4px; align-items:center; }
.lib .mlabel { display:block; width:100%; font:700 11px/1 var(--sans); letter-spacing:.12em; text-transform:uppercase; color:var(--brown); text-align:right; padding:0 12px 0 0; background:none; border:none; transition:color .1s ease; }
.lib .mlabel:hover { color:var(--gold-deep); }
.lib .mlabel.on { color:var(--gold-deep); text-decoration:underline; text-underline-offset:3px; text-decoration-thickness:2px; }
.lib .dhead { font:700 9.5px/1 var(--sans); color:var(--brown3); text-align:center; padding-bottom:6px; }
.lib .cell { height:22px; border-radius:5px; transition:transform .1s ease; border:none; padding:0; width:100%; display:flex; align-items:center; justify-content:center; font:700 9px/1 var(--sans); color:rgba(58,42,16,.72); }
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
.lib .pdel { position:absolute; top:9px; right:9px; width:24px; height:24px; border-radius:7px; border:1px solid transparent; background:transparent; color:var(--brown3); display:flex; align-items:center; justify-content:center; font-size:14px; opacity:0; transition:opacity .12s ease; }
.lib .pcard:hover .pdel { opacity:1; }
.lib .pdel:hover { background:rgba(181,83,58,.12); border-color:rgba(181,83,58,.42); color:var(--red); }

.lib .legend { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.lib .lgi { display:flex; align-items:center; gap:7px; font-size:11px; color:var(--brown2); }
.lib .swatch { width:15px; height:15px; border-radius:4px; flex:0 0 auto; }

/* The two dialogs are <Overlay> now — the house's own modal shell, which
   brings the four behaviours the hand-rolled .overlay/.modal pair never had:
   Escape, a focus trap, focus restored on close, and a scroll lock. The
   delete confirm is the one that makes that matter. */

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
@media (prefers-reduced-motion:reduce){ .lib .cell, .lib .pcard{ transition:none; } }
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
      {/* `bare`: the 24px hover-revealed corner square is this stylesheet's
          geometry, but the focus ring and the button semantics are the
          primitive's — it used to be the one control on a card you could tab
          to and not see. */}
      <Button
        variant="bare"
        className="pdel"
        title={`Delete ${p.name}`}
        aria-label={`Delete ${p.name}`}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >✕</Button>

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
    <Overlay onClose={onClose} label="Add a remarkable person" maxWidth={460}>
      {/* No second `.lib` wrapper: the dialog renders inside the library's
          own root, so the scoped stylesheet above already reaches it. Only
          the padding the old `.modal` carried is needed here. */}
      <div style={{ padding: 26 }}>
        <div className="kick">Daily Gold Edition · New book</div>
        <Heading level={2} variant="story" className="mt-2 mb-4">Add a remarkable person</Heading>

        <Field
          autoFocus
          label="Name"
          value={name}
          onChange={(e) => { setName(e.target.value); setCollision(null); }}
          placeholder="Marie Curie"
        />

        {/* The slug's rule lives on the field it governs: `error` takes the
            message seat and turns the box, instead of a loose red <p> that
            nothing points at. */}
        <Field
          label="Slug · folder key, set once here"
          className="mt-4"
          style={{ fontFamily: 'monospace' }}
          value={slugTouched ? slug : effectiveSlug}
          onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); setCollision(null); }}
          placeholder="marie-curie"
          error={!slugValid && effectiveSlug.length > 0
            ? 'Lowercase letters, numbers and single dashes only.'
            : undefined}
        />

        <div className="panel" style={{ marginTop: 18, padding: '14px 15px', background: 'var(--gold-soft)' }}>
          <p className="kick" style={{ margin: 0 }}>✦ Suggest a person born on a date</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 9, alignItems: 'center' }}>
            <DatePicker
              value={sugDate}
              onChange={setSugDate}
              aria-label="Date of birth to suggest for"
              style={{ maxWidth: 200 }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => runSuggest(sugDate)}
              disabled={!sugDate}
              loading={sugPending}
            >{sugPending ? 'Thinking…' : 'Suggest'}</Button>
          </div>
          {sugError && <p role="alert" className="type-caption mt-2 text-danger-readable">{sugError}</p>}
          {suggestions && suggestions.length === 0 && !sugPending && (
            <p className="muted" style={{ fontSize: 12, margin: '9px 0 0' }}>No suggestions for that day.</p>
          )}
          {suggestions && suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 11 }}>
              {suggestions.map((s) => (
                <Button
                  key={s.name}
                  variant="bare"
                  onClick={() => { setName(s.name); setCollision(null); }}
                  className="block w-full rounded-md border border-fine bg-surface-raised px-3 py-2.5 text-left"
                >
                  <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>{s.name}</span>
                  <span className="muted" style={{ fontSize: 12 }}> · {s.birth_date} · {s.field}</span>
                  <span style={{ display: 'block', color: 'var(--brown)', fontSize: 12, marginTop: 3 }}>{s.why}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        {error && <p role="alert" className="type-caption mt-3.5 text-danger-readable">{error}</p>}

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
          <Button variant="link" size="sm" onClick={onClose} disabled={pending}>Cancel</Button>
          {collision ? (
            <Button variant="danger" size="sm" onClick={() => submit(true)} loading={pending}>
              {pending ? 'Overwriting…' : `Overwrite ${collision}`}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => submit(false)}
              disabled={!name.trim() || !slugValid}
              loading={pending}
            >
              {pending ? 'Creating…' : 'Create & edit'}
            </Button>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// ── Delete dialog ────────────────────────────────────────────────────────────

/**
 * This used to be forty lines of Overlay, Heading, Prose, Field and a button
 * pair — the second hand-composed confirm in the house, and the reason there
 * is a `Confirm` primitive at all. The type-to-confirm gate stays because a
 * person and their story brief genuinely cannot be rebuilt from anything else
 * the house holds, which is the bar `requireTyped` documents. Two details
 * quietly improved on the way: the slug is a `Code` (the mono face is a token
 * now, not the `monospace` keyword), and the dead `autoFocus` is gone —
 * Overlay focuses its own panel after React applies it, so it never did
 * anything.
 */
function DeleteDialog({ person, onClose }: { person: PersonListItem; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // The typed string comes back from Confirm and goes straight to the
  // server, which re-checks it: the disabled button is an affordance, the
  // server call is the guard.
  function remove(typed: string) {
    setError(null);
    start(async () => {
      const res = await deletePerson(person.slug, typed);
      if (res.ok) { onClose(); router.refresh(); }
      else setError(res.error ?? 'Could not delete.');
    });
  }

  return (
    <Confirm
      title={`Delete ${person.name}?`}
      confirmLabel={pending ? 'Deleting…' : 'Delete permanently'}
      pending={pending}
      error={error ?? undefined}
      requireTyped={{ value: person.slug }}
      maxWidth={460}
      onCancel={onClose}
      onConfirm={remove}
    >
      <>
        This removes the person and their story brief. Art files in storage are left in place.
        Type <Code>{person.slug}</Code> to confirm.
      </>
    </Confirm>
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
      <Button
        variant="bare"
        ref={setActivatorNodeRef}
        className="grip"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        aria-label={`Reorder ${p.name}`}
      ><GripIcon /></Button>
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
      <Link href={`/admin/people/${p.slug}`} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>Open</Link>
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

  /**
   * Close the create and delete dialogs whenever the library leaves the screen.
   *
   * Under Cache Components <Activity> hides a route instead of unmounting it.
   * The delete dialog is the one that matters: it is guarded by typing the
   * slug, and because the dialog only unmounts when `deleting` clears, a
   * library returned to would come back with the dialog open and the
   * confirmation already typed — one press from deleting a person, with the
   * guard spent on a decision made before the admin left.
   */
  useLayoutEffect(() => () => { setCreating(false); setDeleting(null); }, []);

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
            <Heading level={1} variant="section" className="mt-2">
              The library of remarkable people
            </Heading>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 7 }}>
              <b style={{ color: 'var(--brown)' }}>{people.length}</b> books ·{' '}
              <b style={{ color: 'var(--brown)' }}>{draftCount}</b> in draft ·{' '}
              <b style={{ color: 'var(--gold-deep)' }}>{uncovered}</b> days of the year still uncovered
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button variant="link" size="sm" onClick={() => openCreate(`2024-${todayMD}`)}>✦ Suggest for a date</Button>
            <Button size="sm" onClick={() => openCreate(null)}>+ New person</Button>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="statrow">
          <Stat
            className="panel stat"
            size="sm"
            eyebrow="Live to families"
            eyebrowTone="secondary"
            figure={publishedCount}
            label="books families can read right now"
          />
          <Stat
            className="panel stat"
            size="sm"
            eyebrow="In draft"
            eyebrowTone="secondary"
            figure={draftCount}
            label="started, not yet published"
          />
          {/* tone="accent" is exactly what `.num.warn` meant here — the label
              says "your queue" in as many words, which is the tone's whole
              definition. */}
          <Stat
            className="panel stat"
            size="sm"
            tone="accent"
            eyebrow="Uncovered days"
            figure={uncovered}
            label={<>days with nobody for Born&nbsp;Today — your queue</>}
            style={{ background: 'var(--gold-soft)', borderColor: 'var(--line2)' }}
          />
        </div>

        {/* Calendar coverage */}
        <div className="panel" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <div className="kick">Calendar coverage · what to make next</div>
              <Heading level={2} variant="story" className="mt-1.5">Every day of the year, at a glance</Heading>
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
              <Link
                href={`/admin/people/${todayPerson?.slug}`}
                className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'ml-auto shrink-0' })}
              >
                Open {todayPerson?.name}
              </Link>
            ) : todayState === 'draft' ? (
              <Link
                href={`/admin/people/${todayPerson?.slug}`}
                className={buttonClasses({ variant: 'primary', size: 'sm', className: 'ml-auto shrink-0' })}
              >
                Finish {todayPerson?.name}
              </Link>
            ) : (
              <Button size="sm" className="ml-auto shrink-0" onClick={() => openCreate(`2024-${todayMD}`)}>
                ✦ Suggest someone born {now.getDate()} {ABBR[now.getMonth()]}
              </Button>
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
                    <Button
                      variant="bare"
                      className={`mlabel${month === m ? ' on' : ''}`}
                      title={month === m ? `Clear ${MONTHS[m]} filter` : `Show ${MONTHS[m]} birthdays`}
                      aria-pressed={month === m}
                      onClick={() => setMonth((cur) => (cur === m ? null : m))}
                    >{ab}</Button>
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
                        <Button
                          key={d}
                          variant="bare"
                          className={cls}
                          title={title}
                          disabled={!inRange}
                          aria-pressed={md === selectedMd}
                          onClick={() => onCell(m, d)}
                        >{count > 0 ? count : ''}</Button>
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
            <Heading level={2} variant="story">
              {showReorder ? `Born Today order · ${dayMonthLabel(selectedMd!)}` : 'In the library'}
            </Heading>
            <div className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {selectedMd && (
                <Button
                  variant="bare"
                  className="chip chip-gold"
                  title="Clear day filter"
                  onClick={() => { setSelectedMd(null); setReorderMode(false); }}
                >Born {dayMonthLabel(selectedMd)} ✕</Button>
              )}
              {canReorder && (
                showReorder
                  ? <Button variant="ghost" size="sm" onClick={() => setReorderMode(false)}>← Back to cards</Button>
                  : <Button size="sm" onClick={() => setReorderMode(true)}>⇅ Reorder Born Today</Button>
              )}
              {!showReorder && <span>Showing {shown.length} of {people.length}</span>}
            </div>
          </div>
          {!showReorder && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Field
                size="sm"
                label="Search the library by name"
                labelHidden
                type="search"
                className="min-w-[260px] max-w-[420px] flex-1"
                placeholder="⌕  Search by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="seg" role="group" aria-label="Filter the library">
                {segments.map((s) => (
                  <Button
                    key={s.key}
                    variant="bare"
                    aria-pressed={segment === s.key}
                    className={segment === s.key ? 'on' : ''}
                    onClick={() => setSegment(s.key)}
                  >{s.label}</Button>
                ))}
              </div>
              <Field
                as="select"
                size="sm"
                label="Sort the library"
                labelHidden
                className="ml-auto"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="birthday">Sort · Birthday</option>
                <option value="name">Sort · Name</option>
              </Field>
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
              <Button
                size="sm"
                className="mt-3.5"
                onClick={() => openCreate(`2024-${selectedMd}`)}
              >✦ Draft someone born {dayMonthLabel(selectedMd)}</Button>
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
