import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

/**
 * The rule this suite holds: on the Daily Gold page, on the front door, across
 * the admin desk, on the landing page and in the family room, every button,
 * every form control,
 * every heading and every anchor is a components/ds primitive. Not "mostly", and not "unless it
 * looked easier" — those surfaces were migrated wholesale, and the only thing
 * standing between that and a slow drift back is a test that fails.
 *
 * Why a source-text assertion rather than a lint rule: the scope is not a
 * directory. `components/dailygold/` also holds GoldenStory, StorybookView and
 * FlagCollectionView, which are reached from elsewhere in the app, were never
 * part of this migration, and still carry raw controls on purpose. An ESLint
 * override keyed on paths would either over-reach into those or need a
 * hand-kept file list that rots. So the Daily Gold half of the scope is
 * DERIVED — walked from the route's own entry points through its imports —
 * which means a file added to the page tomorrow is covered tomorrow, and a
 * file that leaves the tree stops being policed without anyone editing a list.
 *
 * Comments are stripped before matching. The docstrings on these files talk
 * about `<button>` and `<h2>` constantly, and they should keep being able to.
 */

const ROOT = resolve(__dirname, '..', '..');
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

/** The two route entry points the Daily Gold page is actually built from. */
const DG_ENTRIES = [
  'app/(dg)/daily-gold-edition/page.tsx',
  'app/(dg)/layout.tsx',
];

/**
 * The front door is derived the same way, from its route files, and for a
 * sharper reason than symmetry: `components/auth/` is NOT the front door.
 * It also holds GateForm (/gate) and ProfilePicker (/profiles) — two grown-up
 * rooms that were never part of this migration and still carry their own
 * controls. Scanning the directory swept them in and failed on them, which is
 * how this list stopped being a directory.
 *
 * (FamilyManager used to be the third name in that sentence. /family was
 * migrated on 2026-08-27 and is now in scope through FAMILY_ENTRIES below.)
 */
const FRONT_DOOR_DIRS = ['app/(front-door)'];

/**
 * The family room, migrated on 2026-08-27 and derived from its route for the
 * same reason the front door is not derived from `components/auth/`: the
 * directory holds two rooms that have NOT been migrated, and a directory scan
 * would sweep them in.
 *
 * It is the surface that makes the theming half of the rule concrete. This
 * room opened with a private five-colour palette (`C.gold`, `C.ivory`, `C.ink`,
 * …) and painted its own ivory ground at 100vh *inside* the (dg) shell, which
 * was already painting --surface-page — so it was the one destination in the
 * group that ignored the rail's theme picker entirely. Fourteen raw <button>s,
 * six raw <input>s, a raw <select>, five raw <h2>s and a raw <a> went with it.
 *
 * `app/(dg)/layout.tsx` is already walked via DG_ENTRIES, so this adds exactly
 * the page, FamilyManager and what only it reaches.
 */
const FAMILY_ENTRIES = ['app/(dg)/family/page.tsx'];

/**
 * The admin desk, derived from its routes for the same reason the Daily Gold
 * page is: `components/admin/` is *nearly* the whole surface, but the desk
 * also reaches DatePicker, the ds primitives and ImageModal, and it is the
 * REACHABLE set that has to hold — a helper added under a different directory
 * tomorrow is covered tomorrow.
 *
 * The admin was migrated after the other two, and it is where the rule earns
 * its keep: five private stylesheets had each grown their own `.btn`,
 * `.btn-gold`, `.btn-red` and `.field`, four slightly different ways, all of
 * them reaching for raw hexes and rgba() that no theme could re-scope. Those
 * copies are what the primitives replaced; this is what stops them coming
 * back one convenient button at a time.
 */
const ADMIN_DIRS = ['app/admin'];

/**
 * The landing page, added when it was redrawn onto the primitives
 * (2026-08-27). Derived from its route group like the others, which sweeps in
 * exactly the three components only this page mounts — MaisonHeader,
 * MaisonFooter and the wordmark/seal/plate they share — and nothing else,
 * because nothing else imports them.
 *
 * It is the surface that shows why the rule is worth having twice over: this
 * page was 265 lines of inline `style={{ fontFamily: 'var(--font-serif)',
 * fontSize: 'clamp(…)', color: 'var(--brown)' }}` against the LEGACY base44
 * palette — a raw <input> and a raw <button> in the newsletter form, a raw
 * <a> dressed as a gold-bordered CTA in the Goldprint band, and five <h2>s
 * sharing one hand-written `h2style` object. Every one of those is the exact
 * shape the assertions below are written against.
 */
const SITE_DIRS = ['app/(site)'];

/**
 * The Parent Observatory, added when it was moved onto the primitives
 * (2026-08-27). Derived from its three route files, which is what sweeps in the
 * whole of `components/observatory/` — and stops there, because nothing else in
 * the app imports the ledger.
 *
 * It was the last surface in `app/(dg)` still running a design system of its
 * own: a private palette block at the top of observatory.module.css (--canvas,
 * --card, --ink, --gold, --sage, --terracotta), roughly twenty-five hardcoded
 * `rgba(200, 169, 107, α)` gold literals, its own Playfair/Lato/Dancing-Script
 * face stack, and every type size stated in px. None of that could be
 * re-scoped, which is why the room stayed light while the rail beside it
 * themed. It is tokens and primitives now, and this is what keeps it that way.
 */
const OBSERVATORY_ENTRIES = [
  'app/(dg)/parent-observatory/page.tsx',
  'app/(dg)/parent-observatory/[childId]/page.tsx',
  'app/(dg)/parent-observatory/loading.tsx',
];

/**
 * The primitives themselves. A <button> inside components/ds/Button.tsx is
 * not a violation of the rule; it IS the rule. Same for HeartToggle's, and
 * for the close button Overlay draws.
 */
const EXEMPT_PREFIX = 'components/ds/';

/**
 * The one composite widget on a migrated surface that keeps its own controls,
 * and the reasoning, so nobody has to re-derive it:
 *
 * DatePicker is a 697-line ARIA grid — a text field that parses six date
 * formats, a portalled popover that becomes a bottom sheet on phones, roving
 * tabindex across the calendar, and a complete :focus-visible layer of its own
 * in globals.css under "MAISON DATE PICKER". Putting Button inside it would
 * stack a second focus ring over `.mdo-dp-day:focus-visible` and a second
 * dimming over its disabled cells: two rings, two dims, nothing gained. Its
 * inputs are no better a fit — Field models ONE labelled control with ONE
 * message seat, and this is a combobox whose label belongs to the caller plus
 * a hidden form-value carrier that is not a control at all.
 *
 * The distinction that matters: a composite is allowed to exist and is built
 * FROM primitives at its edges; what it must not be is a hand-rolled COPY of
 * one. DGCard was that, and was deleted. This is not.
 *
 * Deliberately a single named file, not a directory or a pattern. A second
 * entry here should have to be argued for.
 */
const COMPOSITE_EXCEPTIONS = ['components/ui/DatePicker.tsx'];

/**
 * Modules a migrated surface RENDERS but does not own, and where the walk
 * therefore stops.
 *
 * There are exactly two, and they are the same thing twice: the person
 * editor's live book preview, in each of the two designs a Golden Story may be
 * read in. The admin embeds `GoldenStory` (the flip-book) or `EditionStory`
 * (the Book Edition) — the very components a family reads at /stories/[name] —
 * so that what the editor shows IS what ships, rather than a second rendering
 * that can drift. That embed makes the reader reachable from an admin route,
 * but it does not make the reader admin chrome: its controls are the child's
 * page-turners and section tabs, on the child's surface, and redressing them
 * from here would change what families see in order to satisfy a rule about an
 * editor.
 *
 * The distinction the whole list turns on: the admin owns the FURNITURE around
 * the preview and every one of those controls is a primitive; the preview is
 * CONTENT, and it belongs to the migration of its own surface, whenever that
 * happens. Stopping the walk here rather than filtering the file afterwards is
 * deliberate — it also keeps everything only these two reach (StorybookView and
 * its siblings) out, which is the same call for the same reason.
 *
 * A third entry should have to be argued for. These two are one exception, not
 * a growing list: they are the same component in the same role, and the day a
 * third reader exists it will be for a third design, not for convenience.
 */
const PREVIEWED = [
  'components/dailygold/GoldenStory.jsx',
  'components/dailygold/EditionStory.tsx',
];

function resolveImport(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null; // a package, not ours
  for (const ext of EXTENSIONS) {
    if (existsSync(base + ext)) return base + ext;
    const indexed = join(base, 'index' + ext);
    if (existsSync(indexed)) return indexed;
  }
  return existsSync(base) && statSync(base).isFile() ? base : null;
}

/** Every first-party module reachable from `entries`, following imports. */
function reachableFrom(entries: string[]): string[] {
  const seen = new Set<string>();
  const queue = entries.map((e) => join(ROOT, e));
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const [, spec] of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const target = resolveImport(spec, file);
      if (!target || target.includes('node_modules')) continue;
      if (PREVIEWED.includes(relative(ROOT, target))) continue;
      queue.push(target);
    }
  }
  return [...seen];
}

function filesUnder(dir: string): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesUnder(join(dir, entry.name))
      : EXTENSIONS.some((ext) => entry.name.endsWith(ext))
        ? [join(abs, entry.name)]
        : [],
  );
}

/** Block comments, line comments and the CSS-in-template-string blocks. */
function stripCommentary(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

const SCOPE = reachableFrom([
  ...DG_ENTRIES,
  ...FAMILY_ENTRIES,
  ...OBSERVATORY_ENTRIES,
  ...[...FRONT_DOOR_DIRS, ...ADMIN_DIRS, ...SITE_DIRS]
    .flatMap(filesUnder)
    .map((f) => relative(ROOT, f)),
])
  .map((file) => relative(ROOT, file))
  // JSX lives in JSX files. This is not a shortcut — it is what keeps the
  // server actions, the query modules and lib/email.ts's HTML template out of
  // a suite about components, and it keeps CSS-in-template-string modules like
  // galleryCss.ts from reading as markup.
  .filter((file) => file.endsWith('.tsx') || file.endsWith('.jsx'))
  .filter((file) => !file.startsWith(EXEMPT_PREFIX))
  .filter((file) => !COMPOSITE_EXCEPTIONS.includes(file))
  .filter((file) => !file.includes('.test.'))
  .filter((file, i, all) => all.indexOf(file) === i)
  .sort();

/** What each raw element should have been. */
const BANNED: Array<{ pattern: RegExp; element: string; use: string }> = [
  { pattern: /<button[\s>]/g, element: '<button>', use: 'Button' },
  { pattern: /<input[\s>]/g, element: '<input>', use: 'Field' },
  { pattern: /<select[\s>]/g, element: '<select>', use: 'Field as="select"' },
  { pattern: /<textarea[\s>]/g, element: '<textarea>', use: 'Field as="textarea"' },
  { pattern: /<h[1-6][\s>]/g, element: '<h1>–<h6>', use: 'Heading' },
  /*
   * The anchor rule is here because its absence is what let three of these
   * through the first pass. A raw <a> is not obviously wrong the way a raw
   * <button> is, so the CTA bar and the invite toast quietly grew gold pills:
   * an <a> wearing btn-primary's fill in inline styles, plus a raw
   * --palette-* ink, with no focus ring and no hover. A rule that only
   * watches <button> cannot see a button that isn't one.
   *
   * So: no raw <a> on either surface. Every one of them has a better answer —
   * TextLink for prose, `Button href` for an action that navigates, and
   * next/link for in-app navigation (a <Link> is not a raw <a> and is not
   * matched here; the nav rail, the tab bar and the gallery doors all keep
   * theirs). This is not a ban on anchors. It is a ban on dressing one by
   * hand when a primitive already knows how.
   */
  { pattern: /<a[\s>]/g, element: '<a>', use: 'TextLink, Button href, or next/link' },
];

describe('Daily Gold, the front door, the admin desk, the landing page and /family use only ds primitives', () => {
  it('finds the surfaces it is supposed to be guarding', () => {
    // A resolver that silently returns nothing would make every assertion
    // below pass. Anchor on files that must be in scope for the suite to mean
    // anything at all.
    expect(SCOPE).toContain('components/dailygold/DailyGoldEditionPage.tsx');
    expect(SCOPE).toContain('components/dailygold/DGNavigationRail.jsx');
    expect(SCOPE).toContain('components/auth/AuthForm.tsx');
    expect(SCOPE).toContain('components/welcome/WelcomeWizard.tsx');
    // The admin's five biggest screens, each of which used to carry its own
    // copy of the button and the field.
    expect(SCOPE).toContain('components/admin/DailyGoldDesk.tsx');
    expect(SCOPE).toContain('components/admin/PeopleLibrary.tsx');
    expect(SCOPE).toContain('components/admin/DayEditor.tsx');
    expect(SCOPE).toContain('components/admin/AlmanacEditor.tsx');
    expect(SCOPE).toContain('components/admin/PersonEditor.tsx');
    // The observatory's ledger and its skeleton — the surface migrated last,
    // and the one whose stylesheet used to carry a palette of its own.
    expect(SCOPE).toContain('components/observatory/ObservatoryLedger.tsx');
    expect(SCOPE).toContain('components/observatory/ObservatorySkeletons.tsx');
    // The landing page and the two pieces of chrome only it mounts.
    expect(SCOPE).toContain('app/(site)/page.tsx');
    expect(SCOPE).toContain('components/maison/MaisonHeader.tsx');
    expect(SCOPE).toContain('components/maison/MaisonFooter.tsx');
    // The family room, whose whole point is that it is reached from the (dg)
    // rail rather than from any directory this suite scans.
    expect(SCOPE).toContain('components/auth/FamilyManager.tsx');
    expect(SCOPE.length).toBeGreaterThan(40);
  });

  it('excludes the rooms that were never part of the migration', () => {
    // Reached from elsewhere in the app, and keeping their own controls on
    // purpose. If one of them ever does land on a migrated surface, THIS
    // assertion fails first — which is a legible warning that its buttons now
    // need migrating too, rather than a mysterious failure below.
    for (const outsider of [
      'components/dailygold/GoldenStory.jsx',    // /stories/[name] · flip-book
      'components/dailygold/EditionStory.tsx',   // /stories/[name] · Book Edition
      'components/dailygold/StorybookView.jsx',  // /stories/[name]
      'components/auth/GateForm.tsx',            // /gate
      'components/auth/ProfilePicker.tsx',       // /profiles
    ]) {
      expect(SCOPE).not.toContain(outsider);
    }
  });

  it('keeps the composite exception list to exactly what was argued for', () => {
    // The exception is a decision, not a hole. If it grows, that should be a
    // visible diff on this line with a reason beside it — not a quiet addition
    // that makes a failing suite pass.
    expect(COMPOSITE_EXCEPTIONS).toEqual(['components/ui/DatePicker.tsx']);
    // Same rule for the previewed modules. There are two, and they are the two
    // designs a Golden Story is read in — the editor embeds whichever one the
    // person's story_format names, so both are reachable from an admin route
    // and neither is admin chrome. Argued for at PREVIEWED; a THIRD entry has
    // to be argued for on this line, not added quietly to make a red suite
    // green.
    expect(PREVIEWED).toEqual([
      'components/dailygold/GoldenStory.jsx',
      'components/dailygold/EditionStory.tsx',
    ]);
    for (const previewed of PREVIEWED) expect(existsSync(join(ROOT, previewed))).toBe(true);
    // And it has to still be reachable: an exception for a file that no longer
    // lands on either surface is dead weight that would silently excuse a
    // future file of the same name.
    expect(existsSync(join(ROOT, COMPOSITE_EXCEPTIONS[0]))).toBe(true);
  });

  it.each(BANNED)('uses $use, never a raw $element', ({ pattern, element, use }) => {
    const offenders = SCOPE.flatMap((file) => {
      const code = stripCommentary(readFileSync(join(ROOT, file), 'utf8'));
      const hits = [...code.matchAll(pattern)].length;
      return hits ? [`${file} (${hits}×)`] : [];
    });
    expect(
      offenders,
      `Raw ${element} on a migrated surface. Use ${use} from '@/components/ds' — ` +
        `Button has a coat-less \`bare\` variant for controls whose look belongs ` +
        `to a stylesheet, and Field takes \`labelHidden\` where the label is ` +
        `already implied. Every ds primitive is stamped on /design; if what you ` +
        `need is not there, add it there first.`,
    ).toEqual([]);
  });
});
