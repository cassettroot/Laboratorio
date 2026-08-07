import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const THEMES = {
  light: {
    id: 'light',
    name: 'Modo Claro',
    bg: '#f8fafc',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    text: '#0f172a',
    subtext: '#64748b',
    headerBg: '#ffffff',
    headerText: '#0f172a',
    brand: '#10b981',
    metricBg: '#ffffff',
    metricText: '#0f172a',
    accentBg: '#e0f2fe',
    gradientColors: ['#ffffff', '#f8fafc']
  },
  dark: {
    id: 'dark',
    name: 'Modo Oscuro',
    bg: '#0f172a',
    cardBg: '#1e293b',
    cardBorder: '#334155',
    text: '#ffffff',
    subtext: '#94a3b8',
    headerBg: '#0f172a',
    headerText: '#ffffff',
    brand: '#10b981',
    metricBg: '#1e293b',
    metricText: '#ffffff',
    accentBg: '#1e293b',
    gradientColors: ['#0f172a', '#1e293b']
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
