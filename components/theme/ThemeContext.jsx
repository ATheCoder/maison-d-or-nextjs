'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { THEMES, DEFAULT_THEME } from './themes';

const ThemeContext = createContext();

export function ThemeProvider({ children, childId }) {
  const [currentTheme, setCurrentTheme] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  // Load theme from child profile on mount
  useEffect(() => {
    if (!childId) {
      setLoading(false);
      return;
    }

    const loadTheme = async () => {
      try {
        const child = await base44.entities.Child.filter({ id: childId }, '-created_date', 1).catch(() => []);
        if (child[0]?.theme_preference) {
          setCurrentTheme(child[0].theme_preference);
        }
      } catch (_) {
        // Fallback to default
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [childId]);

  const switchTheme = async (themeName) => {
    if (!THEMES[themeName]) return;
    
    setCurrentTheme(themeName);

    // Persist to child profile
    if (childId) {
      try {
        await base44.entities.Child.update(childId, { theme_preference: themeName }).catch(() => {});
      } catch (_) {}
    }
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