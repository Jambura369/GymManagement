import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../supabase/client';
import {FeatureKey, PlanLimits, PlanTier, SubscriptionPlan} from '../types';

// ── Feature → minimum required plan ──────────────────────────────────────────
export const FEATURE_REQUIRED_PLAN: Record<FeatureKey, PlanTier> = {
  attendance: 'free_trial',
  membership_management: 'free_trial',
  fee_collection: 'free_trial',
  expense_tracking: 'free_trial',
  basic_dashboard: 'free_trial',
  staff_management: 'starter',
  basic_reports: 'starter',
  renewal_reminders: 'starter',
  trainer_management: 'professional',
  advanced_reports: 'professional',
  whatsapp_reminders: 'professional',
  qr_attendance: 'professional',
  workout_plans: 'professional',
  diet_plans: 'professional',
  progress_tracking: 'professional',
  transformation_gallery: 'professional',
  lead_management: 'professional',
  custom_branding: 'professional',
  multi_branch: 'enterprise',
  franchise_dashboard: 'enterprise',
  white_label: 'enterprise',
  custom_domain: 'enterprise',
  api_access: 'enterprise',
  ai_assistant: 'enterprise',
  ai_renewal_prediction: 'enterprise',
  priority_support: 'enterprise',
};

export const PLAN_DISPLAY_NAMES: Record<PlanTier, string> = {
  free_trial: 'Free Trial',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Ultra Pro',
};

// Default features for free trial (safe fallback when offline / no plan data)
const FREE_TRIAL_FEATURES: Record<FeatureKey, boolean> = {
  attendance: true,
  membership_management: true,
  fee_collection: true,
  expense_tracking: true,
  basic_dashboard: true,
  staff_management: false,
  basic_reports: false,
  renewal_reminders: false,
  trainer_management: false,
  advanced_reports: false,
  whatsapp_reminders: false,
  qr_attendance: false,
  workout_plans: false,
  diet_plans: false,
  progress_tracking: false,
  transformation_gallery: false,
  lead_management: false,
  custom_branding: false,
  multi_branch: false,
  franchise_dashboard: false,
  white_label: false,
  custom_domain: false,
  api_access: false,
  ai_assistant: false,
  ai_renewal_prediction: false,
  priority_support: false,
};

const FREE_TRIAL_PLAN: SubscriptionPlan = {
  id: 'free_trial',
  name: 'Free Trial',
  tier: 'free_trial',
  monthly_price: 0,
  annual_price: 0,
  trial_days: 14,
  features: FREE_TRIAL_FEATURES,
  limits: {members: 50, trainers: 1, branches: 1, staff: 2},
};

export type GymStatus = 'trial' | 'active' | 'expired' | 'cancelled';

interface LimitStatus {
  current: number;
  limit: number;
  pct: number;
  isNearLimit: boolean;  // >= 80 %
  isAtLimit: boolean;    // >= 100 %
  isUnlimited: boolean;
}

interface SubscriptionState {
  plan: SubscriptionPlan;
  status: GymStatus;
  trialEndsAt: string | null;
  trialDaysLeft: number;
  subscriptionExpiresAt: string | null;
  isLoading: boolean;
  lastFetched: number | null;

  // All plans catalog (for upgrade screen)
  allPlans: SubscriptionPlan[];
  allPlansLoading: boolean;
  allPlansLastFetched: number | null;

  // Actions
  fetchSubscription: (gymId: string) => Promise<void>;
  fetchAllPlans: () => Promise<void>;
  checkFeature: (key: FeatureKey) => boolean;
  getRequiredPlan: (key: FeatureKey) => PlanTier;
  getLimitStatus: (
    resource: 'members' | 'trainers' | 'branches' | 'staff',
    current: number,
  ) => LimitStatus;
  isTrialExpired: () => boolean;
  isSubscriptionExpired: () => boolean;
  reset: () => void;
}

function calcTrialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = Math.ceil(
    (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(0, diff);
}

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      plan: FREE_TRIAL_PLAN,
      status: 'trial',
      trialEndsAt: null,
      trialDaysLeft: 14,
      subscriptionExpiresAt: null,
      isLoading: false,
      lastFetched: null,

      allPlans: [],
      allPlansLoading: false,
      allPlansLastFetched: null,

      fetchAllPlans: async () => {
        const {allPlansLastFetched} = get();
        if (allPlansLastFetched && Date.now() - allPlansLastFetched < CACHE_TTL) return;

        set({allPlansLoading: true});
        try {
          const {data} = await supabase
            .from('subscription_plans')
            .select('id, name, monthly_price, annual_price, trial_days, features, limits')
            .order('monthly_price', {ascending: true});

          if (data) {
            const tierMap: Record<string, PlanTier> = {
              'Free Trial': 'free_trial',
              Starter: 'starter',
              Professional: 'professional',
              Enterprise: 'enterprise',
            };
            const plans: SubscriptionPlan[] = data.map(p => ({
              id: p.id,
              name: p.name,
              tier: tierMap[p.name] ?? 'free_trial',
              monthly_price: p.monthly_price ?? 0,
              annual_price: p.annual_price ?? 0,
              trial_days: p.trial_days ?? 14,
              features: {
                ...FREE_TRIAL_FEATURES,
                ...(p.features as Record<FeatureKey, boolean>),
              },
              limits: (p.limits as PlanLimits) ?? FREE_TRIAL_PLAN.limits,
            }));
            set({allPlans: plans, allPlansLastFetched: Date.now()});
          }
        } catch {
          // keep stale data if available
        } finally {
          set({allPlansLoading: false});
        }
      },

      fetchSubscription: async (gymId: string) => {
        const {lastFetched} = get();
        if (lastFetched && Date.now() - lastFetched < CACHE_TTL) return;

        set({isLoading: true});
        try {
          // Fetch gym subscription state
          const {data: gym, error: gymErr} = await supabase
            .from('gyms')
            .select('plan_id, subscription_status, trial_ends_at, subscription_expires_at')
            .eq('id', gymId)
            .single();

          if (gymErr || !gym) {
            set({isLoading: false});
            return;
          }

          const status: GymStatus = (gym.subscription_status as GymStatus) || 'trial';
          const trialEndsAt: string | null = gym.trial_ends_at ?? null;
          const trialDaysLeft = calcTrialDaysLeft(trialEndsAt);

          // Fetch plan details (features + limits)
          let plan = FREE_TRIAL_PLAN;
          if (gym.plan_id) {
            const {data: planData} = await supabase
              .from('subscription_plans')
              .select('id, name, monthly_price, annual_price, trial_days, features, limits')
              .eq('id', gym.plan_id)
              .single();

            if (planData) {
              // Infer tier from plan name
              const tierMap: Record<string, PlanTier> = {
                'Free Trial': 'free_trial',
                Starter: 'starter',
                Professional: 'professional',
                Enterprise: 'enterprise',
                'Ultra Pro': 'enterprise',
              };
              plan = {
                id: planData.id,
                name: planData.name,
                tier: tierMap[planData.name] ?? 'free_trial',
                monthly_price: planData.monthly_price ?? 0,
                annual_price: planData.annual_price ?? 0,
                trial_days: planData.trial_days ?? 14,
                features: {
                  ...FREE_TRIAL_FEATURES,
                  ...(planData.features as Record<FeatureKey, boolean>),
                },
                limits: (planData.limits as PlanLimits) ?? FREE_TRIAL_PLAN.limits,
              };
            }
          }

          set({
            plan,
            status,
            trialEndsAt,
            trialDaysLeft,
            subscriptionExpiresAt: gym.subscription_expires_at ?? null,
            isLoading: false,
            lastFetched: Date.now(),
          });
        } catch {
          set({isLoading: false});
        }
      },

      checkFeature: (key: FeatureKey) => {
        const {plan, status} = get();
        if (status === 'expired') return false;
        return !!(plan.features?.[key]);
      },

      getRequiredPlan: (key: FeatureKey) => FEATURE_REQUIRED_PLAN[key] ?? 'starter',

      getLimitStatus: (resource, current) => {
        const {plan} = get();
        const limit = plan.limits[resource] ?? 0;
        const isUnlimited = limit === -1;
        const pct = isUnlimited ? 0 : limit > 0 ? Math.round((current / limit) * 100) : 100;
        return {
          current,
          limit,
          pct: Math.min(pct, 100),
          isNearLimit: !isUnlimited && pct >= 80,
          isAtLimit: !isUnlimited && pct >= 100,
          isUnlimited,
        };
      },

      isTrialExpired: () => {
        const {status, trialEndsAt} = get();
        if (status !== 'trial') return false;
        if (!trialEndsAt) return false;
        return new Date(trialEndsAt) < new Date();
      },

      isSubscriptionExpired: () => {
        const {status} = get();
        return status === 'expired';
      },

      reset: () =>
        set({
          plan: FREE_TRIAL_PLAN,
          status: 'trial',
          trialEndsAt: null,
          trialDaysLeft: 14,
          subscriptionExpiresAt: null,
          isLoading: false,
          lastFetched: null,
          allPlans: [],
          allPlansLoading: false,
          allPlansLastFetched: null,
        }),
    }),
    {
      name: 'gym-subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        plan: state.plan,
        status: state.status,
        trialEndsAt: state.trialEndsAt,
        trialDaysLeft: state.trialDaysLeft,
        subscriptionExpiresAt: state.subscriptionExpiresAt,
        lastFetched: state.lastFetched,
      }),
    },
  ),
);
