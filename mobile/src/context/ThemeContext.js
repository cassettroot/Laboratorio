import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const THEMES = {
  itma: {
    id: 'itma',
    name: 'Verde ITMA',
    bg: '#f0fdf4',
    cardBg: '#ffffff',
    cardBorder: '#a7f3d0',
    text: '#064e3b',
    subtext: '#047857',
    headerBg: '#047857',
    headerText: '#ffffff',
    brand: '#059669',
    metricBg: '#064e3b',
    metricText: '#ffffff',
    accentBg: '#dcfce7',
    gradientColors: ['#f0fdf4', '#dcfce7']
  },
  light: {
    id: 'light',
    name: 'Modo Día',
    bg: '#f8fafc',
    cardBg: '#ffffff',
    cardBorder: '#cbd5e1',
    text: '#0f172a',
    subtext: '#334155',
    headerBg: '#0f172a',
    headerText: '#ffffff',
    brand: '#0d9488',
    metricBg: '#0f172a',
    metricText: '#ffffff',
    accentBg: '#ccfbf1',
    gradientColors: ['#f8fafc', '#f1f5f9']
  },
  dark: {
    id: 'dark',
    name: 'Modo Noche',
    bg: '#0f172a',
    cardBg: '#1e293b',
    cardBorder: '#334155',
    text: '#f8fafc',
    subtext: '#cbd5e1',
    headerBg: '#1e293b',
    headerText: '#38bdf8',
    brand: '#38bdf8',
    metricBg: '#1e293b',
    metricText: '#ffffff',
    accentBg: '#0f2942',
    gradientColors: ['#0f172a', '#1e293b']
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    bg: '#1e1b4b',
    cardBg: '#2e1065',
    cardBorder: '#6d28d9',
    text: '#ffffff',
    subtext: '#ddd6fe',
    headerBg: '#2e1065',
    headerText: '#c084fc',
    brand: '#a855f7',
    metricBg: '#2e1065',
    metricText: '#ffffff',
    accentBg: '#3b0764',
    gradientColors: ['#0f172a', '#2e1065', '#4c1d95']
  },
  ocean: {
    id: 'ocean',
    name: 'Océano',
    bg: '#042f2e',
    cardBg: '#065f46',
    cardBorder: '#0f766e',
    text: '#ffffff',
    subtext: '#ccfbf1',
    headerBg: '#064e3b',
    headerText: '#2dd4bf',
    brand: '#14b8a6',
    metricBg: '#064e3b',
    metricText: '#ffffff',
    accentBg: '#042f2e',
    gradientColors: ['#064e3b', '#0f766e', '#155e75']
  },
  sunset: {
    id: 'sunset',
    name: 'Atardecer',
    bg: '#451a03',
    cardBg: '#78350f',
    cardBorder: '#b45309',
    text: '#ffffff',
    subtext: '#fef3c7',
    headerBg: '#451a03',
    headerText: '#fbbf24',
    brand: '#f59e0b',
    metricBg: '#78350f',
    metricText: '#ffffff',
    accentBg: '#451a03',
    gradientColors: ['#451a03', '#78350f', '#881337']
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda',
    bg: '#022c22',
    cardBg: '#064e3b',
    cardBorder: '#059669',
    text: '#ecfdf5',
    subtext: '#a7f3d0',
    headerBg: '#064e3b',
    headerText: '#34d399',
    brand: '#10b981',
    metricBg: '#064e3b',
    metricText: '#ffffff',
    accentBg: '#022c22',
    gradientColors: ['#022c22', '#064e3b', '#047857']
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Ciberpunk',
    bg: '#09090b',
    cardBg: '#18181b',
    cardBorder: '#facc15',
    text: '#facc15',
    subtext: '#fef08a',
    headerBg: '#18181b',
    headerText: '#facc15',
    brand: '#facc15',
    metricBg: '#18181b',
    metricText: '#facc15',
    accentBg: '#27272a',
    gradientColors: ['#09090b', '#27272a']
  },
  amethyst: {
    id: 'amethyst',
    name: 'Amatista',
    bg: '#31103f',
    cardBg: '#581c87',
    cardBorder: '#e879f9',
    text: '#f5d0fe',
    subtext: '#f0abfc',
    headerBg: '#581c87',
    headerText: '#f5d0fe',
    brand: '#e879f9',
    metricBg: '#581c87',
    metricText: '#ffffff',
    accentBg: '#31103f',
    gradientColors: ['#31103f', '#701a75']
  },
  cosmos: {
    id: 'cosmos',
    name: 'Cosmos',
    bg: '#030712',
    cardBg: '#111827',
    cardBorder: '#eab308',
    text: '#fef08a',
    subtext: '#fde047',
    headerBg: '#111827',
    headerText: '#eab308',
    brand: '#eab308',
    metricBg: '#111827',
    metricText: '#ffffff',
    accentBg: '#030712',
    gradientColors: ['#030712', '#1f2937']
  }
};

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('@app_theme_mobile');
        if (saved && THEMES[saved]) {
          setThemeName(saved);
        }
      } catch (e) {
        console.warn("Error cargando tema guardado:", e);
      }
    };
    loadTheme();
  }, []);

  const changeTheme = async (newTheme) => {
    if (THEMES[newTheme]) {
      setThemeName(newTheme);
      try {
        await AsyncStorage.setItem('@app_theme_mobile', newTheme);
      } catch (e) {
        console.warn("Error guardando tema:", e);
      }
    }
  };

  const theme = THEMES[themeName] || THEMES.light;

  return (
    <ThemeContext.Provider value={{
      themeName,
      theme,
      changeTheme,
      themesList: Object.values(THEMES)
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
