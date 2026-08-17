import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { THEME_KEYS, THEME_NAMES, DEFAULT_THEME_KEY, isThemeKey } from './theme-keys';

/**
 * A theme is a `[data-theme="…"]` block in app/globals.css — CSS the compiler
 * cannot see from here. This suite is the seam-holder: every key this module
 * whitelists must have its scope block in the stylesheet, or a child could
 * pick a theme that styles nothing. Source assertion over import for the same
 * reason lib/daily-gold-tags.contract.test.ts reads text: the other side of
 * the contract is not a JS module.
 */
const globalsSource = readFileSync(
  join(__dirname, '..', 'app', 'globals.css'),
  'utf8',
);

describe('every theme key has its CSS scope', () => {
  it.each(THEME_KEYS)('[data-theme="%s"] exists in globals.css', (key) => {
    expect(globalsSource).toContain(`[data-theme="${key}"]`);
  });

  it('every key has a display name', () => {
    for (const key of THEME_KEYS) {
      expect(THEME_NAMES[key]).toBeTruthy();
    }
  });

  it('defaults to parchment — the :root token values themselves', () => {
    expect(DEFAULT_THEME_KEY).toBe('parchment');
  });
});

describe('isThemeKey', () => {
  it('accepts exactly the enum members', () => {
    for (const key of THEME_KEYS) expect(isThemeKey(key)).toBe(true);
    expect(isThemeKey('nightMode')).toBe(false); // retired JS-palette key
    expect(isThemeKey('lightAiry')).toBe(false); // retired default: old DB rows
    expect(isThemeKey('Dark')).toBe(false); // case matters: it is a DB value
    expect(isThemeKey('')).toBe(false);
    expect(isThemeKey(null)).toBe(false);
    expect(isThemeKey({ toString: () => 'dark' })).toBe(false);
  });

  it('accepts the default', () => {
    expect(isThemeKey(DEFAULT_THEME_KEY)).toBe(true);
  });
});
