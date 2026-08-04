import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { THEME_KEYS, DEFAULT_THEME_KEY, isThemeKey } from './theme-keys';

/**
 * This file used to compare THEME_KEYS against the palette names parsed out of
 * components/theme/themes.jsx, because that list was a hand-kept copy and a copy
 * only stays true if something checks.
 *
 * It is no longer a copy. themes.ts declares `THEMES: Record<ThemeKey, Theme>`
 * over this module and re-exports `DEFAULT_THEME_KEY` as `DEFAULT_THEME`, so a
 * palette added on one side and not the other is a type error and the two
 * defaults are one value. What is left to check is that the *declaration* still
 * says that: widening the annotation to `Record<string, Theme>`, or writing the
 * default out as a literal again, would silently switch the guarantee off and
 * type-check clean. Hence a source assertion — the same contract-test shape
 * lib/daily-gold-tags.contract.test.ts uses, and for the same reason.
 *
 * The module is read as text rather than imported because it is a `'use client'`
 * file importing through the `@/` alias, which this suite does not resolve.
 */
const themesSource = readFileSync(
  join(__dirname, '..', 'components', 'theme', 'themes.ts'),
  'utf8',
);

describe('the palette module is bound to this key list', () => {
  it('declares THEMES over ThemeKey, so no palette can drift', () => {
    expect(themesSource).toContain('export const THEMES: Record<ThemeKey, Theme> = {');
  });

  it('takes its default from here rather than restating it', () => {
    expect(themesSource).toContain('export const DEFAULT_THEME = DEFAULT_THEME_KEY;');
  });
});

describe('isThemeKey', () => {
  it('accepts exactly the enum members', () => {
    for (const key of THEME_KEYS) expect(isThemeKey(key)).toBe(true);
    expect(isThemeKey('dark')).toBe(false);          // near-miss for nightMode
    expect(isThemeKey('lightairy')).toBe(false);     // case matters: it is a DB value
    expect(isThemeKey('')).toBe(false);
    expect(isThemeKey(null)).toBe(false);
    expect(isThemeKey({ toString: () => 'nightMode' })).toBe(false);
  });

  it('accepts the default', () => {
    expect(isThemeKey(DEFAULT_THEME_KEY)).toBe(true);
  });
});
