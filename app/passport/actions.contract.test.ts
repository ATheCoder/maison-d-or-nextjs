import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The static assertion from spec R8.6: the property that closes the legacy
 * IDOR (L1) is that no flag-seal function can be *asked* about a child at
 * all — child identity comes only from the session inside lib/dal.ts. A
 * runtime test cannot express "there is no parameter to attack"; this can.
 */
describe('passport actions contract', () => {
  const source = readFileSync(join(__dirname, 'actions.ts'), 'utf8');

  it('no exported function accepts a child, family, or email identifier', () => {
    // Any of these appearing as an input parameter or input-type member would
    // reopen the attack surface. `childId:` appears only in DB values written
    // from the session-resolved child, so assert on the input types instead.
    for (const banned of [/input.*child_?[iI]d/, /child_?[iI]d\??:.*(?:input|param)/i, /familyId\??:/, /parent_?[eE]mail/, /email\??:/]) {
      expect(source).not.toMatch(banned);
    }
  });

  it('resolves the child via the non-redirecting session helper', () => {
    expect(source).toContain('getActiveChild()');
    // Prose may mention the redirecting helper; importing it is the defect.
    expect(source).not.toMatch(/import[^;]*requireChildContext/);
  });
});
