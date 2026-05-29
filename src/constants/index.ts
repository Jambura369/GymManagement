import {Dimensions} from 'react-native';

export const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} =
  Dimensions.get('window');

export const COLORS = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primaryLight: '#A78BFA',
  secondary: '#EC4899',
  accent: '#10B981',
  gold: '#F59E0B',
  goldLight: '#FCD34D',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  background: '#F8F7FF',
  backgroundDark: '#0D0C1A',
  surface: '#FFFFFF',
  surfaceDark: '#1C1B30',
  card: '#FFFFFF',
  cardDark: '#26243E',
  text: '#1A1A2E',
  textDark: '#F1F0FF',
  textSecondary: '#6B7280',
  textSecondaryDark: '#9CA3AF',
  border: '#E5E7EB',
  borderDark: '#312E5E',
  placeholder: '#9CA3AF',
  overlay: 'rgba(0,0,0,0.6)',
  gradientStart: '#7C3AED',
  gradientMid: '#6D28D9',
  gradientEnd: '#4F46E5',
  adminColor: '#7C3AED',
  managerColor: '#EC4899',
  trainerColor: '#10B981',
};

export const FONTS = {
  regular: 'Roboto-Regular',
  medium: 'Roboto-Medium',
  bold: 'Roboto-Bold',
  light: 'Roboto-Light',
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
  Marketing: 'megaphone',
  Misc: 'dots-horizontal',
};

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  Rent: '#6C63FF',
  Electricity: '#FFB300',
  Equipment: '#43E97B',
  Maintenance: '#FF6584',
  Marketing: '#2196F3',
  Misc: '#9E9E9E',
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

export const APP_NAME = 'GymPro';
export const APP_VERSION = '1.0.0';
