/**
 * The theme keys `child_profile.theme_preference` may hold — the server-safe
 * half of the theme system, and its single source of truth.
 *
 * The palettes themselves live in components/theme/themes.ts, which carries
 * `'use client'`: importing THEMES from a server action would hand the action a
 * client *reference* rather than the object, so its keys cannot be read there.
 * Hence this plain module, mirroring lib/avatars.ts.
 *
 * This list is no longer a hand-kept copy of the one over there. `THEMES` is
 * declared `Record<ThemeKey, Theme>` and `DEFAULT_THEME` is `DEFAULT_THEME_KEY`
 * re-exported, so the palette module cannot add, drop or rename a theme without
 * this file agreeing — the compiler enforces what a text-comparing test used to.
 */
export const THEME_KEYS = [
  'lightAiry',
  'coastalBlue',
  'sageEarth',
  'blushGold',
  'nightMode',
] as const;

export type ThemeKey = (typeof THEME_KEYS)[number];

/** Re-exported as `DEFAULT_THEME` by components/theme/themes.ts. */
export const DEFAULT_THEME_KEY: ThemeKey = 'lightAiry';

export const isThemeKey = (v: unknown): v is ThemeKey =>
  typeof v === 'string' && (THEME_KEYS as readonly string[]).includes(v);
