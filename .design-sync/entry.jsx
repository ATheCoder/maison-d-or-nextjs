// design-sync bundle entry for the Maison d'Oré Next.js components.
//
// This repo is a Next.js app, not a publishable library — there is no dist/
// entry to point the converter at. This barrel is that entry: it re-exports
// the presentational design-system surface (and only that), so the bundle
// never pulls in server actions, drizzle, or `server-only`.
//
// Scope deliberately excludes components/admin/* and components/auth/*: those
// are server-action-coupled editors, not design-system parts.
//
// If components are added or removed, update this file AND `componentSrcMap`
// in .design-sync/config.json.

// ── Theme (provider + hook; wraps every preview via cfg.provider) ──
// No palette exports anymore: themes are [data-theme] scopes in globals.css,
// and the hook carries only { themeKey, switchTheme }.
export { ThemeProvider, useTheme } from '@/components/theme/ThemeContext';
export { THEME_KEYS, THEME_NAMES, DEFAULT_THEME_KEY } from '@/lib/theme-keys';

// ── Maison chrome ──
export { default as MaisonBlendedImage } from '@/components/maison/MaisonBlendedImage';
export { default as MaisonBrandName } from '@/components/maison/MaisonBrandName';
export { default as MaisonDivider } from '@/components/maison/MaisonDivider';
export { default as MaisonFooter } from '@/components/maison/MaisonFooter';
export { default as MaisonHeader } from '@/components/maison/MaisonHeader';
export { default as MMonogram } from '@/components/maison/MMonogram';

// ── Treasury ──
export { default as TreasuryHeart } from '@/components/treasury/TreasuryHeart';
export { default as TreasuryView } from '@/components/treasury/TreasuryView';

// ── Daily Gold primitives ──
// The three shapes the edition's sections are built out of. They are already in
// the bundle by way of the sections that import them; they are named here so a
// design agent can see the parts themselves — in particular DGEyebrow, whose
// three-tier `tracking` scale replaced seven ad-hoc letter-spacings and is the
// one thing a redesign must not quietly widen again.
export { default as DGCard } from '@/components/dailygold/DGCard';
export { default as DGHeroImage } from '@/components/dailygold/DGHeroImage';
export { default as DGSectionHeader, DGEyebrow } from '@/components/dailygold/DGSectionHeader';

// ── Daily Gold edition ──
export { default as ChildSwitcherOverlay } from '@/components/dailygold/ChildSwitcherOverlay';
export { default as DailyGoldEdition } from '@/components/dailygold/DailyGoldEditionPage';
export { default as DGBornToday } from '@/components/dailygold/DGBornToday';
export { default as DGDestination } from '@/components/dailygold/DGDestination';
export { default as DGGoodNews } from '@/components/dailygold/DGGoodNews';
export { default as DGGreatestMoments } from '@/components/dailygold/DGGreatestMoments';
export { default as DGHero } from '@/components/dailygold/DGHero';
export { default as DGIdentityHeader } from '@/components/dailygold/DGIdentityHeader';
export { default as DGInspirationBar } from '@/components/dailygold/DGInspirationBar';
export { default as DGMobileTabBar } from '@/components/dailygold/DGMobileTabBar';
export { default as DGModal } from '@/components/dailygold/DGModal';
export { default as DGMoreToExplore } from '@/components/dailygold/DGMoreToExplore';
export { default as DGNavigationRail } from '@/components/dailygold/DGNavigationRail';
export { default as DGOnThisDay } from '@/components/dailygold/DGOnThisDay';
export { default as DGValuesStrip } from '@/components/dailygold/DGValuesStrip';
export { default as DGWaxSealNavigator } from '@/components/dailygold/DGWaxSealNavigator';
export { default as FlagCollectionView } from '@/components/dailygold/FlagCollectionView';
export { default as FlagSealCelebration } from '@/components/dailygold/FlagSealCelebration';
export { default as FlagSealMedallion } from '@/components/dailygold/FlagSealMedallion';
export { default as GoldenStory } from '@/components/dailygold/GoldenStory';
export { default as StorybookView } from '@/components/dailygold/StorybookView';

// ── Shared config the DG components read (nav shelf, icon set) ──
export { DG_DESTINATIONS, DG_SHELF, DGIcon } from '@/components/dailygold/dgNavConfig';
