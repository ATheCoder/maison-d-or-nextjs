'use client';
/**
 * MAISON D'ORE ACADEMY THEME SYSTEM
 * Five switchable themes. Default: Light & Airy (warm, luminous, cream-champagne)
 * Reference: Official mood board (oil painting style, golden light, soft edges)
 *
 * The key list is not declared here. `THEMES` is a `Record<ThemeKey, Theme>`
 * over lib/theme-keys.ts — the server-safe half of this system — so the two
 * cannot drift: a palette this file forgets is a missing-property error, and one
 * lib/theme-keys.ts has never heard of is an excess-property error. Same for the
 * default, which is that module's `DEFAULT_THEME_KEY` re-exported under the name
 * the client components already import.
 *
 * Adding a sixth theme is therefore: add its key to THEME_KEYS, then satisfy the
 * compiler here — every field of `Theme`, the picker's `swatch` included.
 */

import { FONTS, COLORS, RADIUS, SHADOWS } from '@/lib/maisonDesignSystem';
import { DEFAULT_THEME_KEY, type ThemeKey } from '@/lib/theme-keys';

export type { ThemeKey };

/**
 * One palette. Every field is consumed as an inline style value, which is why
 * the radii are pre-formatted into CSS strings here rather than at each of the
 * thirty-odd call sites.
 */
export type Theme = {
  /** Shown in the theme picker's accessible label. */
  name: string;
  /**
   * The picker's colour dot. It belongs to the palette rather than to a lookup
   * table beside the picker so a new theme cannot ship without one: the map this
   * replaced lived in DGHero and fell back to grey for any key it had not been
   * told about.
   */
  swatch: string;
  bgParchment: string;
  bgPrimary: string;
  bgSoft: string;
  bgCard: string;
  bgOverlay: string;
  textHeadline: string;
  textBody: string;
  textMuted: string;
  accentGold: string;
  accentSage: string;
  accentSecondary: string;
  accentTertiary: string;
  fontHeadline: string;
  fontBody: string;
  radius: string;
  radiusSmall: string;
  shadow: string;
  shadowSoft: string;
  shadowDeep: string;
};

export const THEMES: Record<ThemeKey, Theme> = {
  lightAiry: {
    // Light & Airy (Default) — Warm, cream, luminous
    name: 'Light & Airy',
    swatch: '#E8D5B0',
    bgParchment: COLORS.champagne,
    bgPrimary: COLORS.parchment,
    bgSoft: COLORS.champagne,
    bgCard: '#FBF8F1',
    bgOverlay: 'rgba(250, 246, 236, 0.95)',
    textHeadline: COLORS.gold,
    textBody: COLORS.mocha,
    textMuted: COLORS.clay,
    accentGold: COLORS.gold,
    accentSage: COLORS.sage,
    accentSecondary: '#C46D46',
    accentTertiary: '#A89968',
    fontHeadline: FONTS.headlineSerif,
    fontBody: FONTS.bodyClean,
    radius: `${RADIUS.modal}px`,
    radiusSmall: `${RADIUS.small}px`,
    shadow: SHADOWS.soft,
    shadowSoft: '0 2px 8px rgba(44, 36, 22, 0.04)',
    shadowDeep: SHADOWS.modal,
  },

  coastalBlue: {
    name: 'Coastal Blue',
    swatch: '#8AAEC8',
    bgParchment: '#EBF1F8',
    bgPrimary: '#F0F5FB',
    bgSoft: '#E8F1F8',
    bgCard: '#F7FAFC',
    bgOverlay: 'rgba(240, 245, 251, 0.95)',
    textHeadline: '#2B5A7D',
    textBody: '#354D62',
    textMuted: '#6B8FA0',
    accentGold: COLORS.gold,
    accentSage: '#5B8A7E',
    accentSecondary: '#A0C4D4',
    accentTertiary: '#7FB3C9',
    fontHeadline: FONTS.headlineSerif,
    fontBody: FONTS.bodyClean,
    radius: `${RADIUS.modal}px`,
    radiusSmall: `${RADIUS.small}px`,
    shadow: '0 4px 16px rgba(43, 90, 125, 0.08)',
    shadowSoft: '0 2px 8px rgba(43, 90, 125, 0.04)',
    shadowDeep: '0 12px 32px rgba(43, 90, 125, 0.12)',
  },

  sageEarth: {
    name: 'Sage & Earth',
    swatch: '#8FA88A',
    bgParchment: '#E9E5DC',
    bgPrimary: '#EFEFEA',
    bgSoft: '#E9E5DC',
    bgCard: '#F5F2EC',
    bgOverlay: 'rgba(239, 239, 234, 0.95)',
    textHeadline: '#6B7359',
    textBody: '#4A4A42',
    textMuted: '#7F8A78',
    accentGold: COLORS.gold,
    accentSage: COLORS.sage,
    accentSecondary: '#A08968',
    accentTertiary: '#9B8C6E',
    fontHeadline: FONTS.headlineSerif,
    fontBody: FONTS.bodyClean,
    radius: `${RADIUS.modal}px`,
    radiusSmall: `${RADIUS.small}px`,
    shadow: '0 4px 16px rgba(75, 74, 66, 0.08)',
    shadowSoft: '0 2px 8px rgba(75, 74, 66, 0.04)',
    shadowDeep: '0 12px 32px rgba(75, 74, 66, 0.12)',
  },

  blushGold: {
    name: 'Blush & Gold',
    swatch: '#D4A898',
    bgParchment: '#F5ECEB',
    bgPrimary: '#FBF5F3',
    bgSoft: '#F7EEEA',
    bgCard: '#FEF9F6',
    bgOverlay: 'rgba(251, 245, 243, 0.95)',
    textHeadline: '#A86D5F',
    textBody: '#5C3E35',
    textMuted: '#9B7B73',
    accentGold: '#D4AF37',
    accentSage: '#8B8B82',
    accentSecondary: '#D4857F',
    accentTertiary: '#C08F85',
    fontHeadline: FONTS.headlineSerif,
    fontBody: FONTS.bodyClean,
    radius: `${RADIUS.modal}px`,
    radiusSmall: `${RADIUS.small}px`,
    shadow: '0 4px 16px rgba(92, 62, 53, 0.08)',
    shadowSoft: '0 2px 8px rgba(92, 62, 53, 0.04)',
    shadowDeep: '0 12px 32px rgba(92, 62, 53, 0.12)',
  },

  nightMode: {
    name: 'Night Mode',
    swatch: '#2A3540',
    bgParchment: '#111C1E',
    bgPrimary: '#0D1819',
    bgSoft: '#141E21',
    bgCard: '#1A2529',
    bgOverlay: 'rgba(13, 24, 25, 0.95)',
    textHeadline: '#D4AF37',
    textBody: '#E8DCC8',
    textMuted: '#9B9B93',
    accentGold: COLORS.gold,
    accentSage: '#6B8F7C',
    accentSecondary: '#8B7F6B',
    accentTertiary: '#7A7A6B',
    fontHeadline: FONTS.headlineSerif,
    fontBody: FONTS.bodyClean,
    radius: `${RADIUS.modal}px`,
    radiusSmall: `${RADIUS.small}px`,
    shadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    shadowSoft: '0 2px 8px rgba(0, 0, 0, 0.2)',
    shadowDeep: '0 12px 32px rgba(0, 0, 0, 0.4)',
  },
};

export const DEFAULT_THEME = DEFAULT_THEME_KEY;
