import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The treasury/passport contract applied to the one write the *child's own
 * chrome* performs. A theme switch is the least dangerous write in the app,
 * which is exactly why it needs the static assertion: it would be the easiest
 * place to slip a convenient `childId` parameter back in, and that parameter is
 * the legacy Base44 IDOR.
 */
describe('theme actions contract', () => {
  const source = readFileSync(join(__dirname, 'actions.ts'), 'utf8');

  it('no exported function accepts a child, family, or email identifier', () => {
    // `child.id` appears only in the WHERE clause, resolved from the session,
    // so assert on the input types instead.
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

  it('whitelists the theme against the shared key module, not a local literal', () => {
    expect(source).toMatch(/import[^;]*isThemeKey/);
    expect(source).toContain('isThemeKey(themeName)');
  });
});
