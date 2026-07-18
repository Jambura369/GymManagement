// Centralized design tokens for the Gymblix dark / "volt" brand UI.
// Import COLORS / FONT_FAMILY / FONT_SIZE / SPACING / RADIUS from here instead
// of hardcoding values in screens, so every screen stays in sync with one
// source of truth. This is a separate, newer system from `src/constants`
// (which still powers the older light/red theme used by the dashboard
// screens) — adopt it screen-by-screen as they're redesigned.

export const COLORS = {
  // Backgrounds
  background: '#0B0F0E',
  surface: '#161D1A',
  surfaceElevated: '#1E2622',

  // Brand accents
  primary: '#C6FF00', // Volt Lime — primary CTAs, active nav, key highlights, links
  secondary: '#39FF88', // Mint Green — success states, secondary highlights

  // Structure
  border: '#2A332E',

  // Text
  textPrimary: '#F5F7F5',
  textSecondary: '#9CA3A0',
  textDisabled: '#5C645F',

  // Status
  success: '#39FF88',
  warning: '#FFB020',
  error: '#FF4D4D',
  info: '#3DB8FF',

  // Role accents
  roleOwner: '#C6FF00',
  roleSuperAdmin: '#3DB8FF',
  roleTrainer: '#39FF88',

  overlay: 'rgba(0,0,0,0.6)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// `Inter` weights — ship the matching .ttf files under
// `src/assets/fonts/` and run `npx react-native-asset` to link them
// (react-native.config.js already points at that folder). Until then,
// RN silently falls back to the system font.
export const FONT_FAMILY = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  black: 'Inter-Black',
} as const;

export const FONT_SIZE = {
  xs: 12, // captions / secondary
  sm: 14, // body (dashboard)
  md: 16, // body (landing)
  lg: 18, // section title (dashboard) / body large
  xl: 20,
  pageTitle: 28, // dashboard H1
  heroH2: 38, // landing section title
  stat: 34, // stat numbers
  heroH1: 60, // landing hero
} as const;

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

const theme = {COLORS, FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS};

export default theme;
