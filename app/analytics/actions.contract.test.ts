import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The static half of the analytics trust model (analytics plan §1): the client
 * reports what, never who. A runtime test cannot express "there is no parameter
 * to attack" — this can, by reading the action source as text.
 *
 * The first three assertions are the treasury/passport contract verbatim; the
 * last two are what analytics adds on top — replay safety and the fact that all
 * whitelisting is delegated to a pure module that has its own suite.
 */
describe('analytics actions contract', () => {
  const source = readFileSync(join(__dirname, 'actions.ts'), 'utf8');

  it('no exported function accepts a child, family, or email identifier', () => {
    // `childId:` appears only in DB values written from the session-resolved
    // child, so assert on the input types instead.
    for (const banned of [/input.*child_?[iI]d/, /child_?[iI]d\??:.*(?:input|param)/i, /familyId\??:/, /parent_?[eE]mail/, /email\??:/]) {
      expect(source).not.toMatch(banned);
    }
  });

  it('resolves the child via the non-redirecting session helper', () => {
    expect(source).toContain('getActiveChild()');
    // Prose may mention the redirecting helper; importing it is the defect.
    expect(source).not.toMatch(/import[^;]*requireChildContext/);
  });

  it('never throws to the client — every path returns a status', () => {
    expect(source).not.toMatch(/\bthrow\b/);
    expect(source).toContain("reason: 'db_error'");
  });

  it('writes idempotently, so a replayed batch adds no rows', () => {
    expect(source).toContain('onConflictDoNothing');
  });

  it('delegates event whitelisting to the unit-tested pure module', () => {
    expect(source).toMatch(/import[^;]*normaliseEventBatch/);
  });
});
