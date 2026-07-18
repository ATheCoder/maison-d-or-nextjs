'use client';
/**
 * The remarkable-people library (Phase 2): a searchable, filterable list over
 * existing people with a create flow (name → slug preview → collision-confirmed
 * insert) and a typed-slug delete confirmation. House admin style; badges reuse
 * the editor design's chip/dot vocabulary. Interactive bits only — the server
 * page loads the data and re-renders it on revalidation.
 */
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { slugify, SLUG_RE } from '@/lib/slug';
import { createPerson, deletePerson, suggestPeople, type PersonListItem, type PersonSuggestion } from '@/app/admin/people/actions';

// ── House palette ────────────────────────────────────────────────────────────
const C = {
  bg: '#F5F0E7',
  card: 'rgba(255,248,238,0.8)',
  border: 'rgba(201,169,110,0.25)',
  borderStrong: 'rgba(201,169,110,0.5)',
  gold: '#C9A96E',
  ink: '#241A0C',
  brown: '#5C4A2A',
  muted: '#8B7355',
  green: '#4B7A4A',
  amber: '#B07A2E',
  red: '#9B4B3F',
};
const serif = '"Playfair Display", Georgia, serif';
const sans = 'Lato, sans-serif';

type Filter = 'all' | 'draft' | 'incomplete';

function monthDayLabel(md: string | null): string {
  if (!md) return 'No birth date';
  const [m, d] = md.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}`;
}

// ── Small presentational bits ────────────────────────────────────────────────

function Chip({ tone, children }: { tone: 'green' | 'amber' | 'gold' | 'muted'; children: React.ReactNode }) {
  const color = { green: C.green, amber: C.amber, gold: C.gold, muted: C.muted }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase',
      color, border: `1px solid ${color}55`, background: `${color}14`,
      borderRadius: 999, padding: '0.15rem 0.5rem', fontFamily: sans, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function Dot({ tone }: { tone: 'green' | 'amber' | 'muted' }) {
  const color = { green: C.green, amber: C.amber, muted: 'rgba(139,115,85,0.35)' }[tone];
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />;
}

const btn = (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
  padding: '0.5rem 1.05rem', borderRadius: 10, fontFamily: sans, fontSize: '0.75rem',
  letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
  border: `1px solid ${variant === 'danger' ? `${C.red}88` : C.borderStrong}`,
  background: variant === 'primary' ? C.gold : 'transparent',
  color: variant === 'primary' ? '#3A2B12' : variant === 'danger' ? C.red : C.brown,
});

// ── Cards ────────────────────────────────────────────────────────────────────

function PersonCard({ p, onDelete }: { p: PersonListItem; onDelete: () => void }) {
  const filled = p.totalImages - p.emptyImages;
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <Link href={`/admin/people/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{
          height: 130, background: '#EDE3D2', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {p.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: serif, color: C.muted, fontSize: '0.8rem' }}>No cover</span>
          )}
          <span style={{ position: 'absolute', top: 8, right: 8 }}>
            {p.published
              ? <Chip tone="green"><Dot tone="green" />Published</Chip>
              : <Chip tone="amber"><Dot tone="amber" />Draft</Chip>}
          </span>
        </div>
      </Link>

      <div style={{ padding: '0.85rem 0.95rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1 }}>
        <div>
          <Link href={`/admin/people/${p.slug}`} style={{ textDecoration: 'none' }}>
            <h3 style={{ fontFamily: serif, fontSize: '1.02rem', fontWeight: 600, color: C.ink, margin: 0 }}>
              {p.name}
            </h3>
          </Link>
          <p style={{ fontFamily: sans, fontSize: '0.68rem', color: C.muted, margin: '0.15rem 0 0' }}>
            {monthDayLabel(p.monthDay)} · <code style={{ fontSize: '0.66rem' }}>{p.slug}</code>
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
          <Chip tone={p.emptyImages === 0 ? 'green' : 'muted'}>{filled}/{p.totalImages} art</Chip>
          <Chip tone={p.chapterCount >= 4 ? 'green' : 'amber'}>{p.chapterCount} ch</Chip>
          {p.hasBrief && <Chip tone="gold">Brief</Chip>}
          {p.incomplete && <Chip tone="amber">Incomplete</Chip>}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.35rem' }}>
          <Link href={`/admin/people/${p.slug}`} style={{ ...btn('ghost'), textDecoration: 'none', display: 'inline-block' }}>
            Edit
          </Link>
          <button onClick={onDelete} style={{ ...btn('danger'), padding: '0.4rem 0.7rem' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Create dialog ────────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(36,26,12,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 50,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.bg, border: `1px solid ${C.borderStrong}`, borderRadius: 16,
        padding: '1.75rem', width: 'min(440px, 100%)', boxShadow: '0 20px 60px rgba(36,26,12,0.35)',
      }}>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem', borderRadius: 10, boxSizing: 'border-box',
  border: `1px solid ${C.borderStrong}`, background: 'rgba(255,255,255,0.6)',
  fontFamily: sans, fontSize: '0.9rem', color: C.ink,
};
const labelStyle: React.CSSProperties = {
  fontFamily: sans, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase',
  color: C.muted, display: 'block', margin: '0 0 0.35rem',
};

function CreateDialog({ onClose, existingNames }: { onClose: () => void; existingNames: string[] }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collision, setCollision] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // "Suggest a person born on a date" (Phase 5) — the year is irrelevant, only
  // the month-day matters for Born Today.
  const [sugDate, setSugDate] = useState('');
  const [suggestions, setSuggestions] = useState<PersonSuggestion[] | null>(null);
  const [sugError, setSugError] = useState<string | null>(null);
  const [sugPending, startSug] = useTransition();

  function fetchSuggestions() {
    setSugError(null);
    setSuggestions(null);
    const monthDay = sugDate.slice(5); // 'YYYY-MM-DD' → 'MM-DD'
    startSug(async () => {
      const res = await suggestPeople(monthDay, existingNames);
      if (res.ok) setSuggestions(res.suggestions);
      else setSugError(res.error);
    });
  }

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
    <Overlay onClose={onClose}>
      <h2 style={{ fontFamily: serif, fontSize: '1.3rem', color: C.ink, margin: '0 0 1.1rem' }}>New person</h2>

      <label style={labelStyle}>Name</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => { setName(e.target.value); setCollision(null); }}
        placeholder="Marie Curie"
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: '1rem' }}>Slug (folder key — set once, here)</label>
      <input
        value={slugTouched ? slug : effectiveSlug}
        onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); setCollision(null); }}
        placeholder="marie-curie"
        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}
      />
      {!slugValid && effectiveSlug.length > 0 && (
        <p style={{ fontFamily: sans, fontSize: '0.7rem', color: C.red, margin: '0.4rem 0 0' }}>
          Lowercase letters, numbers and single dashes only.
        </p>
      )}

      <div style={{ marginTop: '1.1rem', padding: '0.85rem 0.9rem', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(201,169,110,0.08)' }}>
        <label style={{ ...labelStyle, margin: 0, color: C.gold }}>✦ Suggest a person born on a date</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
          <input type="date" value={sugDate} onChange={(e) => setSugDate(e.target.value)} style={{ ...inputStyle, maxWidth: 190 }} />
          <button
            onClick={fetchSuggestions}
            style={{ ...btn('ghost'), opacity: !sugDate || sugPending ? 0.5 : 1, whiteSpace: 'nowrap' }}
            disabled={!sugDate || sugPending}
          >{sugPending ? 'Thinking…' : 'Suggest'}</button>
        </div>
        {sugError && <p style={{ fontFamily: sans, fontSize: '0.72rem', color: C.red, margin: '0.5rem 0 0' }}>{sugError}</p>}
        {suggestions && suggestions.length === 0 && !sugPending && (
          <p style={{ fontFamily: sans, fontSize: '0.72rem', color: C.muted, margin: '0.5rem 0 0' }}>No suggestions for that day.</p>
        )}
        {suggestions && suggestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
            {suggestions.map((s) => (
              <button
                key={s.name}
                onClick={() => { setName(s.name); setCollision(null); }}
                style={{
                  textAlign: 'left', background: 'rgba(255,255,255,0.5)', border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '0.5rem 0.6rem', cursor: 'pointer', fontFamily: sans,
                }}
              >
                <span style={{ fontWeight: 700, color: C.ink, fontSize: '0.82rem' }}>{s.name}</span>
                <span style={{ color: C.muted, fontSize: '0.72rem' }}> · {s.birth_date} · {s.field}</span>
                <span style={{ display: 'block', color: C.brown, fontSize: '0.72rem', marginTop: '0.15rem' }}>{s.why}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p style={{ fontFamily: sans, fontSize: '0.78rem', color: C.red, margin: '0.9rem 0 0' }}>{error}</p>}

      {collision && (
        <div style={{
          marginTop: '1rem', padding: '0.8rem 0.9rem', borderRadius: 10,
          background: `${C.amber}14`, border: `1px solid ${C.amber}55`,
          fontFamily: sans, fontSize: '0.8rem', color: C.brown,
        }}>
          A person already exists at <code>{effectiveSlug}</code>. Overwrite <strong>{collision}</strong>?
          This resets them to a blank draft (their published story goes offline; art files are kept).
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.4rem' }}>
        <button onClick={onClose} style={btn('ghost')} disabled={pending}>Cancel</button>
        {collision ? (
          <button onClick={() => submit(true)} style={btn('danger')} disabled={pending}>
            {pending ? 'Overwriting…' : `Overwrite ${collision}`}
          </button>
        ) : (
          <button
            onClick={() => submit(false)}
            style={{ ...btn('primary'), opacity: !name.trim() || !slugValid || pending ? 0.5 : 1 }}
            disabled={!name.trim() || !slugValid || pending}
          >
            {pending ? 'Creating…' : 'Create & edit'}
          </button>
        )}
      </div>
    </Overlay>
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
    <Overlay onClose={onClose}>
      <h2 style={{ fontFamily: serif, fontSize: '1.3rem', color: C.ink, margin: '0 0 0.6rem' }}>
        Delete {person.name}?
      </h2>
      <p style={{ fontFamily: sans, fontSize: '0.82rem', color: C.brown, margin: '0 0 1rem', lineHeight: 1.5 }}>
        This removes the person and their story brief. Art files in storage are left in place.
        Type <code style={{ color: C.ink }}>{person.slug}</code> to confirm.
      </p>
      <input
        autoFocus
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={person.slug}
        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}
      />
      {error && <p style={{ fontFamily: sans, fontSize: '0.78rem', color: C.red, margin: '0.7rem 0 0' }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.4rem' }}>
        <button onClick={onClose} style={btn('ghost')} disabled={pending}>Cancel</button>
        <button
          onClick={confirm}
          style={{ ...btn('danger'), opacity: typed !== person.slug || pending ? 0.5 : 1 }}
          disabled={typed !== person.slug || pending}
        >
          {pending ? 'Deleting…' : 'Delete permanently'}
        </button>
      </div>
    </Overlay>
  );
}

// ── Library ──────────────────────────────────────────────────────────────────

export default function PeopleLibrary({ people }: { people: PersonListItem[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PersonListItem | null>(null);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.slug.includes(q)) return false;
      if (filter === 'draft' && p.published) return false;
      if (filter === 'incomplete' && !p.incomplete) return false;
      return true;
    });
  }, [people, search, filter]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${people.length})` },
    { key: 'draft', label: `Drafts (${people.filter((p) => !p.published).length})` },
    { key: 'incomplete', label: `Incomplete (${people.filter((p) => p.incomplete).length})` },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '2.5rem clamp(1.5rem, 5vw, 4rem)', fontFamily: sans }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.6rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Link href="/admin" style={{ fontSize: '0.66rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.gold, textDecoration: 'none' }}>
            ← Administration
          </Link>
          <h1 style={{ fontFamily: serif, fontSize: '1.9rem', fontWeight: 600, color: C.ink, margin: '0.4rem 0 0' }}>
            Remarkable people
          </h1>
        </div>
        <button onClick={() => setCreating(true)} style={btn('primary')}>+ New person</button>
      </div>

      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or slug…"
          style={{ ...inputStyle, maxWidth: 280 }}
        />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                ...btn('ghost'),
                background: filter === f.key ? C.gold : 'transparent',
                color: filter === f.key ? '#3A2B12' : C.brown,
                textTransform: 'none', letterSpacing: '0.02em', fontSize: '0.72rem',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div style={{
          border: `1px dashed ${C.borderStrong}`, borderRadius: 14, padding: '3rem 1.5rem',
          textAlign: 'center', color: C.muted, fontFamily: serif,
        }}>
          {people.length === 0 ? 'No people yet. Create the first one.' : 'No people match this filter.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.1rem' }}>
          {shown.map((p) => (
            <PersonCard key={p.slug} p={p} onDelete={() => setDeleting(p)} />
          ))}
        </div>
      )}

      {creating && <CreateDialog onClose={() => setCreating(false)} existingNames={people.map((p) => p.name)} />}
      {deleting && <DeleteDialog person={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
