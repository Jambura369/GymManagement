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
import {Card, Menu} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {useFeature} from '../../hooks/useFeature';
import {COLORS, SPACING, BORDER_RADIUS, PAGINATION} from '../../constants';
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
  const {isDark} = useThemeStore();
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

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;
  const subColor = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;

  useEffect(() => {
    if (!hasAccess) {
      navigation.replace('FeatureLocked', {
        featureName: 'Payment History',
        featureIcon: 'receipt-text-outline',
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

  const renderItem = ({item}: {item: Payment}) => (
    <Card style={[styles.card, {backgroundColor: cardBg}]}>
      <Card.Content style={styles.cardContent}>
        <View style={[styles.iconContainer, {backgroundColor: COLORS.success + '20'}]}>
          <MaterialCommunityIcons name="cash-check" size={22} color={COLORS.success} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, {color: textColor}]}>
            {item.package?.name || 'Membership Payment'}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.methodBadge, {backgroundColor: COLORS.info + '18'}]}>
              <Text style={[styles.methodText, {color: COLORS.info}]}>{item.payment_method}</Text>
            </View>
            <Text style={[styles.date, {color: subColor}]}>
              {dayjs(item.payment_date).format('DD MMM YYYY')}
            </Text>
          </View>
          {item.receiver?.name && (
            <Text style={[styles.receivedBy, {color: subColor}]}>
              Received by {item.receiver.name}
            </Text>
          )}
        </View>
        <View style={styles.amountSection}>
          <Text style={[styles.amount, {color: COLORS.success}]}>
            ₹{Number(item.amount).toLocaleString('en-IN')}
          </Text>
          <Menu
            visible={menuId === item.id}
            onDismiss={() => setMenuId(null)}
            anchor={
              <TouchableOpacity onPress={() => setMenuId(item.id)} disabled={sharingId === item.id}>
                {sharingId === item.id ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <MaterialCommunityIcons name="dots-vertical" size={20} color={subColor} />
                )}
              </TouchableOpacity>
            }>
            <Menu.Item
              onPress={() => {
                setMenuId(null);
                handleShareInvoice(item);
              }}
              title="Share Invoice"
              leadingIcon="file-pdf-box"
            />
          </Menu>
        </View>
      </Card.Content>
    </Card>
  );

  if (!hasAccess) return null;

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      <AppHeader
        title="Payment History"
        subtitle={studentName}
        onBack={() => navigation.goBack()}
        isDark={isDark}
      />

      <View style={[styles.summaryBar, {backgroundColor: cardBg}]}>
        <Text style={[styles.summaryLabel, {color: subColor}]}>Total Paid</Text>
        <Text style={[styles.summaryValue, {color: COLORS.success}]}>
          ₹{totalPaid.toLocaleString('en-IN')}
        </Text>
        <Text style={[styles.summaryCount, {color: subColor}]}>
          {payments.length} payment{payments.length === 1 ? '' : 's'}
        </Text>
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
              isDark={isDark}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.footerLoader} color={COLORS.primary} /> : null
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
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 2,
  },
  summaryLabel: {fontSize: 12, fontWeight: '500'},
  summaryValue: {fontSize: 18, fontWeight: '800', marginLeft: 'auto'},
  summaryCount: {fontSize: 11},
  list: {padding: SPACING.md},
  card: {borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.sm, elevation: 2},
  cardContent: {flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm},
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {flex: 1},
  title: {fontSize: 14, fontWeight: '600', marginBottom: 4},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.xs},
  methodBadge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10},
  methodText: {fontSize: 10, fontWeight: '600'},
  date: {fontSize: 11},
  receivedBy: {fontSize: 11, marginTop: 3},
  amountSection: {alignItems: 'flex-end', gap: 4},
  amount: {fontSize: 16, fontWeight: '700'},
  footerLoader: {marginVertical: SPACING.md},
});

export default StudentPaymentHistoryScreen;
