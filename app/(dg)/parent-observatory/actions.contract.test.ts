import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The static half of the observatory's trust model (spec §2, §7).
 *
 * This surface inverts the analytics contract rather than repeating it. Ingest
 * bans a client-supplied child id outright; here a guardian must be able to
 * name one, so the passport/treasury/analytics banned-regex list would be
 * exactly wrong. What has to hold instead is that the id is only ever *spent*
 * inside a family-scoped lookup, and that a miss is a null rather than a leak
 * or a crash — which is a property of the source text, not of any one call, and
 * so is asserted the same way the house's other contract tests assert theirs.
 */
describe('parent observatory actions contract', () => {
  const source = readFileSync(join(__dirname, 'actions.ts'), 'utf8');

  it('gates every read on a guardian with a family', () => {
    expect(source).toContain('requireFamily(');
    // One per exported read; a new export that forgets the gate trips this.
    const exported = source.match(/^export async function/gm) ?? [];
    const gated = source.match(/requireFamily\(/g) ?? [];
    expect(gated.length).toBeGreaterThanOrEqual(exported.length);
  });

  it('verifies the client-supplied child id against the caller’s own family', () => {
    // The repo-wide idiom (app/profiles/actions.ts:132-136): the id is a lookup
    // key ANDed with the family, never a value that is trusted on its own.
    expect(source).toMatch(/eq\(childProfile\.id,[^)]*\)/);
    expect(source).toContain('eq(childProfile.familyId, fam.id)');
    expect(source).toMatch(/if \(!child\) return null;/);
  });

  it('runs the guardian gate outside the catch-all', () => {
    // redirect() throws NEXT_REDIRECT. If requireFamily were inside the try,
    // a child-mode session would be swallowed into `null` and bounce between
    // the observatory and its index forever instead of reaching /gate.
    const gate = source.indexOf('await requireFamily(`/parent-observatory/');
    const guard = source.indexOf('if (!child) return null;');
    expect(gate).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(gate);
    // The try that belongs to this function is the first one *after* the guard.
    expect(source.indexOf('\n  try {', guard)).toBeGreaterThan(guard);
  });

  it('never throws to the page — absence and failure are both null', () => {
    expect(source).not.toMatch(/\bthrow\b/);
    expect(source).toContain('return null;');
  });

  it('does not read the session’s active child', () => {
    // A parent surface reached from a child's page: resolving the child from
    // session state would pin the observatory to whoever was last reading,
    // silently ignoring the guardian's choice in the switcher.
    //
    // Prose may explain why these are absent; importing or calling one is the
    // defect (the analytics contract draws the same line).
    expect(source).not.toMatch(/import[^;]*getActiveChild/);
    expect(source).not.toMatch(/getActiveChild\(/);
    expect(source).not.toMatch(/import[^;]*requireChildContext/);
  });

  it('scopes every event read to the verified child', () => {
    // No query may reach analytics_event except through `mine`, which is built
    // once from the row that survived the family check.
    expect(source).toContain('const mine = eq(analyticsEvent.childId, child.id);');
    const childIdFilters = source.match(/eq\(analyticsEvent\.childId,[^)]*\)/g) ?? [];
    expect(childIdFilters).toEqual(['eq(analyticsEvent.childId, child.id)']);
  });

  it('surfaces no diagnostic event types', () => {
    // "She switched profiles at 19:42" is surveillance, not curiosity (spec §5).
    for (const diagnostic of ['reader_switch', 'nav_select', 'shelf_open']) {
      expect(source).not.toContain(`'${diagnostic}'`);
    }
  });

  it('delegates the inferred numbers to unit-tested pure modules', () => {
    expect(source).toMatch(/import[^;]*from '@\/lib\/observatory\/derive'/);
    expect(source).toMatch(/import[^;]*from '@\/lib\/family-time'/);
  });
});
