import {FeatureKey} from '../types';

// Human-readable labels for every feature key. The DB only stores
// true/false per plan (fetched live in subscriptionStore) — this is the
// one place a brand-new feature key needs a display label registered.
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  basic_dashboard:       'Basic dashboard & analytics',
  attendance:            'Attendance tracking',
  fee_collection:        'Fee collection',
  expense_tracking:      'Expense tracking',
  membership_management: 'Membership management',
  staff_management:      'Staff management',
  basic_reports:         'Basic reports & analytics',
  renewal_reminders:     'Renewal reminders',
  trainer_management:    'Trainer management',
  qr_attendance:         'QR code attendance',
  whatsapp_reminders:    'WhatsApp reminders',
  workout_plans:         'Workout plans',
  diet_plans:            'Diet & nutrition plans',
  lead_management:       'Lead management',
  custom_branding:       'Custom branding',
  advanced_reports:      'Advanced reports & analytics',
  progress_tracking:     'Progress tracking',
  transformation_gallery:'Transformation gallery',
  multi_branch:          'Multi-branch management',
  franchise_dashboard:   'Franchise dashboard',
  white_label:           'White label solution',
  custom_domain:         'Custom domain',
  api_access:            'API access',
  ai_assistant:          'AI fitness assistant',
  ai_renewal_prediction: 'AI renewal prediction',
  priority_support:      'Priority support',
  invoice_generation:    'Invoice generation & sharing',
  payment_history:       'Payment history & receipts',
  supplement_stock:      'Supplement stock management',
};
