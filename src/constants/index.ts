import {Dimensions} from 'react-native';

export const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} =
  Dimensions.get('window');

// Gymblix brand palette — dark-only (the *Dark-suffixed keys mirror the base
// keys so the old isDark ternaries scattered across screens stay harmless).
// Update values here to change colors app-wide; see also src/theme/index.ts
// for the same tokens under cleaner names, used by newly built screens.
export const COLORS = {
  primary: '#C6FF00', // Volt Lime — CTAs, active nav, links, key highlights
  primaryDark: '#9FCC00',
  primaryLight: '#DFFF66',
  secondary: '#39FF88', // Mint Green — success / secondary highlights
  accent: '#39FF88',
  gold: '#FFB020',
  goldLight: '#FFD180',
  success: '#39FF88',
  warning: '#FFB020',
  error: '#FF4D4D',
  info: '#3DB8FF',
  background: '#0B0F0E',
  backgroundDark: '#0B0F0E',
  surface: '#161D1A',
  surfaceDark: '#161D1A',
  card: '#161D1A',
  cardDark: '#1E2622',
  text: '#F5F7F5',
  textDark: '#F5F7F5',
  textSecondary: '#9CA3A0',
  textSecondaryDark: '#9CA3A0',
  border: '#2A332E',
  borderDark: '#2A332E',
  placeholder: '#5C645F',
  overlay: 'rgba(0,0,0,0.6)',
  gradientStart: '#39FF88',
  gradientMid: '#C6FF00',
  gradientEnd: '#9FCC00',
  adminColor: '#C6FF00',
  managerColor: '#3DB8FF',
  trainerColor: '#39FF88',
};

export const FONTS = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  bold: 'Inter-Bold',
  light: 'Inter-Regular',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  round: 100,
};

export const PACKAGE_TYPES = [
  'Monthly',
  'Quarterly',
  'Half Year',
  'Yearly',
  'Special Category',
] as const;

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity',
  'Equipment',
  'Maintenance',
  'Marketing',
  'Misc',
] as const;

export const USER_ROLES = ['Admin', 'Manager', 'Trainer'] as const;

export const PAYMENT_METHODS = ['Cash', 'QR'] as const;

export const SALARY_PAYMENT_TYPES = [
  'Cash',
  'Bank Transfer',
  'UPI',
] as const;

export const VERIFICATION_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
] as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  INITIAL_PAGE: 1,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@gym_auth_token',
  USER_DATA: '@gym_user_data',
  GYM_DATA: '@gym_data',
  THEME: '@gym_theme',
  FCM_TOKEN: '@gym_fcm_token',
};

export const SUPABASE_BUCKETS = {
  GYM_LOGOS: 'gym-logos',
  STUDENT_IMAGES: 'student-images',
  STAFF_IMAGES: 'staff-images',
  PAYMENT_QR: 'payment-qr',
  RECEIPTS: 'receipts',
};

export const DATE_FORMATS = {
  DISPLAY: 'DD MMM YYYY',
  INPUT: 'YYYY-MM-DD',
  DISPLAY_WITH_TIME: 'DD MMM YYYY, HH:mm',
  MONTH_YEAR: 'MMM YYYY',
  SHORT_MONTH: 'MMM',
};

export const EXPENSE_CATEGORY_ICONS: Record<string, string> = {
  Rent: 'home',
  Electricity: 'flash',
  Equipment: 'dumbbell',
  Maintenance: 'wrench',
  Marketing: 'bullhorn',
  Misc: 'dots-horizontal',
  Salary: 'currency-inr',
};

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  Rent: '#6C63FF',
  Electricity: '#FFB300',
  Equipment: '#43E97B',
  Maintenance: '#FF6584',
  Marketing: '#2196F3',
  Misc: '#9E9E9E',
  Salary: '#00BFA5',
};

export const ROLE_COLORS: Record<string, string> = {
  Admin: '#6C63FF',
  Manager: '#FF6584',
  Trainer: '#43E97B',
};

export const VERIFICATION_COLORS: Record<string, string> = {
  Pending: '#FF9800',
  Approved: '#4CAF50',
  Rejected: '#F44336',
};

export const APP_NAME = 'Gymblix';
export const APP_VERSION = '1.0.0';
