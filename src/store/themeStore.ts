import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MD3DarkTheme} from 'react-native-paper';
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

// Gymblix is dark-only (the volt brand). Both `lightTheme` and `darkTheme`
// resolve to the same dark brand palette so Paper components (TextInput,
// Button, etc.) render with the correct surfaces, lime accent and #9CA3A0
// secondary text on every screen — matching the Stitch UI kit. Building these
// on MD3DarkTheme keeps all the derived tokens (outline, elevation levels,
// onSurfaceVariant…) dark instead of leaking Material light greys onto the
// near-black background.
const brandColors = {
  ...MD3DarkTheme.colors,
  primary: COLORS.primary, // Volt Lime
  onPrimary: COLORS.background, // dark text on lime CTAs (per design)
  primaryContainer: '#3A4D00',
  onPrimaryContainer: COLORS.primaryLight,
  secondary: COLORS.secondary,
  onSecondary: '#00210B',
  background: COLORS.background,
  onBackground: COLORS.text,
  surface: COLORS.surface, // #161D1A — filled input / card background
  onSurface: COLORS.text,
  surfaceVariant: COLORS.cardDark, // #1E2622
  onSurfaceVariant: COLORS.textSecondary, // #9CA3A0 — labels & placeholders
  surfaceDisabled: 'rgba(245,247,245,0.08)',
  onSurfaceDisabled: COLORS.placeholder,
  outline: COLORS.border, // #2A332E — input borders
  outlineVariant: '#434933',
  error: COLORS.error,
  onError: '#FFFFFF',
  placeholder: COLORS.textSecondary,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: brandColors,
};

// Kept for the App's `isDark ? darkTheme : lightTheme` toggle — same dark brand
// theme, since the app has no light mode.
export const lightTheme = darkTheme;
