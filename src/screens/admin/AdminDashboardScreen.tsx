import React, {useEffect, useCallback} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {useNavigation, CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {Card, Avatar} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {useDashboardStore} from '../../store/dashboardStore';
import {useSubscriptionStore} from '../../store/subscriptionStore';
import {useFeature} from '../../hooks/useFeature';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList, TabParamList, Student} from '../../types';
import StatCard from '../../components/common/StatCard';
import DashboardSkeleton from '../../components/skeletons/DashboardSkeleton';
import GymblixLogo from '../../components/common/GymblixLogo';
import TrialBanner from '../../components/common/TrialBanner';
import UpgradeBanner from '../../components/common/UpgradeBanner';
import {getExpiryAlerts} from '../../services/studentService';
import {formatExpiryLabel} from '../../utils/dateUtils';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();
  const {stats, isLoading, error: dashboardError, refresh, refreshIfStale} = useDashboardStore();
  const {status: subStatus, trialDaysLeft, trialEndsAt, plan, fetchSubscription, getLimitStatus} =
    useSubscriptionStore();
  const {hasAccess: hasReports} = useFeature('basic_reports');
  const {hasAccess: hasStaff} = useFeature('staff_management');
  const [expiringStudents, setExpiringStudents] = React.useState<Student[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const loadExpiringStudents = useCallback(async () => {
    if (!gym) return;
    const result = await getExpiryAlerts(gym.id);
    if (result.data) setExpiringStudents(result.data);
  }, [gym]);

  // On mount: use cache if fresh, otherwise fetch
  useEffect(() => {
    if (!gym) return;
    refreshIfStale(gym.id);
    fetchSubscription(gym.id);
    loadExpiringStudents();
  }, [gym, refreshIfStale, fetchSubscription, loadExpiringStudents]);

  const onRefresh = async () => {
    if (!gym) return;
    setRefreshing(true);
    await Promise.all([refresh(gym.id), loadExpiringStudents(), fetchSubscription(gym.id)]);
    setRefreshing(false);
  };

  const memberLimit = getLimitStatus('members', stats?.active_students ?? 0);
  const trainerLimit = getLimitStatus('trainers', stats?.trainer_count ?? 0);
  const staffLimit = getLimitStatus('staff', stats?.manager_count ?? 0);

  const isTrial = subStatus === 'trial';
  const showUpgradeBanner =
    memberLimit.isNearLimit || trainerLimit.isNearLimit || staffLimit.isNearLimit;

  function handleUpgradeNav() {
    navigation.navigate('FeatureLocked', {
      featureName: 'Upgrade Plan',
      featureIcon: 'rocket-launch',
      requiredPlan: 'starter',
    });
  }

  const formatCurrency = (v: number) =>
    `₹${v.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

  const profit = stats ? stats.profit_this_month : 0;

  if (isLoading && !stats) {
    return (
      <View style={[styles.container, {backgroundColor: bgColor}]}>
        <DashboardSkeleton isDark={isDark} />
      </View>
    );
  }

  if (dashboardError && !stats) {
    return (
      <View style={[styles.container, styles.errorCenter, {backgroundColor: bgColor}]}>
        <MaterialCommunityIcons name="wifi-off" size={52} color={COLORS.error} />
        <Text style={[styles.errorTitle, {color: textColor}]}>Failed to Load Dashboard</Text>
        <Text style={[styles.errorMsg, {color: COLORS.textSecondary}]}>{dashboardError}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, {backgroundColor: COLORS.primary}]}
          onPress={() => gym && refresh(gym.id)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ExpiryItem = ({item}: {item: Student}) => {
    if (!item.membership_expiry) return null;
    const {label, isExpired} = formatExpiryLabel(item.membership_expiry);
    const diffDays = dayjs(item.membership_expiry).startOf('day').diff(dayjs().startOf('day'), 'day');
    const isUrgent = !isExpired && diffDays <= 3;
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
            <Text style={[styles.expiryDate, {color}]}>{label}</Text>
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
          {gym?.gym_logo ? (
            <Image source={{uri: gym.gym_logo}} style={styles.gymLogo} />
          ) : (
            <GymblixLogo size={44} />
          )}
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

      {/* Trial / Upgrade banners */}
      {isTrial && (
        <TrialBanner
          daysLeft={trialDaysLeft}
          expiryDate={trialEndsAt}
          onUpgrade={handleUpgradeNav}
          isDark={isDark}
        />
      )}
      {showUpgradeBanner && (
        <UpgradeBanner
          memberCount={stats?.active_students ?? 0}
          memberLimit={plan.limits.members}
          trainerCount={stats?.trainer_count ?? 0}
          trainerLimit={plan.limits.trainers}
          staffCount={stats?.manager_count ?? 0}
          staffLimit={plan.limits.staff}
          onUpgrade={handleUpgradeNav}
          isDark={isDark}
        />
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
          onPress={() => navigation.navigate('Students')}
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
          title="≤ 3 Days"
          value={stats?.expiring_3_days ?? 0}
          icon="calendar-alert"
          color={COLORS.warning}
          isDark={isDark}
          onPress={() => navigation.navigate('ExpiryList', {expiryFilter: 'expiring_3'})}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="4-7 Days"
          value={Math.max(0, (stats?.expiring_7_days ?? 0) - (stats?.expiring_3_days ?? 0))}
          icon="calendar-clock"
          color={COLORS.info}
          isDark={isDark}
          onPress={() => navigation.navigate('ExpiryList', {expiryFilter: 'expiring_7'})}
        />
        <StatCard
          title="Expired"
          value={stats?.expired_memberships ?? 0}
          icon="calendar-remove"
          color={COLORS.error}
          isDark={isDark}
          onPress={() => navigation.navigate('ExpiryList', {expiryFilter: 'expired'})}
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
            <TouchableOpacity onPress={() => navigation.navigate('ExpiryList', {})}>
              <Text style={[styles.seeAll, {color: COLORS.primary}]}>
                View All ({expiringStudents.length})
              </Text>
            </TouchableOpacity>
          </View>
          {expiringStudents.slice(0, 5).map(student => (
            <ExpiryItem key={student.id} item={student} />
          ))}
          {expiringStudents.length > 5 && (
            <TouchableOpacity
              style={[styles.viewAllBtn, {backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary + '40'}]}
              onPress={() => navigation.navigate('ExpiryList', {})}>
              <MaterialCommunityIcons name="calendar-alert" size={16} color={COLORS.primary} />
              <Text style={[styles.viewAllText, {color: COLORS.primary}]}>
                View all {expiringStudents.length} alerts
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, {color: textColor}]}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {(
        [
          {icon: 'account-plus', label: 'Add Student', route: 'AddStudent' as const, color: COLORS.primary, locked: false},
          {icon: 'account-clock', label: 'Verifications', route: 'VerificationList' as const, color: COLORS.warning, locked: false},
          {icon: 'cash-plus', label: 'Add Expense', route: 'AddExpense' as const, color: COLORS.error, locked: false},
          {icon: 'currency-inr', label: 'Pay Salary', route: 'AddSalary' as const, color: COLORS.success, locked: false},
          {icon: 'package-variant', label: 'Packages', route: 'PackageList' as const, color: COLORS.info, locked: false},
          {icon: 'chart-bar', label: 'Reports', route: 'Reports' as const, color: COLORS.secondary, locked: !hasReports},
          {icon: 'account-group', label: 'Staff', route: 'UserManagement' as const, color: COLORS.trainerColor, locked: !hasStaff},
          {icon: 'cog', label: 'Settings', route: 'GymSettings' as const, color: COLORS.textSecondary, locked: false},
        ] as const
      ).map(item => (
          <TouchableOpacity
            key={item.route}
            style={[styles.quickAction, {backgroundColor: cardBg}]}
            onPress={() => {
              if (item.locked) {
                const featureKey = item.route === 'Reports' ? 'basic_reports' : 'staff_management';
                navigation.navigate('FeatureLocked', {
                  featureName: item.label,
                  featureIcon: item.icon,
                  requiredPlan: item.route === 'Reports' ? 'starter' : 'starter',
                });
                return;
              }
              navigation.navigate(item.route);
            }}>
            <View style={[styles.quickActionIcon, {backgroundColor: item.color + '20'}]}>
              <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
              {item.locked && (
                <View style={styles.lockOverlay}>
                  <MaterialCommunityIcons name="lock" size={10} color="#FFF" />
                </View>
              )}
            </View>
            <Text style={[styles.quickActionLabel, {color: textColor}]} numberOfLines={1}>
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
  gymLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.xs,
  },
  viewAllText: {fontSize: 13, fontWeight: '700'},
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
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {fontSize: 10, fontWeight: '600', textAlign: 'center'},
  errorCenter: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl},
  errorTitle: {fontSize: 18, fontWeight: '700', marginTop: SPACING.md, marginBottom: SPACING.sm},
  errorMsg: {fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg},
  retryBtn: {paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm + 4, borderRadius: BORDER_RADIUS.lg},
  retryText: {color: '#FFF', fontWeight: '700', fontSize: 14},
});

export default AdminDashboardScreen;
