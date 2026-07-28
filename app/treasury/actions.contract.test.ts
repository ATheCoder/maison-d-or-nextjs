import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The same static assertion the passport actions carry: what closes the
 * legacy Base44 IDOR is that no treasury function can be *asked* about a
 * child at all — child identity comes only from the session inside
 * lib/dal.ts. A runtime test cannot express "there is no parameter to
 * attack"; this can.
 */
describe('treasury actions contract', () => {
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
});
