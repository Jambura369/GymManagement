import {useSubscriptionStore, PLAN_DISPLAY_NAMES} from '../store/subscriptionStore';
import {FeatureKey, PlanTier} from '../types';

interface FeatureAccess {
  hasAccess: boolean;
  requiredPlan: PlanTier;
  requiredPlanName: string;
}

/**
 * Check whether the current gym's subscription includes a feature.
 *
 * Usage:
 *   const { hasAccess, requiredPlan, requiredPlanName } = useFeature('qr_attendance')
 *
 * If hasAccess is false, navigate to FeatureLocked with requiredPlan.
 */
export function useFeature(key: FeatureKey): FeatureAccess {
  const checkFeature = useSubscriptionStore(s => s.checkFeature);
  const getRequiredPlan = useSubscriptionStore(s => s.getRequiredPlan);
  const hasAccess = checkFeature(key);
  const requiredPlan = getRequiredPlan(key);
  return {
    hasAccess,
    requiredPlan,
    requiredPlanName: PLAN_DISPLAY_NAMES[requiredPlan],
  };
}

/**
 * Batch check multiple features.
 * Returns a map of featureKey → hasAccess.
 */
export function useFeatures(keys: FeatureKey[]): Record<FeatureKey, boolean> {
  const checkFeature = useSubscriptionStore(s => s.checkFeature);
  return Object.fromEntries(keys.map(k => [k, checkFeature(k)])) as Record<FeatureKey, boolean>;
}

/**
 * Returns true when the subscription is in any active-access state
 * (trial still valid, or paid plan active).
 */
export function useIsSubscriptionActive(): boolean {
  const status = useSubscriptionStore(s => s.status);
  const trialDaysLeft = useSubscriptionStore(s => s.trialDaysLeft);
  if (status === 'trial') return trialDaysLeft > 0;
  return status === 'active';
}
