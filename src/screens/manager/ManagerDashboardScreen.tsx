import React, {useEffect, useCallback} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/authStore';
import {useDashboardStore} from '../../store/dashboardStore';
import {syncExpiredMemberships} from '../../services/studentService';
import {checkAndSendExpiryNotifications} from '../../services/notificationService';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList} from '../../types';
import StatCard from '../../components/common/StatCard';
import DashboardSkeleton from '../../components/skeletons/DashboardSkeleton';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ManagerDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const insets = useSafeAreaInsets();
  const {stats, isLoading, refresh} = useDashboardStore();
  const [refreshing, setRefreshing] = React.useState(false);


  const load = useCallback(async () => {
    if (!gym) return;
    syncExpiredMemberships(gym.id); // fire-and-forget: keeps is_active accurate
    checkAndSendExpiryNotifications(gym.id); // once-per-day expiry alert push
    await refresh(gym.id);
  }, [gym]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const formatCurrency = (v: number) =>
    `₹${v.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

  if (isLoading && !stats) {
    return (
      <View style={[styles.container, {backgroundColor: COLORS.background}]}>
        <DashboardSkeleton isDark />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: COLORS.background}]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3DB8FF']}
        />
      }
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, {backgroundColor: '#3DB8FF', paddingTop: insets.top + SPACING.md}]}>
        <View style={styles.headerLeft}>
          {gym?.gym_logo ? (
            <Image source={{uri: gym.gym_logo}} style={styles.gymLogo} />
          ) : null}
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>Manager Dashboard</Text>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.gymName}>{gym?.gym_name}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.notifBtn}>
          <MaterialCommunityIcons name="bell-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Students"
          value={stats?.total_students ?? 0}
          icon="account-group"
          color={COLORS.primary}
          isDark={true}
          onPress={() => navigation.navigate('Students' as any)}
        />
        <StatCard
          title="Pending Verify"
          value={stats?.pending_verification ?? 0}
          icon="account-clock"
          color={COLORS.warning}
          isDark={true}
          onPress={() => navigation.navigate('VerificationList')}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="Revenue"
          value={stats ? formatCurrency(stats.revenue_this_month) : '₹0'}
          icon="cash"
          color={COLORS.success}
          isDark={true}
        />
        <StatCard
          title="Expenses"
          value={
            stats
              ? formatCurrency(stats.expense_this_month)
              : '₹0'
          }
          icon="cash-minus"
          color={COLORS.error}
          isDark={true}
          onPress={() => navigation.navigate('Expenses' as any)}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="Expired"
          value={stats?.expired_memberships ?? 0}
          icon="calendar-remove"
          color={COLORS.secondary}
          isDark={true}
        />
        <StatCard
          title="Expiring 7d"
          value={stats?.expiring_7_days ?? 0}
          icon="calendar-clock"
          color={COLORS.info}
          isDark={true}
        />
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, {color: COLORS.textPrimary}]}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {[
          {icon: 'account-plus', label: 'Add Student', route: 'AddStudent', color: COLORS.primary},
          {icon: 'calendar-check', label: 'Attendance', route: 'Attendance', color: COLORS.success},
          {icon: 'account-clock', label: 'Verifications', route: 'VerificationList', color: COLORS.warning},
          {icon: 'cash-plus', label: 'Add Expense', route: 'AddExpense', color: COLORS.error},
          {icon: 'currency-inr', label: 'Trainer Salary', route: 'SalaryList', color: COLORS.success},
          {icon: 'chart-bar', label: 'Reports', route: 'Reports', color: COLORS.secondary},
          {icon: 'bell-outline', label: 'Notifications', route: 'Notifications', color: COLORS.info},
        ].map(item => (
          <TouchableOpacity
            key={item.route}
            style={[styles.quickAction, {backgroundColor: COLORS.surface}]}
            onPress={() => navigation.navigate(item.route as any)}>
            <View style={[styles.qaIcon, {backgroundColor: item.color + '20'}]}>
              <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={[styles.qaLabel, {color: COLORS.textPrimary}]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: SPACING.xl},
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1},
  headerTextWrap: {flex: 1},
  gymLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  greeting: {color: 'rgba(255,255,255,0.8)', fontSize: 13},
  userName: {color: '#FFF', fontSize: 20, fontWeight: '700'},
  gymName: {color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2},
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {flexDirection: 'row', paddingHorizontal: SPACING.sm, marginTop: SPACING.xs},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  quickAction: {
    width: '30%',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    elevation: 1,
    margin: '1.5%',
  },
  qaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  qaLabel: {fontSize: 11, fontWeight: '600', textAlign: 'center'},
});

export default ManagerDashboardScreen;
