import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  colors: typeof COLORS.light | typeof COLORS.dark;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_STORAGE_KEY = 'fitpass_theme_mode';

// Comprehensive color palette
export const COLORS = {
  light: {
    // Backgrounds
    bg: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      inverted: '#0f172a',
    },
    // Text colors
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#64748b',
      muted: '#94a3b8',
      accent: '#0284c7',
      success: '#16a34a',
      warning: '#ea580c',
      error: '#dc2626',
    },
    // UI Elements
    border: {
      light: '#e2e8f0',
      default: '#cbd5e1',
      dark: '#94a3b8',
    },
    // Component specific
    input: {
      bg: '#ffffff',
      border: '#cbd5e1',
      placeholder: '#94a3b8',
      focus: '#0284c7',
    },
    button: {
      primary: '#0284c7',
      primaryHover: '#0369a1',
      secondary: '#f1f5f9',
      secondaryText: '#0f172a',
      success: '#16a34a',
      warning: '#ea580c',
      error: '#dc2626',
    },
    card: {
      bg: '#ffffff',
      border: '#e2e8f0',
      shadow: '#00000014',
    },
    chip: {
      bg: '#f1f5f9',
      border: '#cbd5e1',
      text: '#0f172a',
    },
    overlay: '#00000020',
  },
  dark: {
    // Backgrounds
    bg: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
      inverted: '#ffffff',
    },
    // Text colors
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      muted: '#64748b',
      accent: '#06b6d4',
      success: '#86efac',
      warning: '#fed7aa',
      error: '#fca5a5',
    },
    // UI Elements
    border: {
      light: '#334155',
      default: '#475569',
      dark: '#64748b',
    },
    // Component specific
    input: {
      bg: '#1e293b',
      border: '#475569',
      placeholder: '#64748b',
      focus: '#06b6d4',
    },
    button: {
      primary: '#06b6d4',
      primaryHover: '#0891b2',
      secondary: '#1e293b',
      secondaryText: '#f1f5f9',
      success: '#86efac',
      warning: '#fed7aa',
      error: '#fca5a5',
    },
    card: {
      bg: '#1e293b',
      border: '#334155',
      shadow: '#00000066',
    },
    chip: {
      bg: '#334155',
      border: '#475569',
      text: '#f1f5f9',
    },
    overlay: '#00000080',
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeState(stored);
          return;
        }
      } catch {}
      setThemeState('system');
    };

    loadTheme();

    // Listen to system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme === 'light' ? 'light' : 'dark');
    });

    // Set initial system theme
    const colorScheme = Appearance.getColorScheme();
    setSystemTheme(colorScheme === 'light' ? 'light' : 'dark');

    return () => subscription.remove();
  }, []);

  const setTheme = async (mode: ThemeMode) => {
    // Update state IMMEDIATELY for instant UI update
    setThemeState(mode);
    
    // Save to storage in background (don't await to avoid delay)
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(err => {
      console.error('Failed to save theme:', err);
    });
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    setTheme(next);
  };

  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  const isDark = effectiveTheme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  const value = useMemo(() => ({
    theme,
    isDark,
    setTheme,
    toggleTheme,
    colors,
  }), [theme, isDark, colors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function useThemeClasses() {
  const { isDark, colors } = useTheme();

  const screenClass = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const cardClass = isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200';
  const panelClass = isDark ? 'bg-slate-700 border border-slate-600' : 'bg-slate-100 border border-slate-200';
  const panelMuted = isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const textAccent = isDark ? 'text-cyan-400' : 'text-blue-600';
  const textAccentSoft = isDark ? 'text-blue-200' : 'text-blue-600';
  const input = isDark ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-900';

  return {
    isDark,
    colors,
    // Direct property names (primary naming)
    screenClass,
    cardClass,
    panelClass,
    panelMuted,
    textPrimary,
    textSecondary,
    textMuted,
    textAccent,
    textAccentSoft,
    input,
    // Aliases for cleaner naming
    screen: screenClass,
    card: cardClass,
    panel: panelClass,
  };
}

// NativeWind-compatible theme helpers
export const lightStyles = StyleSheet.create({
  screenBg: { backgroundColor: COLORS.light.bg.primary },
  cardBg: { backgroundColor: COLORS.light.card.bg },
  textPrimary: { color: COLORS.light.text.primary },
  textSecondary: { color: COLORS.light.text.secondary },
});

export const darkStyles = StyleSheet.create({
  screenBg: { backgroundColor: COLORS.dark.bg.primary },
  cardBg: { backgroundColor: COLORS.dark.card.bg },
  textPrimary: { color: COLORS.dark.text.primary },
  textSecondary: { color: COLORS.dark.text.secondary },
});
