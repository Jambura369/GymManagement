import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../supabase/client';
import {FeatureKey, PlanLimits, PlanTier, SubscriptionPlan} from '../types';

// Fallback ordering used only when `allPlans` hasn't loaded yet (offline /
// first launch before fetchAllPlans resolves) — getRequiredPlan() below
// normally derives the answer live from the DB-backed `allPlans` instead.
const OFFLINE_FALLBACK_TIER: PlanTier = 'enterprise';

export const PLAN_DISPLAY_NAMES: Record<PlanTier, string> = {
  free_trial: 'Free Trial',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Ultra Pro',
};

// All Professional-tier features enabled (used when is_pro_override = true in gyms table)
const PRO_OVERRIDE_FEATURES: Record<FeatureKey, boolean> = {
  attendance: true,
  membership_management: true,
  fee_collection: true,
  expense_tracking: true,
  basic_dashboard: true,
  staff_management: true,
  basic_reports: true,
  renewal_reminders: true,
  trainer_management: true,
  advanced_reports: true,
  whatsapp_reminders: true,
  qr_attendance: true,
  workout_plans: true,
  diet_plans: true,
  progress_tracking: true,
  transformation_gallery: true,
  lead_management: true,
  custom_branding: true,
  multi_branch: false,
  franchise_dashboard: false,
  white_label: false,
  custom_domain: false,
  api_access: false,
  ai_assistant: false,
  ai_renewal_prediction: false,
  priority_support: false,
  invoice_generation: true,
  payment_history: true,
  supplement_stock: true,
};

const PRO_OVERRIDE_PLAN: SubscriptionPlan = {
  id: 'pro_override',
  name: 'Professional',
  tier: 'professional',
  monthly_price: 0,
  annual_price: 0,
  trial_days: 0,
  features: PRO_OVERRIDE_FEATURES,
  limits: {members: -1, trainers: -1, branches: 1, staff: -1},
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
  invoice_generation: false,
  payment_history: false,
  supplement_stock: false,
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
        // Kick off allPlans in parallel — getRequiredPlan() needs it to
        // compute the right tier for FeatureLocked screens/banners.
        get().fetchAllPlans();
        if (lastFetched && Date.now() - lastFetched < CACHE_TTL) return;

        set({isLoading: true});
        try {
          // Fetch gym subscription state
          const {data: gym, error: gymErr} = await supabase
            .from('gyms')
            .select('plan_id, subscription_status, trial_ends_at, subscription_expires_at, is_pro_override')
            .eq('id', gymId)
            .single();

          if (gymErr || !gym) {
            set({isLoading: false});
            return;
          }

          // Test override: set is_pro_override = true in the gyms table to unlock Professional
          if (gym.is_pro_override) {
            set({
              plan: PRO_OVERRIDE_PLAN,
              status: 'active',
              trialEndsAt: null,
              trialDaysLeft: 0,
              subscriptionExpiresAt: null,
              isLoading: false,
              lastFetched: Date.now(),
            });
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

      getRequiredPlan: (key: FeatureKey) => {
        const {allPlans} = get();
        const cheapest = [...allPlans]
          .sort((a, b) => a.monthly_price - b.monthly_price)
          .find(p => p.features?.[key]);
        return cheapest?.tier ?? OFFLINE_FALLBACK_TIER;
      },

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
      name: 'gym-subscription-storage-v2',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: state => ({
        plan: state.plan,
        status: state.status,
        trialEndsAt: state.trialEndsAt,
        trialDaysLeft: state.trialDaysLeft,
        subscriptionExpiresAt: state.subscriptionExpiresAt,
        // lastFetched intentionally not persisted so the subscription is always
        // re-fetched fresh on each app launch / login
      }),
    },
  ),
);
