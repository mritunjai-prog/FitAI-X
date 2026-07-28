import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors, ThemeColors } from '../theme';
import * as Haptics from 'expo-haptics';

type ThemeContextType = {
  isDark: boolean;
  C: ThemeColors;
  toggleTheme: () => void;
  bgColors: readonly [string, string, ...string[]];
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DARK_BG = [DarkColors.bg, "#1a1813", "#081a20", DarkColors.bg] as const;
const LIGHT_BG = [LightColors.bg, "#e8e6df", "#dff0f5", LightColors.bg] as const;

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('@theme_mode');
        if (storedTheme !== null) {
          setIsDark(storedTheme === 'dark');
        }
      } catch (e) {
        console.error('Failed to load theme', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newTheme = !isDark;
    setIsDark(newTheme);
    try {
      await AsyncStorage.setItem('@theme_mode', newTheme ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const C = isDark ? DarkColors : LightColors;
  const bgColors = isDark ? DARK_BG : LIGHT_BG;

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ isDark, C, toggleTheme, bgColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
