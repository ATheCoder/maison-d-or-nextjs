import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The cache layer's contract: **a write that a family can see clears the tag it
 * was read under.**
 *
 * This is the one invariant in the repo that fails silently in both directions.
 * A cache that never invalidates looks exactly like a cache that is working —
 * the admin's own screen is refreshed by `revalidatePath`, so the desk shows the
 * edit and only a family sees the month-old copy — and an over-eager
 * invalidation looks exactly like a cache that is working too, because
 * correctness is unaffected and only the hit rate quietly goes to zero. Both
 * shipped: `git log` has "daily gold not cached" and "treasure not appearing"
 * within days of each other.
 *
 * Neither is catchable by a unit test — the failure lives in the *absence* of a
 * call, in a file a future edit will add — so it is asserted the way this
 * house's other contracts are: against the source text, where absence is
 * visible.
 */

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/**
 * The file with its comments removed.
 *
 * Every rule below is about what a module *does*, and half of these files
 * explain in prose the mistake they no longer make — a docblock naming
 * `revalidatePath` is the fix being documented, not the bug returning. The
 * `[^:]` guard leaves `https://` alone.
 */
const code = (path: string) => read(path)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** The module every writer goes through, and the only one allowed to. */
const TAGS = 'lib/daily-gold-tags.ts';

/**
 * Every module that mutates a table the reader's `use cache` entries are built
 * from: the four Daily Gold writers, the two image surfaces, the person
 * library, and the Inngest runs that write without an admin in front of them.
 */
const WRITERS = [
  'app/admin/daily-gold/actions.ts',
  'app/admin/daily-gold/dayActions.ts',
  'app/admin/daily-gold/almanacActions.ts',
  'app/admin/daily-gold/aiActions.ts',
  'app/admin/people/actions.ts',
  'app/admin/imageActions.ts',
  'app/admin/people/imageActions.ts',
  'lib/inngest/functions.ts',
];

/**
 * What counts as a write.
 *
 * Drizzle's three verbs, plus the store functions that own a write on a writer's
 * behalf — `acceptSlotRender` holds no `db.update` of its own and still put a
 * new portrait in front of every family reading that Golden Story.
 */
const MUTATIONS = [
  // `\s*` because a long insert is wrapped: `await db\n  .insert(table)`.
  /\b(?:db|tx)\s*\.\s*(?:insert|update|delete)\(/,
  /\b(?:acceptSlot|uploadSlot|acceptDgSlot|uploadDgSlot|writeDgImageUrl|saveDgScene)\(/,
  /\b(?:renderSlotToCanonical|renderDgSlotToCanonical|paintSlots|runAsk|runBriefJob)\(/,
];

/** Any `touch*` from the tags module — the only sanctioned way to invalidate. */
const TOUCH = /\btouch[A-Z]\w*\(/;
/** The same, global, for the calls a body makes rather than whether it makes one. */
const EVERY_TOUCH = /\btouch[A-Z]\w*\(/g;

/**
 * Mutating exports that deliberately fire no cache tag, with the reason each
 * one is invisible to a reader. `touchDesk` refreshes the admin's own pages and
 * nothing else, so an entry here is a *claim* — "no reader query can return
 * this row" — and it has to stay true. Anything not listed must clear a tag.
 */
const DESK_ONLY: Record<string, string> = {
  prepareDate: "inserts a draft edition; every reader query filters on status = 'ready'",
  prepareWeek: 'seven draft rows, as prepareDate',
  prepareThisDate: 'one draft row, as prepareDate',
  createNewsItem: 'the row is created unpublished, and getGoodNewsForDate returns only published rows',
  updateGoldenThread: 'writes story_brief, which is the writer’s seed and is read by no reader query',
  saveSlotSceneFor: 'image_scene is on no record the reader builds — it is the prompt, not the picture',
};

/**
 * Mutating exports that need no invalidation at all, tags or paths.
 */
const NO_TOUCH: Record<string, string> = {
  purgeAnalyticsEvents: 'deletes analytics_event, which is behind no `use cache` entry',
};

/** Split a module at its top-level declarations, exported or not. */
function declarations(source: string): { name: string; exported: boolean; body: string }[] {
  const boundary = /^(export )?(?:async )?(?:function|const) (\w+)/gm;
  const found = [...source.matchAll(boundary)];
  return found.map((m, i) => ({
    name: m[2],
    exported: !!m[1],
    body: source.slice(m.index!, found[i + 1]?.index ?? source.length),
  }));
}

const mutates = (body: string) => MUTATIONS.some((re) => re.test(body));

/** Every .ts/.tsx under a directory, so a new file cannot dodge these rules. */
function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, entry);
    if (statSync(join(ROOT, rel)).isDirectory()) sources(rel, out);
    else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) out.push(rel);
  }
  return out;
}

describe('daily gold cache contract', () => {
  it('routes every writer through the one module', () => {
    for (const path of WRITERS) {
      expect(read(path), `${path} must import its invalidation from @/lib/daily-gold-tags`)
        .toContain("from '@/lib/daily-gold-tags'");
    }
  });

  it('lets nothing but that module touch next/cache’s invalidation primitives', () => {
    // The bug this closes: `revalidatePath` alone. It clears the router cache
    // for a page, which is a different layer from the `use cache` entry the
    // reader's day is stored in — so a writer holding only `revalidatePath`
    // refreshes the admin's screen, passes review, and leaves a family on a
    // copy `cacheLife('max')` will keep for thirty days. Four writers were in
    // exactly that state. Welding the two halves together inside `touch*` is
    // what stops it recurring, and that only holds if nothing goes around it.
    const offenders = sources('app')
      .concat(sources('lib'))
      .filter((path) => path !== TAGS)
      .filter((path) => /\b(?:revalidatePath|revalidateTag|updateTag)\b/.test(code(path)));
    expect(offenders).toEqual([]);
  });

  it('pairs every write a reader can see with a touch', () => {
    const missing: string[] = [];
    for (const path of WRITERS) {
      for (const decl of declarations(code(path))) {
        if (!decl.exported || !mutates(decl.body)) continue;
        if (decl.name in NO_TOUCH) continue;
        if (!TOUCH.test(decl.body)) missing.push(`${path} → ${decl.name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('makes “this one needs no tag” a declared exception', () => {
    // A `touchDesk` beside a publish is the leak wearing the fix's clothes, so
    // the desk-only writers are named here rather than trusted to a reading of
    // the diff.
    const undeclared: string[] = [];
    for (const path of WRITERS) {
      for (const decl of declarations(code(path))) {
        if (!decl.exported || !mutates(decl.body)) continue;
        if (decl.name in NO_TOUCH || decl.name in DESK_ONLY) continue;
        const touches = decl.body.match(EVERY_TOUCH) ?? [];
        if (touches.length && touches.every((t) => t === 'touchDesk(')) undeclared.push(`${path} → ${decl.name}`);
      }
    }
    expect(undeclared).toEqual([]);
  });

  it('keeps the exemption lists honest', () => {
    // An exemption that no longer names a mutating export is an exemption that
    // will silently cover the next function to take that name.
    const mutating = new Set<string>();
    for (const path of WRITERS) {
      for (const decl of declarations(code(path))) {
        if (decl.exported && mutates(decl.body)) mutating.add(decl.name);
      }
    }
    for (const name of [...Object.keys(DESK_ONLY), ...Object.keys(NO_TOUCH)]) {
      expect(mutating, `${name} is exempt but no longer a mutating export`).toContain(name);
    }
  });

  it('invalidates from Inngest the only way a route handler can', () => {
    // `updateTag` throws outside a Server Action (Next E872), so a job that
    // invalidated the way the desk does would fail its own step — loudly, but
    // only once the run reached that line.
    const source = code('lib/inngest/functions.ts');
    const calls = source.match(/touch(?:Edition|MonthDay|PersonBySlug)\([^)]*\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call).toContain("from: 'job'");
  });

  it('keeps stale-while-revalidate out of the admin desk', () => {
    // The mirror of the rule above. An admin who has just made an edit is
    // looking at the screen: `from: 'job'` would serve them their previous
    // version and make the desk feel broken.
    for (const path of WRITERS.filter((p) => p !== 'lib/inngest/functions.ts')) {
      expect(code(path), `${path} is a Server Action — read-your-own-writes`).not.toContain("from: 'job'");
    }
  });

  it('writes every tag string exactly once', () => {
    // The tag the reader stores under and the tag the writer clears are the
    // same string or they are nothing. A second literal is a tag that goes
    // stale the first time one of the two files is edited and the other is not.
    const literals = ['dg-edition:', 'dg-goodnews:', 'dg-almanac:', 'dg-people:', "'dg-dates'", "'person:"];
    const offenders = sources('app')
      .concat(sources('lib'))
      .filter((path) => path !== TAGS)
      .filter((path) => literals.some((literal) => code(path).includes(literal)));
    expect(offenders).toEqual([]);
  });

  it('never purges the whole data cache to refresh the client', () => {
    // `revalidatePath('/', 'layout')` expires every cached data entry, not just
    // the router cache it reads as targeting. It sat in `setActiveProfile` —
    // the most common interaction in the product — so every profile switch
    // evicted all eight of the reader's `use cache` entries and the caching
    // work rarely got to pay off. `refresh()` is the router-cache-only verb.
    const offenders = sources('app')
      .concat(sources('lib'))
      .filter((path) => /revalidatePath\(\s*'\/'\s*,\s*'layout'\s*\)/.test(code(path)));
    expect(offenders).toEqual([]);
    expect(read('app/profiles/actions.ts')).toContain('refresh()');
  });

  it('reads the tags from the same module it writes them in', () => {
    const queries = read('app/(dg)/daily-gold-edition/queries.ts');
    expect(queries).toContain("from '@/lib/daily-gold-tags'");
    // Every builder the module exports is used by a read; an unused one is a
    // tag some writer clears that nothing is stored under.
    for (const builder of ['dgEditionTag', 'dgGoodNewsTag', 'dgAlmanacTag', 'dgPeopleTag', 'personTag', 'DG_DATES_TAG']) {
      expect(queries, `${builder} is exported but tags no read`).toContain(`${builder}`);
    }
  });
});
