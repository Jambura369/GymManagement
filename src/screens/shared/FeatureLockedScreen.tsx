import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {FEATURE_LABELS} from '../../constants/features';
import {useAuthStore} from '../../store/authStore';
import {useSubscriptionStore, PLAN_DISPLAY_NAMES} from '../../store/subscriptionStore';
import {createUpgradeOrder, confirmPayment, BillingCycle as ApiBillingCycle} from '../../services/subscriptionService';
import {RootStackParamList, PlanTier, SubscriptionPlan, FeatureKey} from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'FeatureLocked'>;

type BillingCycle = 'monthly' | 'annual';

// ── Static visual config per tier ────────────────────────────────────────────
const TIER_GRADIENT: Record<PlanTier, [string, string]> = {
  free_trial: ['#6B7280', '#4B5563'],
  starter:    ['#3B82F6', '#1D4ED8'],
  professional: ['#E85452', '#B22524'],
  enterprise: ['#059669', '#065F46'],
};

const TIER_ICON: Record<PlanTier, string> = {
  free_trial:   'rocket-launch-outline',
  starter:      'star-four-points',
  professional: 'lightning-bolt',
  enterprise:   'crown',
};

const TIER_TAG: Partial<Record<PlanTier, string>> = {
  starter:      'Popular',
  professional: 'Best Value',
  enterprise:   'All Unlimited',
};

const TIER_ORDER: PlanTier[] = ['free_trial', 'starter', 'professional', 'enterprise'];

// Ordered list of feature keys for display (determines which show first)
const FEATURE_DISPLAY_ORDER: FeatureKey[] = [
  'basic_dashboard', 'attendance', 'fee_collection', 'expense_tracking',
  'membership_management', 'staff_management', 'basic_reports', 'renewal_reminders',
  'trainer_management', 'qr_attendance', 'whatsapp_reminders', 'workout_plans',
  'diet_plans', 'lead_management', 'custom_branding', 'advanced_reports',
  'progress_tracking', 'transformation_gallery', 'multi_branch', 'franchise_dashboard',
  'white_label', 'custom_domain', 'api_access', 'ai_assistant',
  'ai_renewal_prediction', 'priority_support',
  'invoice_generation', 'payment_history', 'supplement_stock',
];

/** Returns features that are NEW in this plan vs the previous tier plan. */
function getDisplayFeatures(plan: SubscriptionPlan, prevPlan: SubscriptionPlan | null): string[] {
  const lines: string[] = [];
  if (prevPlan) lines.push(`Everything in ${prevPlan.name}`);
  for (const key of FEATURE_DISPLAY_ORDER) {
    if (plan.features[key] && (!prevPlan || !prevPlan.features[key])) {
      lines.push(FEATURE_LABELS[key]);
    }
  }
  return lines.slice(0, 6);
}

function formatLimit(val: number, unit: string): string {
  return val === -1 ? `Unlimited ${unit}` : `${val.toLocaleString('en-IN')} ${unit}`;
}

function formatPrice(monthly: number, annual: number, cycle: BillingCycle): string {
  const price = cycle === 'annual' ? Math.round(annual / 12) : monthly;
  return price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`;
}

function annualSavingPct(monthly: number, annual: number): number | null {
  if (!monthly || !annual) return null;
  return Math.round((1 - annual / (monthly * 12)) * 100);
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard({isDark}: {isDark: boolean}) {
  const bg = COLORS.surface;
  const shimmer = '#FFFFFF12';
  return (
    <View style={[styles.card, {backgroundColor: bg, borderColor: 'transparent'}]}>
      <View style={styles.cardBody}>
        <View style={styles.planRow}>
          <View style={[styles.planIconWrap, {backgroundColor: shimmer}]} />
          <View style={{flex: 1, gap: 6}}>
            <View style={[styles.skeletonLine, {width: '40%', backgroundColor: shimmer}]} />
            <View style={[styles.skeletonLine, {width: '65%', backgroundColor: shimmer}]} />
          </View>
          <View style={[styles.skeletonLine, {width: 48, backgroundColor: shimmer}]} />
        </View>
        <View style={[styles.divider, {backgroundColor: shimmer, marginVertical: SPACING.sm}]} />
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={[styles.skeletonLine, {width: `${75 - i * 8}%`, backgroundColor: shimmer, marginBottom: 8}]} />
        ))}
        <View style={[styles.skeletonBtn, {backgroundColor: shimmer}]} />
      </View>
    </View>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  prevPlan,
  isRequired,
  isCurrent,
  billing,
  isDark,
  isProcessing,
  disabled,
  onUpgrade,
}: {
  plan: SubscriptionPlan;
  prevPlan: SubscriptionPlan | null;
  isRequired: boolean;
  isCurrent: boolean;
  billing: BillingCycle;
  isDark: boolean;
  isProcessing: boolean;
  disabled: boolean;
  onUpgrade: (plan: SubscriptionPlan) => void;
}) {
  const gradient = TIER_GRADIENT[plan.tier];
  const icon = TIER_ICON[plan.tier];
  const tag = TIER_TAG[plan.tier];
  const features = getDisplayFeatures(plan, prevPlan);
  const priceStr = formatPrice(plan.monthly_price, plan.annual_price, billing);
  const savePct = annualSavingPct(plan.monthly_price, plan.annual_price);
  const isPaid = plan.monthly_price > 0;

  const chipBg = '#FFFFFF0D';

  return (
    <View
      style={[
        styles.card,
        {backgroundColor: COLORS.surface},
        isRequired && styles.cardHighlighted,
        isRequired && {borderColor: gradient[0]},
        !isRequired && {borderColor: COLORS.border},
      ]}>

      {isRequired && (
        <LinearGradient colors={gradient} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.cardAccent}>
          <MaterialCommunityIcons name="check-decagram" size={12} color="#FFF" />
          <Text style={styles.cardAccentText}>Recommended for You</Text>
        </LinearGradient>
      )}

      <View style={styles.cardBody}>
        {/* Plan header */}
        <View style={styles.planRow}>
          <View style={[styles.planIconWrap, {backgroundColor: gradient[0] + '18'}]}>
            <MaterialCommunityIcons name={icon} size={18} color={gradient[0]} />
          </View>

          <View style={styles.planMeta}>
            <View style={styles.planNameRow}>
              <Text style={[styles.planName, {color: COLORS.textPrimary}]}>{plan.name}</Text>
              {tag && (
                <View style={[styles.tagChip, {backgroundColor: gradient[0] + '18'}]}>
                  <Text style={[styles.tagText, {color: gradient[0]}]}>{tag}</Text>
                </View>
              )}
              {isCurrent && (
                <View style={[styles.currentChip, {borderColor: gradient[0] + '70'}]}>
                  <Text style={[styles.currentChipText, {color: gradient[0]}]}>Current</Text>
                </View>
              )}
            </View>
            <View style={styles.limitRow}>
              <View style={[styles.limitChip, {backgroundColor: chipBg}]}>
                <MaterialCommunityIcons name="account-group-outline" size={11} color={COLORS.textSecondary} />
                <Text style={[styles.limitText, {color: COLORS.textSecondary}]}>
                  {formatLimit(plan.limits.members, 'members')}
                </Text>
              </View>
              <View style={[styles.limitChip, {backgroundColor: chipBg}]}>
                <MaterialCommunityIcons name="account-tie-outline" size={11} color={COLORS.textSecondary} />
                <Text style={[styles.limitText, {color: COLORS.textSecondary}]}>
                  {formatLimit(plan.limits.trainers, 'trainers')}
                </Text>
              </View>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceBlock}>
            <Text style={[styles.priceMain, {color: gradient[0]}]}>{priceStr}</Text>
            {isPaid && <Text style={[styles.priceSub, {color: COLORS.textSecondary}]}>/mo</Text>}
            {billing === 'annual' && savePct && savePct > 0 && (
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>-{savePct}%</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.divider, {backgroundColor: COLORS.border}]} />

        {/* Features */}
        <View style={styles.featureList}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={15} color={gradient[0]} />
              <Text style={[styles.featureText, {color: COLORS.textSecondary}]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        {isCurrent ? (
          <View style={[styles.currentBtn, {backgroundColor: gradient[0] + '12', borderColor: gradient[0] + '50'}]}>
            <MaterialCommunityIcons name="check" size={15} color={gradient[0]} />
            <Text style={[styles.currentBtnText, {color: gradient[0]}]}>Your Current Plan</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => onUpgrade(plan)}
            activeOpacity={0.82}
            disabled={disabled}
            style={disabled && !isProcessing ? styles.upgradeBtnDisabled : undefined}>
            <LinearGradient
              colors={gradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={[styles.upgradeBtn, isRequired && styles.upgradeBtnLarge]}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={styles.upgradeBtnText}>
                    {plan.monthly_price === 0 ? 'Start Free Trial' : `Upgrade to ${plan.name}`}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
const FeatureLockedScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const {plan: currentPlan, allPlans, allPlansLoading, fetchAllPlans, fetchSubscription} = useSubscriptionStore();
  const {user, gym} = useAuthStore();

  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const {featureName, featureIcon, requiredPlan, description} = route.params;
  const gradient = TIER_GRADIENT[requiredPlan];

  useEffect(() => {
    fetchAllPlans();
  }, [fetchAllPlans]);

  // Always show plans in natural tier order (Free Trial → Starter → Professional → Ultra Pro)
  const orderedPlans = allPlans.length > 0
    ? TIER_ORDER
        .map(t => allPlans.find(p => p.tier === t))
        .filter((p): p is SubscriptionPlan => Boolean(p))
    : [];

  const toggleActiveBg = '#FFFFFF18';

  async function handleUpgrade(plan: SubscriptionPlan) {
    // Free tier has no payment to take — fall back to the web flow until a
    // dedicated trial-start call is wired up from this screen.
    if (plan.monthly_price === 0) {
      Linking.openURL(`https://gymblix.com/gym/subscription?plan=${plan.tier}&cycle=${billing}`);
      return;
    }

    if (!gym?.id || processingPlanId) return;

    const cycle: ApiBillingCycle = billing === 'annual' ? 'annual' : 'monthly';
    setProcessingPlanId(plan.id);

    try {
      const {data: orderData, error: orderError} = await createUpgradeOrder(plan.id, cycle);
      if (orderError || !orderData) {
        Alert.alert('Could not start payment', orderError ?? 'Please try again.');
        return;
      }

      const checkoutResult = await RazorpayCheckout.open({
        key: orderData.key,
        order_id: orderData.order.id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Gymblix',
        description: `${plan.name} · ${cycle === 'annual' ? 'Annual' : 'Monthly'}`,
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone ?? undefined,
        },
        theme: {color: TIER_GRADIENT[plan.tier][0]},
      });

      const {data: confirmData, error: confirmError} = await confirmPayment(
        plan.id,
        cycle,
        checkoutResult.razorpay_order_id,
        checkoutResult.razorpay_payment_id,
        checkoutResult.razorpay_signature,
      );

      if (confirmError || !confirmData?.success) {
        Alert.alert(
          'Payment received, activation failed',
          'Your payment went through but activating the plan failed. Contact support with your payment ID: ' +
            checkoutResult.razorpay_payment_id,
        );
        return;
      }

      await fetchSubscription(gym.id);
      navigation.goBack();
    } catch (err: any) {
      // RazorpayCheckout rejects on user cancel/error with {code, description}
      if (err?.code !== 0) {
        Alert.alert('Payment failed', err?.description ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setProcessingPlanId(null);
    }
  }

  // Get previous plan for a given plan (by tier order)
  function getPrevPlan(plan: SubscriptionPlan): SubscriptionPlan | null {
    const idx = TIER_ORDER.indexOf(plan.tier);
    if (idx <= 0) return null;
    const prevTier = TIER_ORDER[idx - 1];
    return allPlans.find(p => p.tier === prevTier) ?? null;
  }

  // Annual saving % across paid plans (use starter as reference for the badge)
  const starterPlan = allPlans.find(p => p.tier === 'starter');
  const globalSavePct = starterPlan ? annualSavingPct(starterPlan.monthly_price, starterPlan.annual_price) : null;

  return (
    <View style={[styles.root, {backgroundColor: COLORS.background}]}>
      {/* Gradient header */}
      <LinearGradient
        colors={gradient}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.header, {paddingTop: insets.top + SPACING.xs}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.featureIconWrap}>
            <MaterialCommunityIcons name={featureIcon} size={28} color="#FFF" />
            <View style={styles.lockBadge}>
              <MaterialCommunityIcons name="lock" size={11} color="#FFF" />
            </View>
          </View>
          <Text style={styles.headerTitle}>Upgrade Plan</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {description ??
              `"${featureName}" requires the ${PLAN_DISPLAY_NAMES[requiredPlan]} plan or above.`}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + SPACING.xxl}]}
        showsVerticalScrollIndicator={false}>

        {/* Billing toggle */}
        <View style={[styles.toggleWrap, {backgroundColor: COLORS.surface}]}>
          <TouchableOpacity
            style={[styles.toggleBtn, billing === 'monthly' && {backgroundColor: toggleActiveBg}]}
            onPress={() => setBilling('monthly')}
            activeOpacity={0.8}>
            <Text style={[styles.toggleText, {
              color: billing === 'monthly' ? COLORS.textPrimary : COLORS.textSecondary,
              fontWeight: billing === 'monthly' ? '700' : '500',
            }]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, billing === 'annual' && {backgroundColor: toggleActiveBg}]}
            onPress={() => setBilling('annual')}
            activeOpacity={0.8}>
            <Text style={[styles.toggleText, {
              color: billing === 'annual' ? COLORS.textPrimary : COLORS.textSecondary,
              fontWeight: billing === 'annual' ? '700' : '500',
            }]}>
              Annual
            </Text>
            {globalSavePct && globalSavePct > 0 && (
              <View style={styles.annualBadge}>
                <Text style={styles.annualBadgeText}>Save {globalSavePct}%</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {billing === 'annual' && (
          <Text style={[styles.annualNote, {color: COLORS.textSecondary}]}>
            Billed annually · 2 months free
          </Text>
        )}

        {/* Loading skeletons */}
        {allPlansLoading && orderedPlans.length === 0 && (
          <>
            <SkeletonCard isDark />
            <SkeletonCard isDark />
            <SkeletonCard isDark />
          </>
        )}

        {/* Plan cards */}
        {orderedPlans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            prevPlan={getPrevPlan(plan)}
            isRequired={plan.tier === requiredPlan}
            isCurrent={plan.tier === currentPlan.tier}
            billing={billing}
            isDark={true}
            isProcessing={processingPlanId === plan.id}
            disabled={processingPlanId !== null}
            onUpgrade={handleUpgrade}
          />
        ))}

        {/* Retry if failed */}
        {!allPlansLoading && orderedPlans.length === 0 && (
          <TouchableOpacity
            onPress={() => fetchAllPlans()}
            style={[styles.retryBtn, {backgroundColor: COLORS.surface}]}>
            <MaterialCommunityIcons name="refresh" size={18} color={COLORS.primary} />
            <Text style={[styles.retryText, {color: COLORS.primary}]}>Tap to retry</Text>
          </TouchableOpacity>
        )}

        {/* Trust footer */}
        {orderedPlans.length > 0 && (
          <View style={[styles.footerCard, {backgroundColor: COLORS.surface}]}>
            <MaterialCommunityIcons name="shield-check-outline" size={15} color={COLORS.success} />
            <Text style={[styles.footerText, {color: COLORS.textSecondary}]}>
              Secure payment · Cancel anytime · No hidden fees
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.laterBtn} activeOpacity={0.7}>
          <Text style={[styles.laterText, {color: COLORS.textSecondary}]}>Maybe Later</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},

  // Header
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  headerContent: {alignItems: 'center'},
  featureIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  headerTitle: {color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 4},
  headerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.lg,
  },

  // Scroll
  scroll: {paddingHorizontal: SPACING.md, paddingTop: SPACING.sm},

  // Billing toggle
  toggleWrap: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.xs,
    elevation: 2,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  toggleText: {fontSize: 13},
  annualBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  annualBadgeText: {color: '#FFF', fontSize: 10, fontWeight: '700'},
  annualNote: {fontSize: 11, textAlign: 'center', marginBottom: SPACING.sm},

  // Plan card
  card: {
    borderRadius: RADIUS.xl,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    elevation: 3,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  cardHighlighted: {
    elevation: 10,
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  cardAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  cardAccentText: {color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.3},
  cardBody: {padding: 12},

  // Plan header
  planRow: {flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm},
  planIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planMeta: {flex: 1},
  planNameRow: {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
  planName: {fontSize: 15, fontWeight: '800'},
  tagChip: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.pill},
  tagText: {fontSize: 10, fontWeight: '700'},
  currentChip: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.pill, borderWidth: 1},
  currentChipText: {fontSize: 10, fontWeight: '700'},
  limitRow: {flexDirection: 'row', gap: 5, marginTop: 5, flexWrap: 'wrap'},
  limitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  limitText: {fontSize: 10, fontWeight: '500'},

  // Price
  priceBlock: {alignItems: 'flex-end', flexShrink: 0},
  priceMain: {fontSize: 20, fontWeight: '900', lineHeight: 24},
  priceSub: {fontSize: 11, fontWeight: '500'},
  saveBadge: {
    marginTop: 3,
    backgroundColor: '#10B98118',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  saveText: {color: '#10B981', fontSize: 10, fontWeight: '700'},

  // Divider & features
  divider: {height: 1, marginVertical: SPACING.sm},
  featureList: {gap: 6, marginBottom: 12},
  featureRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  featureText: {fontSize: 13, lineHeight: 18, flex: 1},

  // Buttons
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
  },
  upgradeBtnLarge: {paddingVertical: 15},
  upgradeBtnDisabled: {opacity: 0.5},
  upgradeBtnText: {color: '#FFF', fontSize: 14, fontWeight: '800'},
  currentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  currentBtnText: {fontSize: 14, fontWeight: '700'},

  // Skeleton
  skeletonLine: {height: 12, borderRadius: 6},
  skeletonBtn: {height: 46, borderRadius: RADIUS.lg, marginTop: 4},

  // Retry
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
  },
  retryText: {fontSize: 14, fontWeight: '600'},

  // Footer
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  footerText: {fontSize: 12, fontWeight: '500'},
  laterBtn: {alignItems: 'center', paddingVertical: SPACING.sm},
  laterText: {fontSize: 14, fontWeight: '600'},
});

export default FeatureLockedScreen;
