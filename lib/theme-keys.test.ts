import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { THEME_KEYS, DEFAULT_THEME_KEY, isThemeKey } from './theme-keys';

/**
 * components/theme/themes.jsx is a `'use client'` module, so the server cannot
 * import THEMES to learn its keys — this list is a hand-kept copy, and a copy
 * only stays true if something checks. The palette file is read as text rather
 * than imported for the same reason its keys were copied in the first place.
 */
const themesSource = readFileSync(
  join(__dirname, '..', 'components', 'theme', 'themes.jsx'),
  'utf8',
);

/** Top-level entries of `export const THEMES = { … }`: one indent, then `: {`. */
function paletteKeys(source: string): string[] {
  const body = source.slice(source.indexOf('export const THEMES = {'));
  return [...body.matchAll(/^ {2}([A-Za-z][A-Za-z0-9]*): \{$/gm)].map((m) => m[1]);
}

describe('theme keys mirror the palette module', () => {
  it('lists exactly the themes a child can be shown', () => {
    expect(paletteKeys(themesSource)).toEqual([...THEME_KEYS]);
  });

  it('agrees with the palette module about the default', () => {
    expect(themesSource).toContain(`export const DEFAULT_THEME = '${DEFAULT_THEME_KEY}';`);
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
});
