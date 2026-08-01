/**
 * The theme keys `child_profile.theme_preference` may hold — the server-safe
 * half of the theme system.
 *
 * The palettes themselves live in components/theme/themes.jsx, which carries
 * `'use client'`: importing THEMES from a server action would hand the action a
 * client *reference* rather than the object, so its keys cannot be read there.
 * Hence this plain module, mirroring lib/avatars.ts. The two lists must stay in
 * step; lib/theme-keys.test.ts fails if they drift.
 */
export const THEME_KEYS = [
  'lightAiry',
  'coastalBlue',
  'sageEarth',
  'blushGold',
  'nightMode',
] as const;

export type ThemeKey = (typeof THEME_KEYS)[number];

/** Matches DEFAULT_THEME in components/theme/themes.jsx. */
export const DEFAULT_THEME_KEY: ThemeKey = 'lightAiry';

export const isThemeKey = (v: unknown): v is ThemeKey =>
  typeof v === 'string' && (THEME_KEYS as readonly string[]).includes(v);
