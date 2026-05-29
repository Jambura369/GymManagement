import React, {useEffect, useCallback} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Card, Avatar, Chip} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {useDashboardStore} from '../../store/dashboardStore';
import {useStudentStore} from '../../store/studentStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList, Student} from '../../types';
import StatCard from '../../components/common/StatCard';
import DashboardSkeleton from '../../components/skeletons/DashboardSkeleton';
import GymProLogo from '../../components/common/GymProLogo';
import {getExpiringMemberships} from '../../services/studentService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();
  const {stats, chartData, isLoading, refresh} = useDashboardStore();
  const [expiringStudents, setExpiringStudents] = React.useState<Student[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const load = useCallback(async () => {
    if (!gym) return;
    await refresh(gym.id);
    const result = await getExpiringMemberships(gym.id, 7);
    if (result.data) setExpiringStudents(result.data);
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

  const profit = stats
    ? stats.revenue_this_month - stats.expense_this_month - stats.salary_this_month
    : 0;

  if (isLoading && !stats) {
    return (
      <View style={[styles.container, {backgroundColor: bgColor}]}>
        <DashboardSkeleton isDark={isDark} />
      </View>
    );
  }

  const ExpiryItem = ({item}: {item: Student}) => {
    const daysLeft = dayjs(item.membership_expiry).diff(dayjs(), 'day');
    const isExpired = daysLeft < 0;
    const isUrgent = daysLeft <= 3;
    const color = isExpired ? COLORS.error : isUrgent ? COLORS.warning : COLORS.info;

    return (
      <Card
        style={[styles.expiryCard, {backgroundColor: cardBg}]}
        onPress={() => navigation.navigate('StudentDetail', {studentId: item.id})}>
        <Card.Content style={styles.expiryContent}>
          <Avatar.Text
            size={40}
            label={item.name.slice(0, 2).toUpperCase()}
            style={{backgroundColor: color + '30'}}
            labelStyle={{color, fontSize: 14}}
          />
          <View style={styles.expiryInfo}>
            <Text style={[styles.expiryName, {color: textColor}]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.expiryDate, {color}]}>
              {isExpired
                ? `Expired ${Math.abs(daysLeft)} days ago`
                : daysLeft === 0
                ? 'Expires today!'
                : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.callBtn, {backgroundColor: COLORS.success + '20'}]}
            onPress={() => Linking.openURL(`tel:${item.phone}`)}>
            <MaterialCommunityIcons name="phone" size={18} color={COLORS.success} />
          </TouchableOpacity>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: bgColor}]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
        />
      }
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.header, {paddingTop: insets.top + SPACING.md}]}>
        <View style={styles.headerDecor} />
        <View style={styles.headerRow}>
          <GymProLogo size={44} />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              {dayjs().hour() < 12 ? 'Good Morning' : dayjs().hour() < 17 ? 'Good Afternoon' : 'Good Evening'}
            </Text>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.gymName}>{gym?.gym_name}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.notifBtn}>
            <MaterialCommunityIcons name="bell-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Revenue Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, {backgroundColor: COLORS.success}]}>
          <MaterialCommunityIcons name="trending-up" size={20} color="#FFF" />
          <Text style={styles.summaryLabel}>Revenue</Text>
          <Text style={styles.summaryValue}>
            {stats ? formatCurrency(stats.revenue_this_month) : '₹0'}
          </Text>
        </View>
        <View style={[styles.summaryCard, {backgroundColor: COLORS.error}]}>
          <MaterialCommunityIcons name="trending-down" size={20} color="#FFF" />
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={styles.summaryValue}>
            {stats ? formatCurrency(stats.expense_this_month + stats.salary_this_month) : '₹0'}
          </Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            {backgroundColor: profit >= 0 ? COLORS.primary : COLORS.warning},
          ]}>
          <MaterialCommunityIcons name="cash" size={20} color="#FFF" />
          <Text style={styles.summaryLabel}>Profit</Text>
          <Text style={styles.summaryValue}>{formatCurrency(profit)}</Text>
        </View>
      </View>

      {/* Alerts */}
      {((stats?.expiring_3_days ?? 0) > 0 ||
        (stats?.pending_verification ?? 0) > 0 ||
        (stats?.expired_memberships ?? 0) > 0) && (
        <View style={styles.alertsRow}>
          {(stats?.expiring_3_days ?? 0) > 0 && (
            <Chip
              icon="alert"
              style={[styles.alertChip, {backgroundColor: COLORS.error + '20'}]}
              textStyle={{color: COLORS.error, fontSize: 11}}
              onPress={() => navigation.navigate('Students' as any)}>
              {stats!.expiring_3_days} Expiring in 3d
            </Chip>
          )}
          {(stats?.pending_verification ?? 0) > 0 && (
            <Chip
              icon="clock-outline"
              style={[styles.alertChip, {backgroundColor: COLORS.warning + '20'}]}
              textStyle={{color: COLORS.warning, fontSize: 11}}
              onPress={() => navigation.navigate('VerificationList')}>
              {stats!.pending_verification} Pending
            </Chip>
          )}
          {(stats?.expired_memberships ?? 0) > 0 && (
            <Chip
              icon="calendar-remove"
              style={[styles.alertChip, {backgroundColor: COLORS.secondary + '20'}]}
              textStyle={{color: COLORS.secondary, fontSize: 11}}
              onPress={() => navigation.navigate('Students' as any)}>
              {stats!.expired_memberships} Expired
            </Chip>
          )}
        </View>
      )}

      {/* Stat Cards */}
      <Text style={[styles.sectionTitle, {color: textColor}]}>Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Students"
          value={stats?.total_students ?? 0}
          icon="account-group"
          color={COLORS.primary}
          isDark={isDark}
          onPress={() => navigation.navigate('Students' as any)}
        />
        <StatCard
          title="Active Members"
          value={stats?.active_students ?? 0}
          icon="account-check"
          color={COLORS.success}
          isDark={isDark}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="Pending Verify"
          value={stats?.pending_verification ?? 0}
          icon="account-clock"
          color={COLORS.warning}
          isDark={isDark}
          onPress={() => navigation.navigate('VerificationList')}
        />
        <StatCard
          title="Expiring 7 Days"
          value={stats?.expiring_7_days ?? 0}
          icon="calendar-clock"
          color={COLORS.info}
          isDark={isDark}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="Trainers"
          value={stats?.trainer_count ?? 0}
          icon="account-tie"
          color={COLORS.trainerColor}
          isDark={isDark}
          onPress={() => navigation.navigate('UserManagement')}
        />
        <StatCard
          title="Managers"
          value={stats?.manager_count ?? 0}
          icon="account-supervisor"
          color={COLORS.managerColor}
          isDark={isDark}
        />
      </View>

      {/* Expiring Memberships */}
      {expiringStudents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, {color: textColor, marginBottom: 0}]}>
              Membership Alerts
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Students' as any)}>
              <Text style={[styles.seeAll, {color: COLORS.primary}]}>See All</Text>
            </TouchableOpacity>
          </View>
          {expiringStudents.slice(0, 5).map(student => (
            <ExpiryItem key={student.id} item={student} />
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, {color: textColor}]}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {[
          {icon: 'account-plus', label: 'Add Student', route: 'AddStudent', color: COLORS.primary},
          {icon: 'account-clock', label: 'Verifications', route: 'VerificationList', color: COLORS.warning},
          {icon: 'cash-plus', label: 'Add Expense', route: 'AddExpense', color: COLORS.error},
          {icon: 'currency-inr', label: 'Pay Salary', route: 'AddSalary', color: COLORS.success},
          {icon: 'package-variant', label: 'Packages', route: 'PackageList', color: COLORS.info},
          {icon: 'chart-bar', label: 'Reports', route: 'Reports', color: COLORS.secondary},
          {icon: 'account-group', label: 'Staff', route: 'UserManagement', color: COLORS.trainerColor},
          {icon: 'cog', label: 'Settings', route: 'GymSettings', color: COLORS.textSecondary},
        ].map(item => (
          <TouchableOpacity
            key={item.route}
            style={[styles.quickAction, {backgroundColor: cardBg}]}
            onPress={() => navigation.navigate(item.route as any)}>
            <View
              style={[styles.quickActionIcon, {backgroundColor: item.color + '20'}]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={24}
                color={item.color}
              />
            </View>
            <Text
              style={[styles.quickActionLabel, {color: textColor}]}
              numberOfLines={1}>
              {item.label}
            </Text>
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
    paddingBottom: SPACING.xl + 4,
    paddingHorizontal: SPACING.md,
    overflow: 'hidden',
  },
  headerDecor: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60,
    right: -40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerText: {flex: 1},
  greeting: {color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500'},
  userName: {color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 1},
  gymName: {
    color: COLORS.goldLight,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
    letterSpacing: 0.3,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
    marginTop: -SPACING.lg,
  },
  summaryCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    gap: 3,
    elevation: 6,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  summaryLabel: {color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '700', letterSpacing: 0.3},
  summaryValue: {color: '#FFF', fontSize: 15, fontWeight: '900'},
  alertsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  alertChip: {height: 30},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
  },
  section: {paddingHorizontal: SPACING.md},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  seeAll: {fontSize: 13, fontWeight: '600'},
  expiryCard: {
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    elevation: 1,
  },
  expiryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  expiryInfo: {flex: 1},
  expiryName: {fontSize: 14, fontWeight: '600'},
  expiryDate: {fontSize: 12, marginTop: 2},
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  quickAction: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 2,
    margin: '0.5%',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {fontSize: 10, fontWeight: '600', textAlign: 'center'},
});

export default AdminDashboardScreen;
