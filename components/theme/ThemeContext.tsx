'use client';
import React, { createContext, useContext, useState, useTransition } from 'react';
import { THEMES, DEFAULT_THEME, type Theme } from './themes';
import { isThemeKey, type ThemeKey } from '@/lib/theme-keys';
import { setThemePreference } from '@/app/theme/actions';

/**
 * What `useTheme()` hands back. `theme` is the resolved palette — the thing
 * every component styles from — and `currentTheme` its key, which only the
 * picker needs.
 */
export type ThemeContextValue = {
  currentTheme: ThemeKey;
  theme: Theme;
  /**
   * Takes a plain string, not a `ThemeKey`, and narrows it here. The design-sync
   * bundle publishes this hook on `window.MaisonDoreNext` for hand-written
   * preview code, so an unchecked value is a real caller, not a hypothetical.
   */
  switchTheme: (themeName: string) => void;
  loading: boolean;
  allThemes: typeof THEMES;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// The theme is read on the server and written back through a server action, so
// nothing is fetched here: `initialTheme` is child_profile.theme_preference,
// resolved from the session by whichever layout mounts this provider, and there
// is never a moment of not-knowing on the client.
// `childId` is *not* the identity of the write — the action takes no id and
// resolves the child from the session itself (auth-plan §1). It is read only as
// "is there anyone to persist for", so the grown-up rooms (/family,
// /parent-observatory), which mount this with no child at all, and the edition
// before a reader is chosen, skip the round trip instead of POSTing a no-op.
export function ThemeProvider({
  children,
  childId = null,
  initialTheme = null,
}: {
  children?: React.ReactNode;
  /** child_profile.id, or null in the rooms that have no active child. */
  childId?: string | null;
  /** child_profile.theme_preference — a raw DB value, so any string. */
  initialTheme?: string | null;
}) {
  // A stored key that is no longer a palette (a theme retired between the write
  // and this read) falls back rather than leaving the picker pointing at
  // nothing.
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(
    isThemeKey(initialTheme) ? initialTheme : DEFAULT_THEME,
  );
  const loading = false;
  const [, startPersist] = useTransition();

  const switchTheme = (themeName: string) => {
    if (!isThemeKey(themeName)) return;

    // Optimistic: the palette changes on the tap. The write is a background
    // errand, and a failed one costs the child nothing this visit.
    setCurrentTheme(themeName);
    if (!childId) return;

    startPersist(async () => {
      try {
        await setThemePreference(themeName);
      } catch (error) {
        console.warn('theme: preference not saved', error);
      }
    });
  };

  const theme = THEMES[currentTheme];

  return (
    <ThemeContext.Provider value={{ currentTheme, theme, switchTheme, loading, allThemes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback to default theme instead of crashing
    return {
      currentTheme: DEFAULT_THEME,
      theme: THEMES[DEFAULT_THEME],
      switchTheme: () => {},
      loading: false,
      allThemes: THEMES,
    };
  }
  return context;
}
