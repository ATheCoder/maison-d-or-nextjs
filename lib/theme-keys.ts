/**
 * The theme keys `child_profile.theme_preference` may hold — the server-safe
 * half of the theme system, and its single source of truth.
 *
 * A theme is no longer a JS palette: each key names a `[data-theme="…"]` block
 * in app/globals.css that re-scopes the semantic design tokens (--surface-*,
 * --text-*, --accent…) onto a different atmosphere's primitives. ThemeProvider
 * only sets the attribute; every color lives in CSS. lib/theme-keys.test.ts
 * holds the two sides together by asserting each key has its block in the
 * stylesheet.
 */
export const THEME_KEYS = [
  'parchment',
  'sage',
  'rose',
  'lavender',
  'periwinkle',
  'dark',
  'navy',
] as const;

export type ThemeKey = (typeof THEME_KEYS)[number];

/** Parchment is the house default: the `:root` token values ARE this theme. */
export const DEFAULT_THEME_KEY: ThemeKey = 'parchment';

/** Display names for pickers (the wizard and the edition's switcher). */
export const THEME_NAMES: Record<ThemeKey, string> = {
  parchment: 'Parchment',
  sage: 'The Garden',
  rose: 'Rose',
  lavender: 'Lavender',
  periwinkle: 'The Sky',
  dark: 'Espresso',
  navy: 'Navy',
};

export const isThemeKey = (v: unknown): v is ThemeKey =>
  typeof v === 'string' && (THEME_KEYS as readonly string[]).includes(v);
