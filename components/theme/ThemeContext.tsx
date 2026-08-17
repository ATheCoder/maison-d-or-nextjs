'use client';
import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { DEFAULT_THEME_KEY, isThemeKey, type ThemeKey } from '@/lib/theme-keys';
import { setThemePreference } from '@/app/theme/actions';

/**
 * What `useTheme()` hands back. There is no palette object anymore: a theme is
 * a `[data-theme]` scope in app/globals.css, and components style themselves
 * with the semantic tokens (`var(--surface-raised)`, `text-primary`, …). The
 * hook exists only for the pickers.
 */
export type ThemeContextValue = {
  themeKey: ThemeKey;
  /**
   * Takes a plain string, not a `ThemeKey`, and narrows it here. The design-sync
   * bundle publishes this hook on `window.MaisonDoreNext` for hand-written
   * preview code, so an unchecked value is a real caller, not a hypothetical.
   */
  switchTheme: (themeName: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// The theme is read on the server and written back through a server action, so
// nothing is fetched here: `initialTheme` is child_profile.theme_preference,
// resolved from the session by whichever layout mounts this provider — the
// data-theme wrapper is therefore in the SSR HTML and there is no flash of the
// wrong theme.
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
  // A stored key that is no longer a theme (retired between the write and this
  // read) falls back rather than leaving the picker pointing at nothing.
  const [themeKey, setThemeKey] = useState<ThemeKey>(
    isThemeKey(initialTheme) ? initialTheme : DEFAULT_THEME_KEY,
  );
  const [, startPersist] = useTransition();

  // Mirror the key onto <html> so `html[data-theme] body` can keep the
  // overscroll/behind-the-page area in the theme's ground on dark and navy.
  // Effect-only, so the pre-hydration frame stays the theme-neutral fallback —
  // the wrapper below is what actually themes the content, and that IS in the
  // SSR HTML.
  useEffect(() => {
    document.documentElement.dataset.theme = themeKey;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [themeKey]);

  const switchTheme = (themeName: string) => {
    if (!isThemeKey(themeName)) return;

    // Optimistic: the tokens re-scope on the tap. The write is a background
    // errand, and a failed one costs the child nothing this visit.
    setThemeKey(themeName);
    if (!childId) return;

    startPersist(async () => {
      try {
        await setThemePreference(themeName);
      } catch (error) {
        console.warn('theme: preference not saved', error);
      }
    });
  };

  return (
    <ThemeContext.Provider value={{ themeKey, switchTheme }}>
      {/* display:contents — no box, no layout impact, but custom-property
          inheritance still flows through it, so everything below re-scopes. */}
      <div data-theme={themeKey} style={{ display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback to default theme instead of crashing
    return {
      themeKey: DEFAULT_THEME_KEY,
      switchTheme: () => {},
    };
  }
  return context;
}
