// ============================================================
// CORE TYPES & INTERFACES - GYM MANAGEMENT SAAS
// ============================================================

// ---- Enums ----

export type UserRole = 'Admin' | 'Manager' | 'Trainer';

export type PaymentMethod = 'Cash' | 'QR';

export type PackageType =
  | 'Monthly'
  | 'Quarterly'
  | 'Half Year'
  | 'Yearly'
  | 'Special Category';

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Equipment'
  | 'Maintenance'
  | 'Marketing'
  | 'Misc';

export type VerificationStatus = 'Pending' | 'Approved' | 'Rejected';

export type NotificationTarget = 'Admin' | 'Manager' | 'Trainer' | 'All';

export type SalaryPaymentType = 'Cash' | 'Bank Transfer' | 'UPI';

export type AuthMethod = 'password' | 'email_otp';

// ============================================================
// SUBSCRIPTION & BILLING TYPES
// ============================================================

export type GymStatus = 'trial' | 'active' | 'expired' | 'cancelled';

export type PlanTier = 'free_trial' | 'starter' | 'professional' | 'enterprise';

export type FeatureKey =
  | 'attendance'
  | 'membership_management'
  | 'fee_collection'
  | 'expense_tracking'
  | 'basic_dashboard'
  | 'staff_management'
  | 'trainer_management'
  | 'basic_reports'
  | 'advanced_reports'
  | 'renewal_reminders'
  | 'whatsapp_reminders'
  | 'qr_attendance'
  | 'workout_plans'
  | 'diet_plans'
  | 'progress_tracking'
  | 'transformation_gallery'
  | 'lead_management'
  | 'custom_branding'
  | 'white_label'
  | 'custom_domain'
  | 'multi_branch'
  | 'franchise_dashboard'
  | 'api_access'
  | 'ai_assistant'
  | 'ai_renewal_prediction'
  | 'priority_support'
  | 'invoice_generation'
  | 'payment_history'
  | 'supplement_stock';

export interface PlanLimits {
  members: number;   // -1 = unlimited
  trainers: number;
  branches: number;
  staff: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: PlanTier;
  monthly_price: number;
  annual_price: number;
  trial_days: number;
  features: Record<FeatureKey, boolean>;
  limits: PlanLimits;
}

// ---- Gym ----

export interface Gym {
  id: string;
  gym_name: string;
  gym_logo: string | null;
  owner_name: string;
  phone: string;
  email: string;
  address: string;
  payment_qr: string | null;
  is_active: boolean;
  subscription_plan: string;
  auth_method: AuthMethod;
  // Subscription fields
  plan_id?: string | null;
  subscription_status?: GymStatus;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  subscription_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ---- User (Staff) ----

export interface User {
  id: string;
  auth_id: string;
  gym_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  avatar: string | null;
  fcm_token: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Package ----

export interface Package {
  id: string;
  gym_id: string;
  name: string;
  type: PackageType;
  price: number;
  duration_days: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Student ----

export interface Student {
  id: string;
  gym_id: string;
  name: string;
  phone: string;
  email: string | null;
  image: string | null;
  joining_date: string;
  package_id: string | null;
  membership_expiry: string | null;
  trainer_id: string | null;
  created_by: string | null;
  verification_status: VerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  is_active: boolean;
  payment_type: PaymentMethod | null;
  amount_paid: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  package?: Package;
  trainer?: User;
  creator?: User;
}

// ---- Payment ----

export interface Payment {
  id: string;
  gym_id: string;
  student_id: string;
  amount: number;
  payment_method: PaymentMethod;
  received_by: string | null;
  payment_date: string;
  transaction_note: string | null;
  package_id: string | null;
  created_at: string;
  // Joined
  student?: Student;
  receiver?: User;
  package?: Package;
}

// ---- Expense ----

export interface Expense {
  id: string;
  gym_id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  created_by: string | null;
  expense_date: string;
  description: string | null;
  receipt_image: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  creator?: User;
}

// ---- Trainer Salary ----

export interface TrainerSalary {
  id: string;
  gym_id: string;
  trainer_id: string;
  salary_amount: number;
  payment_date: string;
  payment_type: SalaryPaymentType;
  paid_by: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  trainer?: User;
  payer?: User;
}

// ---- Supplement Stock ----

export type SupplementTxnType = 'Add' | 'Sell';

export interface Supplement {
  id: string;
  gym_id: string;
  name: string;
  category: string | null;
  unit: string;
  cost_price: number | null;
  selling_price: number;
  quantity: number;
  low_stock_threshold: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplementTransaction {
  id: string;
  gym_id: string;
  supplement_id: string;
  type: SupplementTxnType;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  student_id: string | null;
  notes: string | null;
  recorded_by: string | null;
  transaction_date: string;
  created_at: string;
  // Joined
  supplement?: Supplement;
  student?: Student;
  recorder?: User;
}

// ---- Verification Request ----

export interface VerificationRequest {
  id: string;
  gym_id: string;
  student_id: string;
  trainer_id: string | null;
  status: VerificationStatus;
  verified_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  student?: Student;
  trainer?: User;
  verifier?: User;
}

// ---- Notification ----

export interface Notification {
  id: string;
  gym_id: string;
  title: string;
  message: string;
  target_role: NotificationTarget;
  target_user_id: string | null;
  is_read: boolean;
  notification_type: string;
  reference_id: string | null;
  created_at: string;
}

// ---- Dashboard Stats ----

export interface DashboardStats {
  total_students: number;
  active_students: number;
  revenue_this_month: number;
  expense_this_month: number;
  salary_this_month: number;
  profit_this_month: number;
  pending_verification: number;
  expired_memberships: number;
  expiring_7_days: number;
  expiring_3_days: number;
  trainer_count: number;
  manager_count: number;
}

// ---- Monthly Chart Data ----

export interface MonthlyChartData {
  month_label: string;
  month_start: string;
  revenue: number;
}

// ---- Auth State ----

export interface AuthUser {
  id: string;
  email: string;
  user: User;
  gym: Gym;
}

// ---- API Response ----

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// ---- Pagination ----

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ---- Form Types ----

export interface RegisterGymForm {
  gym_name: string;
  gym_logo?: string;
  owner_name: string;
  phone: string;
  email: string;
  password: string;
  confirm_password: string;
  address: string;
  payment_qr?: string;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface AddStudentForm {
  name: string;
  phone: string;
  email?: string;
  image?: string;
  joining_date: string;
  package_id: string;
  payment_type: PaymentMethod;
  amount_paid: number;
  trainer_id?: string;
  notes?: string;
}

export interface AddExpenseForm {
  title: string;
  amount: number;
  category: ExpenseCategory;
  expense_date: string;
  description?: string;
  receipt_image?: string;
}

export interface AddSalaryForm {
  trainer_id: string;
  salary_amount: number;
  payment_date: string;
  payment_type: SalaryPaymentType;
  notes?: string;
}

export interface AddPackageForm {
  name: string;
  type: PackageType;
  price: number;
  duration_days: number;
  description?: string;
}

export interface AddUserForm {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  password: string;
  avatar?: string;
}

export interface RenewStudentForm {
  joining_date: string;
  package_id: string;
  payment_type: PaymentMethod;
  amount_paid: number;
  notes?: string;
}

export interface AddSupplementForm {
  name: string;
  category?: string;
  unit?: string;
  cost_price?: number;
  selling_price: number;
  quantity: number;
  low_stock_threshold?: number;
  description?: string;
}

export interface StockTransactionForm {
  type: SupplementTxnType;
  quantity: number;
  price_per_unit: number;
  student_id?: string;
  notes?: string;
  transaction_date: string;
}

// ---- Filter Types ----

export interface StudentFilter {
  search?: string;
  verification_status?: VerificationStatus | 'All';
  is_active?: boolean | 'All';
  trainer_id?: string;
  package_type?: PackageType | 'All';
  expiry_filter?: 'all' | 'expiring_3' | 'expiring_7' | 'expired';
}

export interface ExpenseFilter {
  search?: string;
  category?: ExpenseCategory | 'All';
  date_from?: string;
  date_to?: string;
}

export interface PaymentFilter {
  search?: string;
  payment_method?: PaymentMethod | 'All';
  date_from?: string;
  date_to?: string;
}

export interface SupplementFilter {
  search?: string;
}

// ---- Navigation Types ----

export type RootStackParamList = {
  Login: undefined;
  RegisterGym: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  StudentDetail: { studentId: string };
  AddStudent: undefined;
  EditStudent: { studentId: string };
  RenewStudent: { studentId: string };
  VerificationList: undefined;
  AddExpense: undefined;
  ExpenseDetail: { expenseId: string };
  EditExpense: { expenseId: string };
  AddSalary: undefined;
  EditSalary: {salaryId: string};
  ExpiryList: {trainerId?: string; expiryFilter?: 'expiring_3' | 'expiring_7' | 'expired'};
  PackageList: undefined;
  AddPackage: undefined;
  EditPackage: { packageId: string };
  Reports: undefined;
  Notifications: undefined;
  GymSettings: undefined;
  UserManagement: undefined;
  AddUser: undefined;
  Profile: undefined;
  PaymentQR: undefined;
  Attendance: undefined;
  AttendanceQR: undefined;
  AttendanceHistory: {studentId: string; studentName: string};
  StudentPaymentHistory: {studentId: string; studentName: string};
  TrainerPaymentHistory: {trainerId: string; trainerName: string};
  SupplementList: undefined;
  AddSupplement: undefined;
  EditSupplement: {supplementId: string};
  StockTransaction: {supplementId: string; mode: 'add' | 'sell'};
  FeatureLocked: {
    featureName: string;
    featureIcon: string;
    requiredPlan: PlanTier;
    description?: string;
  };
};

export type TabParamList = {
  Dashboard: undefined;
  Students: undefined;
  Expenses: undefined;
  More: undefined;
};
