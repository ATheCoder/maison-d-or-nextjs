'use client';
import React, { createContext, useContext, useState, useTransition } from 'react';
import { THEMES, DEFAULT_THEME } from './themes';
import { setThemePreference } from '@/app/theme/actions';

const ThemeContext = createContext();

// The theme is read on the server and written back through a server action, so
// nothing is fetched here: `initialTheme` is child_profile.theme_preference,
// resolved from the session by whichever layout mounts this provider, and there
// is never a moment of not-knowing on the client.
// `childId` is *not* the identity of the write — the action takes no id and
// resolves the child from the session itself (auth-plan §1). It is read only as
// "is there anyone to persist for", so the grown-up rooms (/family,
// /parent-observatory), which mount this with no child at all, and the edition
// before a reader is chosen, skip the round trip instead of POSTing a no-op.
// The JSDoc is load-bearing: without it TS infers each parameter's type from
// its default and decides the props may only ever be null, which breaks
// /treasury and /passport where a real id and a real theme are passed.
/** @param {{ children?: React.ReactNode, childId?: string | null, initialTheme?: string | null }} props */
export function ThemeProvider({ children, childId = null, initialTheme = null }) {
  // A stored key that is no longer a palette (a theme retired between the write
  // and this read) falls back rather than leaving the picker pointing at
  // nothing.
  const [currentTheme, setCurrentTheme] = useState(
    initialTheme && THEMES[initialTheme] ? initialTheme : DEFAULT_THEME,
  );
  const loading = false;
  const [, startPersist] = useTransition();

  const switchTheme = (themeName) => {
    if (!THEMES[themeName]) return;

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

  const theme = THEMES[currentTheme] || THEMES[DEFAULT_THEME];

  return (
    <ThemeContext.Provider value={{ currentTheme, theme, switchTheme, loading, allThemes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
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