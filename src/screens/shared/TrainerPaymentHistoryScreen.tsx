import React, {useCallback, useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useFeature} from '../../hooks/useFeature';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, TrainerSalary} from '../../types';
import {fetchSalaries} from '../../services/salaryService';
import {shareInvoice} from '../../services/invoiceService';
import EmptyState from '../../components/common/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'TrainerPaymentHistory'>;

const TrainerPaymentHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {gym} = useAuthStore();
  const insets = useSafeAreaInsets();
  const {hasAccess} = useFeature('payment_history');
  const {hasAccess: canInvoice} = useFeature('invoice_generation');

  const {trainerId, trainerName} = route.params;

  const [salaries, setSalaries] = useState<TrainerSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const currentYear = dayjs().year();

  useEffect(() => {
    if (!hasAccess) {
      navigation.replace('FeatureLocked', {
        featureName: 'Payment History',
        featureIcon: 'receipt',
        requiredPlan: 'professional',
        description: 'View full salary payment history with the Professional plan.',
      });
    }
  }, [hasAccess, navigation]);

  const load = useCallback(async () => {
    if (!gym) return;
    setLoading(true);
    const result = await fetchSalaries(gym.id, trainerId);
    if (result.data) setSalaries(result.data);
    setLoading(false);
  }, [gym, trainerId]);

  useEffect(() => {
    if (hasAccess) load();
  }, [hasAccess, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const yearSalaries = salaries.filter(
    s => dayjs(s.payment_date).year() === currentYear,
  );
  const yearTotal = yearSalaries.reduce((sum, s) => sum + Number(s.salary_amount), 0);
  const avgPayment =
    yearSalaries.length > 0 ? Math.round(yearTotal / yearSalaries.length) : 0;

  const handleShareInvoice = async (salary: TrainerSalary) => {
    if (!gym) return;
    if (!canInvoice) {
      navigation.navigate('FeatureLocked', {
        featureName: 'Invoice Generation',
        featureIcon: 'file-pdf-box',
        requiredPlan: 'professional',
        description: 'Generate and share PDF invoices with the Professional plan.',
      });
      return;
    }
    setSharingId(salary.id);
    try {
      await shareInvoice(gym, {
        invoiceNo: salary.id.slice(0, 8).toUpperCase(),
        date: salary.payment_date,
        title: 'Salary Receipt',
        payerName: trainerName,
        items: [{label: 'Trainer Salary', amount: Number(salary.salary_amount)}],
        total: Number(salary.salary_amount),
        method: salary.payment_type,
        note: salary.notes,
      });
    } catch (err: any) {
      Toast.show({type: 'error', text1: 'Could not share invoice', text2: err.message});
    } finally {
      setSharingId(null);
    }
  };

  const renderItem = ({item}: {item: TrainerSalary}) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name="calendar-month-outline" size={22} color={COLORS.textSecondary} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{dayjs(item.payment_date).format('MMMM YYYY')}</Text>
        <Text style={styles.cardSubtitle}>
          {item.payment_type}
          {item.notes ? ` • ${item.notes}` : ''}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardAmount}>
          ₹{Number(item.salary_amount).toLocaleString('en-IN')}
        </Text>
        <View style={styles.paidBadge}>
          <Text style={styles.paidBadgeText}>PAID</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.shareBtn}
        onPress={() => handleShareInvoice(item)}
        hitSlop={8}
        disabled={sharingId === item.id}>
        {sharingId === item.id ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <MaterialCommunityIcons name="share-variant-outline" size={16} color={COLORS.textSecondary} />
        )}
      </TouchableOpacity>
    </View>
  );

  if (!hasAccess) return null;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>{trainerName}</Text>
          <Text style={styles.headerSubtitle}>Salary History</Text>
        </View>
        <TouchableOpacity hitSlop={8}>
          <MaterialCommunityIcons name="download-outline" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Yearly Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryYear}>Yearly Summary {currentYear}</Text>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>TOTAL PAID YTD</Text>
            <Text style={styles.summaryAmount}>
              ₹{yearTotal.toLocaleString('en-IN')}
            </Text>
          </View>
          {yearSalaries.length > 0 && (
            <View style={styles.growthBadge}>
              <Text style={styles.growthText}>{yearSalaries.length} payments</Text>
            </View>
          )}
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Sessions</Text>
            <Text style={styles.statValue}>{yearSalaries.length}</Text>
          </View>
          <View style={[styles.statItem, {alignItems: 'flex-end'}]}>
            <Text style={styles.statLabel}>Avg/Session</Text>
            <Text style={styles.statValue}>₹{avgPayment.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>

      {/* Transactions header */}
      <View style={styles.txHeader}>
        <Text style={styles.txTitle}>TRANSACTIONS</Text>
        <TouchableOpacity hitSlop={8}>
          <MaterialCommunityIcons name="filter-variant" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={salaries}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, {paddingBottom: 100 + insets.bottom}]}
          ListEmptyComponent={
            <EmptyState
              icon="cash-remove"
              title="No salary payments yet"
              subtitle="Salary payments will appear here"
              isDark={true}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
        <TouchableOpacity
          style={styles.payoutBtn}
          onPress={() => navigation.navigate('AddSalary')}
          activeOpacity={0.85}>
          <MaterialCommunityIcons name="cash-plus" size={18} color="#0B0F0E" />
          <Text style={styles.payoutBtnText}>Request Manual Payout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  headerCenter: {flex: 1},
  headerName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Summary card
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryYear: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semiBold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.primary,
    lineHeight: 38,
  },
  growthBadge: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  growthText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2f2d',
  },
  statItem: {flex: 1},
  statLabel: {fontSize: 10, color: COLORS.textSecondary, letterSpacing: 0.3, marginBottom: 2},
  statValue: {fontSize: 14, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},

  // Transactions header
  txHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  txTitle: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list: {paddingHorizontal: SPACING.md},

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: '#1e2420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {flex: 1},
  cardTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  cardRight: {alignItems: 'flex-end', gap: 6},
  cardAmount: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  paidBadge: {
    backgroundColor: COLORS.success + '20',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.success,
    letterSpacing: 0.3,
  },
  shareBtn: {
    padding: 4,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2f2d',
  },
  payoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
  },
  payoutBtnText: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.bold,
    color: '#0B0F0E',
  },
});

export default TrainerPaymentHistoryScreen;
