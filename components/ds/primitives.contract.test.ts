import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

/**
 * The rule this suite holds: on the Daily Gold page and on the front door,
 * every button, every form control, every heading and every anchor is a
 * components/ds primitive. Not "mostly", and not "unless it looked easier" —
 * those two surfaces were migrated wholesale, and the only thing standing
 * between that and a slow drift back is a test that fails.
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
 * It also holds FamilyManager (/family), GateForm (/gate) and ProfilePicker
 * (/profiles) — three grown-up rooms that were never part of this migration
 * and still carry their own controls. Scanning the directory swept all three
 * in and failed on them, which is how this list stopped being a directory.
 */
const FRONT_DOOR_DIRS = ['app/(front-door)'];

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
      if (target && !target.includes('node_modules')) queue.push(target);
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
  ...FRONT_DOOR_DIRS.flatMap(filesUnder).map((f) => relative(ROOT, f)),
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

describe('Daily Gold and the front door use only ds primitives', () => {
  it('finds the surfaces it is supposed to be guarding', () => {
    // A resolver that silently returns nothing would make every assertion
    // below pass. Anchor on files that must be in scope for the suite to mean
    // anything at all.
    expect(SCOPE).toContain('components/dailygold/DailyGoldEditionPage.tsx');
    expect(SCOPE).toContain('components/dailygold/DGNavigationRail.jsx');
    expect(SCOPE).toContain('components/auth/AuthForm.tsx');
    expect(SCOPE).toContain('components/welcome/WelcomeWizard.tsx');
    expect(SCOPE.length).toBeGreaterThan(40);
  });

  it('excludes the rooms that were never part of the migration', () => {
    // Reached from elsewhere in the app, and keeping their own controls on
    // purpose. If one of them ever does land on a migrated surface, THIS
    // assertion fails first — which is a legible warning that its buttons now
    // need migrating too, rather than a mysterious failure below.
    for (const outsider of [
      'components/dailygold/GoldenStory.jsx',    // /stories/[name]
      'components/dailygold/StorybookView.jsx',  // /stories/[name]
      'components/auth/FamilyManager.tsx',       // /family
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
