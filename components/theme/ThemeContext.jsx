'use client';
import React, { createContext, useContext, useState } from 'react';
import { THEMES, DEFAULT_THEME } from './themes';

const ThemeContext = createContext();

// PERSISTENCE DISABLED — `childId` is now a child_profile UUID from the
// session, which the Base44 `Child` entity has never seen: the read below
// would never match and the write would create an orphan row keyed to a
// child that does not exist there. Until `child_profile.theme_preference`
// lands (auth-plan §8, phase 5) the theme is in-memory only: switching still
// works for the visit, it just does not survive a reload.
// `childId` is optional and currently unread — the grown-up rooms (/family,
// /parent-observatory) mount this with no child at all, and even the edition
// passes `child?.id`, which is undefined before a reader is chosen. The JSDoc
// is load-bearing: without it TS infers the parameter's type from the default
// and decides the prop may only ever be null, which breaks /treasury and
// /passport where a real id is passed.
/** @param {{ children?: React.ReactNode, childId?: string | null }} props */
export function ThemeProvider({ children, childId = null }) {
  const [currentTheme, setCurrentTheme] = useState(DEFAULT_THEME);
  // Nothing is fetched, so there is never a moment of not-knowing.
  const loading = false;

  // // Load theme from child profile on mount
  // useEffect(() => {
  //   if (!childId) {
  //     setLoading(false);
  //     return;
  //   }
  //
  //   const loadTheme = async () => {
  //     try {
  //       const child = await base44.entities.Child.filter({ id: childId }, '-created_date', 1).catch(() => []);
  //       if (child[0]?.theme_preference) {
  //         setCurrentTheme(child[0].theme_preference);
  //       }
  //     } catch (_) {
  //       // Fallback to default
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //
  //   loadTheme();
  // }, [childId]);

  const switchTheme = async (themeName) => {
    if (!THEMES[themeName]) return;

    setCurrentTheme(themeName);

    // // Persist to child profile
    // if (childId) {
    //   try {
    //     await base44.entities.Child.update(childId, { theme_preference: themeName }).catch(() => {});
    //   } catch (_) {}
    // }
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