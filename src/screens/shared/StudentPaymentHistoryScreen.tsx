import React, {useCallback, useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useFeature} from '../../hooks/useFeature';
import {PAGINATION} from '../../constants';
import {COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING} from '../../theme';
import {RootStackParamList, Payment} from '../../types';
import {fetchPaymentsByStudent} from '../../services/paymentService';
import {shareInvoice} from '../../services/invoiceService';
import AppHeader from '../../components/common/AppHeader';
import EmptyState from '../../components/common/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'StudentPaymentHistory'>;

const StudentPaymentHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {gym} = useAuthStore();
  const insets = useSafeAreaInsets();
  const {hasAccess} = useFeature('payment_history');
  const {hasAccess: canInvoice} = useFeature('invoice_generation');

  const {studentId, studentName} = route.params;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);


  useEffect(() => {
    if (!hasAccess) {
      navigation.replace('FeatureLocked', {
        featureName: 'Payment History',
        featureIcon: 'receipt',
        requiredPlan: 'professional',
        description: 'View full payment history and receipts with the Professional plan.',
      });
    }
  }, [hasAccess, navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchPaymentsByStudent(studentId, 1);
    if (result.data) {
      setPayments(result.data.data);
      setHasMore(result.data.hasMore);
      setPage(1);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    if (hasAccess) load();
  }, [hasAccess, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const result = await fetchPaymentsByStudent(studentId, nextPage);
    if (result.data) {
      setPayments(prev => [...prev, ...result.data!.data]);
      setHasMore(result.data.hasMore);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const handleShareInvoice = async (payment: Payment) => {
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
    setSharingId(payment.id);
    try {
      await shareInvoice(gym, {
        invoiceNo: payment.id.slice(0, 8).toUpperCase(),
        date: payment.payment_date,
        title: 'Payment Receipt',
        payerName: studentName,
        items: [
          {
            label: payment.package?.name
              ? `Membership — ${payment.package.name}`
              : 'Membership Payment',
            amount: Number(payment.amount),
          },
        ],
        total: Number(payment.amount),
        method: payment.payment_method,
        note: payment.transaction_note,
      });
    } catch (err: any) {
      Toast.show({type: 'error', text1: 'Could not share invoice', text2: err.message});
    } finally {
      setSharingId(null);
    }
  };

  const getRowIcon = (item: Payment): {name: string; bg: string; color: string} => {
    const name = (item.package?.name || '').toLowerCase();
    if (name.includes('training') || name.includes('pt') || name.includes('session')) {
      return {name: 'bank-outline', bg: '#2563eb20', color: '#60a5fa'};
    }
    if (name.includes('supplement') || name.includes('bundle') || name.includes('stock')) {
      return {name: 'package-variant', bg: COLORS.primary + '20', color: COLORS.primary};
    }
    return {name: 'credit-card-outline', bg: COLORS.success + '20', color: COLORS.success};
  };

  const renderItem = ({item}: {item: Payment}) => {
    const rowIcon = getRowIcon(item);
    return (
      <View style={styles.card}>
        <View style={[styles.iconContainer, {backgroundColor: rowIcon.bg}]}>
          <MaterialCommunityIcons name={rowIcon.name} size={20} color={rowIcon.color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.package?.name || 'Membership Payment'}
          </Text>
          <Text style={styles.date}>
            {dayjs(item.payment_date).format('MMM DD, YYYY')}
          </Text>
        </View>
        <View style={styles.amountSection}>
          <Text style={styles.amount}>
            ₹{Number(item.amount).toLocaleString('en-IN')}
          </Text>
          <TouchableOpacity
            onPress={() => handleShareInvoice(item)}
            disabled={sharingId === item.id}
            hitSlop={8}>
            {sharingId === item.id ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.receiptLink}>Receipt</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!hasAccess) return null;

  return (
    <View style={[styles.container, {backgroundColor: COLORS.background}]}>
      <AppHeader
        title={`${studentName} — Payments`}
        onBack={() => navigation.goBack()}
        isDark={true}
        rightComponent={
          <TouchableOpacity hitSlop={8}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        }
      />

      {/* Stat tiles */}
      <View style={styles.statRow}>
        <View style={styles.statTile}>
          <Text style={[styles.statLabel, {color: COLORS.textSecondary}]}>TOTAL PAID</Text>
          <Text style={[styles.statBigValue, {color: COLORS.primary}]}>
            ₹{totalPaid.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={[styles.statTile, {marginLeft: SPACING.sm}]}>
          <Text style={[styles.statLabel, {color: COLORS.textSecondary}]}>OUTSTANDING</Text>
          <Text style={[styles.statBigValue, {color: COLORS.primary}]}>₹0</Text>
        </View>
      </View>

      <View style={styles.historyHeader}>
        <Text style={[styles.historyTitle, {color: COLORS.textPrimary}]}>Transaction History</Text>
        <MaterialCommunityIcons name="filter-variant" size={20} color={COLORS.textSecondary} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, {paddingBottom: SPACING.lg + insets.bottom}]}
          ListEmptyComponent={
            <EmptyState
              icon="cash-remove"
              title="No payments yet"
              subtitle="Payments recorded for this student will appear here"
              isDark={true}
            />
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={loadMore}
                disabled={loadingMore}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>Load Older Transactions</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  statRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  statLabel: {fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4},
  statBigValue: {fontSize: 28, fontWeight: '800'},
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  historyTitle: {fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold},
  receiptLink: {fontSize: 12, fontWeight: '600', color: COLORS.textSecondary},
  list: {padding: SPACING.md},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {flex: 1},
  itemTitle: {fontSize: 14, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary, marginBottom: 3},
  date: {fontSize: 12, color: COLORS.textSecondary},
  amountSection: {alignItems: 'flex-end', gap: 4},
  amount: {fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.xs,
  },
  loadMoreText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
  },
});

export default StudentPaymentHistoryScreen;
