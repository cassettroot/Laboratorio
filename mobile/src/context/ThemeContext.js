import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const THEMES = {
  dark: {
    id: 'dark',
    name: 'Deep Dark • LabKeep Cian',
    isDark: true,
    bg: '#000000',
    bgGradient: ['#040711', '#060b17', '#020409', '#000000'],
    ambientOrbs: [
      { color: 'rgba(6, 182, 212, 0.22)', top: -50, left: -50, size: 320 },
      { color: 'rgba(139, 92, 246, 0.15)', top: 200, right: -40, size: 280 },
      { color: 'rgba(14, 165, 233, 0.18)', bottom: 40, left: 20, size: 300 }
    ],
    glassBg: 'rgba(7, 16, 34, 0.75)',
    glassCardBg: 'rgba(11, 22, 44, 0.75)',
    glassCardBorder: 'rgba(34, 211, 238, 0.20)',
    glassBorder: 'rgba(34, 211, 238, 0.15)',
    glassBorderGlow: 'rgba(6, 182, 212, 0.45)',
    glassPill: 'rgba(15, 29, 58, 0.80)',
    glassInput: 'rgba(7, 16, 34, 0.85)',
    text: '#ffffff',
    subtext: '#94a3b8',
    mutedText: '#64748b',
    headerBg: 'rgba(3, 7, 18, 0.88)',
    headerText: '#ffffff',
    tabBarBg: 'rgba(3, 7, 18, 0.90)',
    tabBarBorder: 'rgba(34, 211, 238, 0.20)',
    tabBarActive: '#22d3ee',
    tabBarInactive: '#64748b',
    brand: '#06b6d4',
    brandLight: '#22d3ee',
    brandSecondary: '#0284c7',
    brandGradient: ['#06b6d4', '#0284c7'],
    metricBg: 'rgba(11, 22, 44, 0.75)',
    metricText: '#ffffff',
    accentBg: 'rgba(6, 182, 212, 0.12)',
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    blurIntensity: 35,
    blurTint: 'dark'
  },
  light: {
    id: 'light',
    name: 'Modo Claro Institucional',
    isDark: false,
    bg: '#f8fafc',
    bgGradient: ['#f8fafc', '#e0f2fe', '#e2e8f0'],
    ambientOrbs: [
      { color: 'rgba(6, 182, 212, 0.18)', top: -50, left: -50, size: 280 },
      { color: 'rgba(14, 165, 233, 0.20)', bottom: 100, right: -40, size: 300 },
      { color: 'rgba(56, 189, 248, 0.14)', top: 260, right: 30, size: 220 }
    ],
    glassBg: 'rgba(255, 255, 255, 0.82)',
    glassCardBg: 'rgba(255, 255, 255, 0.88)',
    glassCardBorder: 'rgba(6, 182, 212, 0.35)',
    glassBorder: 'rgba(203, 213, 225, 0.60)',
    glassBorderGlow: 'rgba(6, 182, 212, 0.25)',
    glassPill: 'rgba(255, 255, 255, 0.92)',
    glassInput: 'rgba(255, 255, 255, 0.95)',
    text: '#0f172a',
    subtext: '#475569',
    mutedText: '#64748b',
    headerBg: 'rgba(255, 255, 255, 0.90)',
    headerText: '#0f172a',
    tabBarBg: 'rgba(255, 255, 255, 0.92)',
    tabBarBorder: 'rgba(6, 182, 212, 0.25)',
    tabBarActive: '#0891b2',
    tabBarInactive: '#64748b',
    brand: '#0891b2',
    brandLight: '#06b6d4',
    brandSecondary: '#0284c7',
    brandGradient: ['#0891b2', '#0284c7'],
    metricBg: 'rgba(255, 255, 255, 0.88)',
    metricText: '#0f172a',
    accentBg: 'rgba(6, 182, 212, 0.10)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.10,
    blurIntensity: 25,
    blurTint: 'light'
  }
};

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState('dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('@app_theme_mobile');
        if (saved && THEMES[saved]) {
          setThemeName(saved);
        } else {
          setThemeName('dark');
        }
      } catch (e) {
        console.warn("Error cargando tema guardado:", e);
      }
    };
    loadTheme();
  }, []);

  const changeTheme = async (name) => {
    if (THEMES[name]) {
      setThemeName(name);
      try {
        await AsyncStorage.setItem('@app_theme_mobile', name);
      } catch (e) {
        console.warn("Error guardando tema:", e);
      }
    }
  };

  const theme = THEMES[themeName] || THEMES.dark;

  return (
    <ThemeContext.Provider value={{
      theme,
      themeName,
      changeTheme,
      themesList: Object.values(THEMES),
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
