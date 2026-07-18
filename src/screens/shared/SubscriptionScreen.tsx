import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import RazorpayCheckout from 'react-native-razorpay';
import dayjs from 'dayjs';

import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, SubscriptionPlan, PlanTier, FeatureKey} from '../../types';
import {useAuthStore} from '../../store/authStore';
import {useSubscriptionStore} from '../../store/subscriptionStore';
import {createUpgradeOrder, confirmPayment, BillingCycle as ApiBillingCycle} from '../../services/subscriptionService';
import {FEATURE_LABELS} from '../../constants/features';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type BillingCycle = 'monthly' | 'annual';

const TIER_ICON: Record<PlanTier, string> = {
  free_trial:   'rocket-launch-outline',
  starter:      'star-four-points',
  professional: 'lightning-bolt',
  enterprise:   'crown',
};

const TIER_COLOR: Record<PlanTier, string> = {
  free_trial:   '#6B7280',
  starter:      '#3B82F6',
  professional: '#E85452',
  enterprise:   COLORS.primary,
};

const TIER_ORDER: PlanTier[] = ['free_trial', 'starter', 'professional', 'enterprise'];

const FEATURE_SUBLABELS: Partial<Record<FeatureKey, string>> = {
  basic_dashboard:       'Overview stats and metrics',
  attendance:            'Track member check-ins',
  fee_collection:        'Collect and record payments',
  expense_tracking:      'Manage gym expenses',
  membership_management: 'Plans, packages and renewals',
  staff_management:      'Manage trainers and staff',
  basic_reports:         'Monthly and weekly summaries',
  renewal_reminders:     'Auto notify expiring members',
  trainer_management:    'Trainer assignments and logs',
  qr_attendance:         'QR code check-in scanner',
  whatsapp_reminders:    'Automated WhatsApp alerts',
  workout_plans:         'Create and assign workouts',
  diet_plans:            'Nutrition and diet tracking',
  lead_management:       'Track and convert prospects',
  custom_branding:       'App white-labeling features',
  advanced_reports:      'Real-time performance tracking',
  progress_tracking:     'Member fitness progress charts',
  transformation_gallery:'Before and after photo gallery',
  multi_branch:          'Manage multiple gym locations',
  franchise_dashboard:   'Franchise-wide analytics',
  white_label:           'Fully branded app experience',
  custom_domain:         'Your own domain name',
  api_access:            'REST API for integrations',
  ai_assistant:          'AI-powered fitness coaching',
  ai_renewal_prediction: 'Predict churn before it happens',
  priority_support:      '24/7 dedicated support team',
  invoice_generation:    'Auto-generate payment receipts',
  payment_history:       'Full payment history and exports',
  supplement_stock:      'Inventory and stock management',
};

const FEATURE_DISPLAY_ORDER: FeatureKey[] = [
  'basic_dashboard', 'attendance', 'fee_collection', 'expense_tracking',
  'membership_management', 'staff_management', 'basic_reports', 'renewal_reminders',
  'trainer_management', 'qr_attendance', 'whatsapp_reminders', 'workout_plans',
  'diet_plans', 'lead_management', 'custom_branding', 'advanced_reports',
  'progress_tracking', 'transformation_gallery', 'multi_branch', 'supplement_stock',
  'ai_assistant', 'priority_support',
];

function formatPrice(monthly: number, annual: number, cycle: BillingCycle): string {
  const price = cycle === 'annual' ? Math.round(annual / 12) : monthly;
  return price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`;
}

function annualSavingPct(monthly: number, annual: number): number | null {
  if (!monthly || !annual) return null;
  return Math.round((1 - annual / (monthly * 12)) * 100);
}

function getComparisonFeatures(
  currentPlan: SubscriptionPlan,
  nextPlan: SubscriptionPlan | null,
): Array<{key: FeatureKey; label: string; sublabel: string; included: boolean}> {
  const rows: Array<{key: FeatureKey; label: string; sublabel: string; included: boolean}> = [];
  for (const key of FEATURE_DISPLAY_ORDER) {
    const included = !!currentPlan.features[key];
    const inNext = nextPlan ? !!nextPlan.features[key] : false;
    if (included || (!included && inNext)) {
      rows.push({
        key,
        label: FEATURE_LABELS[key],
        sublabel: FEATURE_SUBLABELS[key] ?? '',
        included,
      });
    }
  }
  return rows;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const {user, gym} = useAuthStore();
  const {
    plan: currentPlan,
    status,
    trialDaysLeft,
    trialEndsAt,
    subscriptionExpiresAt,
    allPlans,
    allPlansLoading,
    fetchAllPlans,
    fetchSubscription,
  } = useSubscriptionStore();

  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [processing, setProcessing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    fetchAllPlans();
  }, [fetchAllPlans]);

  const currentTierIdx = TIER_ORDER.indexOf(currentPlan.tier);
  const nextPlan =
    currentTierIdx < TIER_ORDER.length - 1
      ? allPlans.find(p => p.tier === TIER_ORDER[currentTierIdx + 1]) ?? null
      : null;

  const tierColor = TIER_COLOR[currentPlan.tier] ?? COLORS.primary;
  const tierIcon  = TIER_ICON[currentPlan.tier] ?? 'star';

  const expiryDate = subscriptionExpiresAt || trialEndsAt;
  const statusLabel =
    status === 'trial'
      ? `Free trial · ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left`
      : status === 'active'
      ? 'Active'
      : status === 'expired'
      ? 'Expired'
      : 'Cancelled';
  const statusColor =
    status === 'active' ? COLORS.success :
    status === 'trial'  ? (trialDaysLeft <= 3 ? COLORS.warning : COLORS.info) :
    COLORS.error;

  const savePct = nextPlan
    ? annualSavingPct(nextPlan.monthly_price, nextPlan.annual_price)
    : null;

  const comparisonRows = getComparisonFeatures(currentPlan, nextPlan);

  async function handleConfirmUpgrade() {
    if (!nextPlan) return;
    if (nextPlan.monthly_price === 0) {
      Linking.openURL(`https://gymblix.com/gym/subscription?plan=${nextPlan.tier}&cycle=${billing}`);
      return;
    }
    if (!gym?.id || processing) return;
    setSheetVisible(false);
    setProcessing(true);
    try {
      const cycle: ApiBillingCycle = billing === 'annual' ? 'annual' : 'monthly';
      const {data: orderData, error: orderError} = await createUpgradeOrder(nextPlan.id, cycle);
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
        description: `${nextPlan.name} · ${cycle === 'annual' ? 'Annual' : 'Monthly'}`,
        prefill: {name: user?.name, email: user?.email, contact: user?.phone ?? undefined},
        theme: {color: TIER_COLOR[nextPlan.tier]},
      });
      const {data: confirmData, error: confirmError} = await confirmPayment(
        nextPlan.id,
        cycle,
        checkoutResult.razorpay_order_id,
        checkoutResult.razorpay_payment_id,
        checkoutResult.razorpay_signature,
      );
      if (confirmError || !confirmData?.success) {
        Alert.alert(
          'Payment received, activation failed',
          'Contact support with payment ID: ' + checkoutResult.razorpay_payment_id,
        );
        return;
      }
      await fetchSubscription(gym.id);
      navigation.goBack();
    } catch (err: any) {
      if (err?.code !== 0) {
        Alert.alert('Payment failed', err?.description ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  }

  const upgradePrice = nextPlan
    ? formatPrice(nextPlan.monthly_price, nextPlan.annual_price, billing)
    : null;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={[styles.iconBtn, styles.headerIconCircle]}>
          <MaterialCommunityIcons name={tierIcon} size={20} color={tierColor} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: 96 + insets.bottom}]}
        showsVerticalScrollIndicator={false}>

        {/* Current Plan Card */}
        <View style={[styles.planCard, {borderColor: tierColor + '40'}]}>
          {/* Decorative glow blob */}
          <View style={[styles.glowBlob, {backgroundColor: tierColor + '18'}]} />

          <View style={styles.planCardTop}>
            <View>
              <View style={[styles.currentBadge, {backgroundColor: tierColor}]}>
                <Text style={styles.currentBadgeText}>CURRENT PLAN</Text>
              </View>
              <Text style={styles.planName}>{currentPlan.name}</Text>
            </View>
            <MaterialCommunityIcons name={tierIcon} size={40} color={tierColor} />
          </View>

          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, {backgroundColor: statusColor + '22', borderColor: statusColor + '44'}]}>
              <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
              <Text style={[styles.statusText, {color: statusColor}]}>{statusLabel}</Text>
            </View>
          </View>

          {expiryDate ? (
            <View style={styles.renewRow}>
              <Text style={styles.renewLabel}>
                {status === 'trial' ? 'Trial ends' : 'Next renewal'}
              </Text>
              <Text style={styles.renewDate}>{dayjs(expiryDate).format('DD MMM YYYY')}</Text>
            </View>
          ) : null}

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={[styles.priceValue, {color: tierColor}]}>
              {currentPlan.monthly_price === 0 ? 'Free' : `₹${currentPlan.monthly_price.toLocaleString('en-IN')}`}
            </Text>
            {currentPlan.monthly_price > 0 && (
              <Text style={styles.pricePer}>/mo</Text>
            )}
          </View>
        </View>

        {/* Plan Comparisons */}
        {(allPlansLoading && !nextPlan) ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading plans…</Text>
          </View>
        ) : comparisonRows.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>PLAN COMPARISONS</Text>
            <View style={styles.comparisonCard}>
              {comparisonRows.map((row, i) => (
                <View
                  key={row.key}
                  style={[
                    styles.compRow,
                    !row.included && styles.compRowLocked,
                    i < comparisonRows.length - 1 && styles.compRowDivider,
                  ]}>
                  <View style={styles.compText}>
                    <Text style={[styles.compLabel, !row.included && styles.compLabelLocked]}>
                      {row.label}
                    </Text>
                    {row.sublabel ? (
                      <Text style={[styles.compSublabel, !row.included && styles.compSublabelLocked]}>
                        {row.sublabel}
                      </Text>
                    ) : null}
                  </View>
                  {row.included ? (
                    <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.success} />
                  ) : (
                    <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textDisabled} />
                  )}
                </View>
              ))}
            </View>

            {/* Annual savings note */}
            {nextPlan && savePct && savePct > 0 && (
              <View style={styles.infoBanner}>
                <MaterialCommunityIcons name="information-outline" size={18} color={COLORS.primary} />
                <Text style={styles.infoBannerText}>
                  Switch to{' '}
                  <Text style={styles.infoBannerBold}>annual billing</Text>
                  {' '}to save{' '}
                  <Text style={styles.infoBannerBold}>{savePct}%</Text>
                  {' '}on your next cycle.
                </Text>
              </View>
            )}

            {/* Already max tier */}
            {!nextPlan && (
              <View style={styles.infoBanner}>
                <MaterialCommunityIcons name="crown" size={18} color={COLORS.primary} />
                <Text style={styles.infoBannerText}>
                  You are on the{' '}
                  <Text style={styles.infoBannerBold}>highest plan</Text>
                  . All features are unlocked.
                </Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footerRow}>
              <MaterialCommunityIcons name="shield-check-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.footerText}>Secure payment · Cancel anytime · No hidden fees</Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Fixed bottom button */}
      {nextPlan && (
        <View style={[styles.bottomBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => setSheetVisible(true)}
            disabled={processing}
            activeOpacity={0.88}>
            {processing ? (
              <ActivityIndicator size="small" color="#0B0F0E" />
            ) : (
              <>
                <MaterialCommunityIcons name="arrow-up-circle" size={20} color="#0B0F0E" />
                <Text style={styles.upgradeBtnText}>Upgrade to {nextPlan.name}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Payment sheet modal */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSheetVisible(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setSheetVisible(false)} />
        <View style={[styles.sheet, {paddingBottom: insets.bottom + SPACING.md}]}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>Upgrade to {nextPlan?.name}</Text>
          <Text style={styles.sheetSub}>
            Access {nextPlan?.name} features and take your gym further.
          </Text>

          {/* Billing toggle inside sheet */}
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[styles.billingBtn, billing === 'monthly' && styles.billingBtnActive]}
              onPress={() => setBilling('monthly')}
              activeOpacity={0.8}>
              <Text style={[styles.billingText, billing === 'monthly' && styles.billingTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billingBtn, billing === 'annual' && styles.billingBtnActive]}
              onPress={() => setBilling('annual')}
              activeOpacity={0.8}>
              <Text style={[styles.billingText, billing === 'annual' && styles.billingTextActive]}>
                Annual
              </Text>
              {savePct && savePct > 0 && (
                <View style={styles.savePill}>
                  <Text style={styles.savePillText}>-{savePct}%</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Price summary */}
          {nextPlan && (
            <View style={styles.priceSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {nextPlan.name} Plan ({billing === 'annual' ? 'Annual' : 'Monthly'})
                </Text>
                <Text style={styles.summaryValue}>{upgradePrice}/mo</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Processing Fee</Text>
                <Text style={styles.summaryValue}>₹0.00</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Due Today</Text>
                <Text style={styles.summaryTotalValue}>
                  {billing === 'annual'
                    ? `₹${nextPlan.annual_price.toLocaleString('en-IN')}`
                    : `₹${nextPlan.monthly_price.toLocaleString('en-IN')}`}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirmUpgrade}
            activeOpacity={0.88}>
            <Text style={styles.confirmBtnText}>Confirm &amp; Upgrade</Text>
          </TouchableOpacity>

          <Text style={styles.sslNote}>SECURE 256-BIT SSL ENCRYPTED CHECKOUT</Text>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  iconBtn: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  headerIconCircle: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },

  scroll: {paddingHorizontal: SPACING.md, paddingTop: SPACING.xs},

  // Current plan card
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    gap: SPACING.sm,
  },
  glowBlob: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  planCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: '#0B0F0E',
    letterSpacing: 0.8,
  },
  planName: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  statusRow: {flexDirection: 'row'},
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusDot: {width: 6, height: 6, borderRadius: 3},
  statusText: {fontSize: 12, fontWeight: FONT_WEIGHT.bold},
  renewRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  renewLabel: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary},
  renewDate: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  priceRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 4},
  priceValue: {fontSize: 36, fontWeight: FONT_WEIGHT.black, lineHeight: 40},
  pricePer: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: 4},

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
  },

  // Comparison list
  comparisonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  compRowLocked: {backgroundColor: COLORS.surface + 'AA'},
  compRowDivider: {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border},
  compText: {flex: 1, paddingRight: SPACING.sm},
  compLabel: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  compLabelLocked: {color: COLORS.textSecondary, opacity: 0.7},
  compSublabel: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},
  compSublabelLocked: {opacity: 0.6},

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  infoBannerText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  infoBannerBold: {color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.bold},

  // Footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  footerText: {fontSize: 11, color: COLORS.textSecondary},

  // Loading
  loadingWrap: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  loadingText: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary},

  // Fixed bottom upgrade button
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 15,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  upgradeBtnText: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.bold,
    color: '#0B0F0E',
    letterSpacing: 0.3,
  },

  // Payment sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary + '20',
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.pill,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  sheetSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },

  // Billing toggle inside sheet
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: 4,
    gap: 4,
    marginBottom: SPACING.md,
  },
  billingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  billingBtnActive: {backgroundColor: COLORS.surface},
  billingText: {fontSize: 13, fontWeight: FONT_WEIGHT.medium, color: COLORS.textSecondary},
  billingTextActive: {color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.bold},
  savePill: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  savePillText: {fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: '#0B0F0E'},

  // Price summary
  priceSummary: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary},
  summaryValue: {fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semiBold},
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  summaryTotalLabel: {fontSize: 14, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},
  summaryTotalValue: {fontSize: 20, fontWeight: FONT_WEIGHT.black, color: COLORS.primary},

  // Confirm button
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.bold,
    color: '#0B0F0E',
    letterSpacing: 0.3,
  },
  sslNote: {
    fontSize: 9,
    color: COLORS.textDisabled,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
});

export default SubscriptionScreen;
