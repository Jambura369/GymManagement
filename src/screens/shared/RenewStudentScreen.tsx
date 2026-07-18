import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useStudentStore} from '../../store/studentStore';
import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, Package, Student} from '../../types';
import {getStudent} from '../../services/studentService';
import {fetchPackages} from '../../services/packageService';
import AppButton from '../../components/common/AppButton';

const schema = z.object({
  joining_date: z.string(),
  package_id: z.string().min(1, 'Select a plan'),
  payment_type: z.enum(['Cash', 'QR']),
  amount_paid: z.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type Route = RouteProp<RootStackParamList, 'RenewStudent'>;

type LocalPayment = 'Cash' | 'UPI' | 'Card';

const RenewStudentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const {user, gym} = useAuthStore();
  const {renewStudent} = useStudentStore();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<LocalPayment>('Cash');
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  const {handleSubmit, setValue, watch} = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      joining_date: dayjs().format('YYYY-MM-DD'),
      package_id: '',
      payment_type: 'Cash',
      amount_paid: 0,
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!gym) return;
    const [studentRes, pkgRes] = await Promise.all([
      getStudent(route.params.studentId),
      fetchPackages(gym.id, true),
    ]);
    if (studentRes.data) setStudent(studentRes.data);
    if (pkgRes.data) setPackages(pkgRes.data);
  };

  const selectedPkg = packages.find(p => p.id === selectedPackageId);

  const selectPackage = (pkg: Package) => {
    setSelectedPackageId(pkg.id);
    setValue('package_id', pkg.id);
    setValue('amount_paid', pkg.price);
  };

  const newExpiry = selectedPkg
    ? dayjs().add(selectedPkg.duration_days, 'day').format('MMM DD, YYYY')
    : '—';
  const amountDue = selectedPkg ? `₹${selectedPkg.price.toLocaleString('en-IN')}` : '—';

  // Best value = most expensive plan
  const bestValueId = packages.length > 0
    ? packages.reduce((a, b) => (b.price > a.price ? b : a)).id
    : null;

  const onSubmit = async () => {
    if (!selectedPackageId) {
      Toast.show({type: 'error', text1: 'Select a renewal plan'});
      return;
    }
    if (!gym || !user) return;
    setLoading(true);
    const paymentType = paymentMethod === 'Cash' ? 'Cash' : 'QR';
    const success = await renewStudent(
      route.params.studentId,
      gym.id,
      user.id,
      user.role,
      {
        joining_date: dayjs().format('YYYY-MM-DD'),
        package_id: selectedPackageId,
        payment_type: paymentType,
        amount_paid: selectedPkg?.price ?? 0,
      },
    );
    setLoading(false);
    if (success) {
      Toast.show({
        type: 'success',
        text1: 'Membership Renewed!',
        text2: isAdminOrManager
          ? 'Student is now active.'
          : 'Renewal pending Admin/Manager verification.',
      });
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed', text2: 'Could not renew membership'});
    }
  };

  const memberId = student ? `#GX-${student.id.slice(-4).toUpperCase()}` : '';
  const expiresOn = student?.membership_expiry
    ? dayjs(student.membership_expiry).format('MMM DD, YYYY')
    : 'N/A';

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Renew Membership</Text>
        <View style={{width: 24}} />
      </View>

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, {paddingBottom: 24 + insets.bottom}]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Current Plan Card */}
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <Text style={styles.currentPlanLabel}>CURRENT PLAN</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.currentPlanName}>
              {student?.package?.name || 'No Active Plan'}
            </Text>
            <View style={styles.currentPlanMeta}>
              <View>
                <Text style={styles.metaLabel}>Expires On</Text>
                <Text style={styles.metaValue}>{expiresOn}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View>
                <Text style={styles.metaLabel}>Member ID</Text>
                <Text style={styles.metaValue}>{memberId}</Text>
              </View>
            </View>
          </View>

          {!isAdminOrManager && (
            <View style={styles.pendingNote}>
              <MaterialCommunityIcons name="information-outline" size={14} color={COLORS.warning} />
              <Text style={styles.pendingText}>
                Renewal requires Admin/Manager approval before student is activated.
              </Text>
            </View>
          )}

          {/* Select Renewal Plan */}
          <Text style={styles.sectionLabel}>SELECT RENEWAL PLAN</Text>

          {packages.map(pkg => {
            const isSelected = pkg.id === selectedPackageId;
            const isBestValue = pkg.id === bestValueId;
            return (
              <TouchableOpacity
                key={pkg.id}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => selectPackage(pkg)}
                activeOpacity={0.75}>
                <View style={styles.planCardInner}>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                      {pkg.name}
                    </Text>
                    {pkg.description ? (
                      <Text style={styles.planDesc}>{pkg.description}</Text>
                    ) : null}
                  </View>
                  <View style={styles.planPriceCol}>
                    <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                      ₹{pkg.price.toLocaleString('en-IN')}
                    </Text>
                    {isBestValue && (
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>BEST VALUE</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* New Expiry + Amount Due */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryField}>
              <Text style={styles.summaryLabel}>NEW EXPIRY</Text>
              <Text style={styles.summaryValue}>{newExpiry}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryField}>
              <Text style={styles.summaryLabel}>AMOUNT DUE</Text>
              <Text style={styles.summaryValue}>{amountDue}</Text>
            </View>
          </View>

          {/* Payment Method */}
          <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
          <View style={styles.paymentRow}>
            {(['Cash', 'UPI', 'Card'] as LocalPayment[]).map(method => {
              const isActive = paymentMethod === method;
              const icon = method === 'Cash' ? 'cash' : method === 'UPI' ? 'bank' : 'credit-card';
              return (
                <TouchableOpacity
                  key={method}
                  style={[styles.paymentChip, isActive && styles.paymentChipActive]}
                  onPress={() => setPaymentMethod(method)}
                  activeOpacity={0.75}>
                  <MaterialCommunityIcons
                    name={icon}
                    size={16}
                    color={isActive ? '#0B0F0E' : COLORS.textSecondary}
                  />
                  <Text style={[styles.paymentChipText, isActive && styles.paymentChipTextActive]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            By confirming, you agree to the Gymblix Membership Terms & Privacy Policy.
            Renewal will take effect from {dayjs().format('MMM DD, YYYY')}.
          </Text>

          {/* Confirm */}
          <TouchableOpacity
            style={[styles.confirmBtn, loading && {opacity: 0.7}]}
            onPress={onSubmit}
            disabled={loading}
            activeOpacity={0.85}>
            <Text style={styles.confirmBtnText}>
              {loading ? 'Processing...' : (isAdminOrManager ? 'Confirm Renewal' : 'Submit for Approval')}
            </Text>
            {!loading && (
              <MaterialCommunityIcons name="arrow-right" size={20} color="#0B0F0E" />
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  scroll: {paddingHorizontal: SPACING.md, paddingTop: SPACING.xs},

  // Current plan card
  currentPlanCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  currentPlanLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },
  activeBadge: {
    backgroundColor: COLORS.primary + '25',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
  },
  activeBadgeText: {fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},
  currentPlanName: {
    fontSize: 22,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  currentPlanMeta: {flexDirection: 'row', alignItems: 'center', gap: SPACING.md},
  metaLabel: {fontSize: 11, color: COLORS.textSecondary},
  metaValue: {fontSize: 13, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary, marginTop: 2},
  metaDivider: {width: 1, height: 28, backgroundColor: COLORS.border},

  pendingNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: COLORS.warning + '15',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  pendingText: {flex: 1, fontSize: 12, color: COLORS.warning, lineHeight: 18},

  sectionLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },

  // Plan cards
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  planCardSelected: {borderColor: COLORS.primary},
  planCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
  },
  planInfo: {flex: 1},
  planName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  planNameSelected: {color: COLORS.primary},
  planDesc: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 3},
  planPriceCol: {alignItems: 'flex-end', gap: 6},
  planPrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  planPriceSelected: {color: COLORS.primary},
  bestValueBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  bestValueText: {fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: '#0B0F0E', letterSpacing: 0.5},

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginVertical: SPACING.md,
    overflow: 'hidden',
  },
  summaryField: {flex: 1, padding: SPACING.md},
  summaryDivider: {width: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm},
  summaryLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },
  summaryValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },

  // Payment method
  paymentRow: {flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md},
  paymentChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  paymentChipActive: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  paymentChipText: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textSecondary},
  paymentChipTextActive: {color: '#0B0F0E'},

  terms: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },

  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
    marginTop: SPACING.xs,
  },
  confirmBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#0B0F0E',
  },
});

export default RenewStudentScreen;
