import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MD3DarkTheme, MD3LightTheme} from 'react-native-paper';
import {COLORS} from '../constants';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      isDark: false,
      toggleTheme: () => set(state => ({isDark: !state.isDark})),
      setTheme: isDark => set({isDark}),
    }),
    {
      name: 'gym-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
    onPrimary: '#FFFFFF',
    onBackground: COLORS.text,
    onSurface: COLORS.text,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.primaryLight,
    secondary: COLORS.secondary,
    background: COLORS.backgroundDark,
    surface: COLORS.surfaceDark,
    error: COLORS.error,
    onPrimary: '#FFFFFF',
    onBackground: COLORS.textDark,
    onSurface: COLORS.textDark,
  },
};
