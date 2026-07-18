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
  useWindowDimensions,
} from 'react-native';
import {useNavigation, CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {Avatar} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/authStore';
import {useDashboardStore} from '../../store/dashboardStore';
import {useSubscriptionStore} from '../../store/subscriptionStore';
import {useFeature} from '../../hooks/useFeature';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, TabParamList, Student} from '../../types';
import StatTile from '../../components/common/StatTile';
import TrendChart from '../../components/common/TrendChart';
import DashboardSkeleton from '../../components/skeletons/DashboardSkeleton';
import TrialBanner from '../../components/common/TrialBanner';
import UpgradeBanner from '../../components/common/UpgradeBanner';
import {getExpiryAlerts, syncExpiredMemberships} from '../../services/studentService';
import {
  checkAndSendExpiryNotifications,
  getUnreadCount,
} from '../../services/notificationService';
import {formatExpiryLabel} from '../../utils/dateUtils';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const insets = useSafeAreaInsets();
  const {width: screenWidth} = useWindowDimensions();
  const {
    stats,
    chartData,
    isLoading,
    error: dashboardError,
    refresh,
    refreshIfStale,
  } = useDashboardStore();
  const {status: subStatus, trialDaysLeft, trialEndsAt, plan, fetchSubscription, getLimitStatus} =
    useSubscriptionStore();
  const {hasAccess: hasReports} = useFeature('basic_reports');
  const {hasAccess: hasStaff} = useFeature('staff_management');
  const [expiringStudents, setExpiringStudents] = React.useState<Student[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadExpiringStudents = useCallback(async () => {
    if (!gym) return;
    const result = await getExpiryAlerts(gym.id);
    if (result.data) setExpiringStudents(result.data);
  }, [gym]);

  const loadUnreadCount = useCallback(async () => {
    if (!gym || !user) return;
    const count = await getUnreadCount(gym.id, user.id, user.role);
    setUnreadCount(count);
  }, [gym, user]);

  // On mount: sync expired members in DB, then load stats
  useEffect(() => {
    if (!gym) return;
    syncExpiredMemberships(gym.id); // fire-and-forget: keeps is_active accurate
    checkAndSendExpiryNotifications(gym.id); // once-per-day expiry alert push
    refreshIfStale(gym.id);
    fetchSubscription(gym.id);
    loadExpiringStudents();
    loadUnreadCount();
  }, [gym, refreshIfStale, fetchSubscription, loadExpiringStudents, loadUnreadCount]);

  const onRefresh = async () => {
    if (!gym) return;
    setRefreshing(true);
    await Promise.all([
      refresh(gym.id),
      loadExpiringStudents(),
      fetchSubscription(gym.id),
      loadUnreadCount(),
    ]);
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

  if (isLoading && !stats) {
    return (
      <View style={styles.container}>
        <DashboardSkeleton isDark />
      </View>
    );
  }

  if (dashboardError && !stats) {
    return (
      <View style={[styles.container, styles.errorCenter]}>
        <MaterialCommunityIcons name="wifi-off" size={52} color={COLORS.error} />
        <Text style={styles.errorTitle}>Failed to Load Dashboard</Text>
        <Text style={styles.errorMsg}>{dashboardError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => gym && refresh(gym.id)}>
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
      <TouchableOpacity
        style={styles.activityRow}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('StudentDetail', {studentId: item.id})}>
        <View style={[styles.activityIcon, {backgroundColor: color + '20'}]}>
          <MaterialCommunityIcons
            name={isExpired ? 'bell-alert-outline' : 'calendar-alert'}
            size={18}
            color={color}
          />
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.activityTitle} numberOfLines={1}>
            {isExpired ? `Membership expired for ${item.name}` : item.name}
          </Text>
          <Text style={[styles.activityTime, {color}]}>{label}</Text>
        </View>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${item.phone}`)}
          hitSlop={6}>
          <MaterialCommunityIcons name="phone" size={16} color={COLORS.success} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const greeting = dayjs().hour() < 12 ? 'Good Morning' : dayjs().hour() < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.name?.split(' ')[0] ?? '';
  const contentWidth = screenWidth - SPACING.md * 2 - SPACING.md * 2;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + SPACING.md}]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
      }
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        {user?.avatar || gym?.gym_logo ? (
          <Image source={{uri: user?.avatar || gym?.gym_logo || ''}} style={styles.avatar} />
        ) : (
          <Avatar.Text
            size={44}
            label={(firstName || 'U').slice(0, 2).toUpperCase()}
            style={{backgroundColor: COLORS.surfaceElevated}}
            labelStyle={{color: COLORS.primary}}
          />
        )}
        <View style={styles.headerText}>
          <Text style={styles.greeting} numberOfLines={1}>
            {`Hi, `}
            <Text style={styles.greetingName}>{firstName}</Text>
          </Text>
          <Text style={styles.gymName} numberOfLines={1}>
            {gym?.gym_name}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
          <MaterialCommunityIcons name="bell-outline" size={20} color={COLORS.textPrimary} />
          {unreadCount > 0 && <View style={styles.notifDot} />}
        </TouchableOpacity>
      </View>

      {/* Hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>{greeting.toUpperCase()}</Text>
        <Text style={styles.heroTitle}>Daily Overview</Text>
      </View>

      {/* Stat grid */}
      <View style={styles.statsGrid}>
        <StatTile
          title="Total Students"
          value={stats?.total_students ?? 0}
          icon="account-group"
          iconColor={COLORS.info}
          onPress={() => navigation.navigate('Students')}
        />
        <StatTile
          title="Active Members"
          value={stats?.active_students ?? 0}
          icon="check-circle-outline"
          iconColor={COLORS.success}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatTile
          title="Expiring Soon"
          value={stats?.expiring_7_days ?? 0}
          icon="alert-outline"
          iconColor={COLORS.warning}
          valueColor={COLORS.warning}
          onPress={() => navigation.navigate('ExpiryList', {expiryFilter: 'expiring_7'})}
        />
        <StatTile
          title="Revenue"
          value={stats ? formatCurrency(stats.revenue_this_month) : '₹0'}
          icon="wallet-outline"
          iconColor={COLORS.primary}
          valueColor={COLORS.primary}
          highlighted
          onPress={() => navigation.navigate('Reports')}
        />
      </View>

      {/* Trial / Upgrade banners */}
      {isTrial && (
        <TrialBanner daysLeft={trialDaysLeft} expiryDate={trialEndsAt} onUpgrade={handleUpgradeNav} isDark />
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
          isDark={true}
        />
      )}

      {/* Financials */}
      <View style={styles.financialsCard}>
        <View style={styles.financialsHeader}>
          <View>
            <Text style={styles.sectionTitleInline}>Financials</Text>
            <Text style={styles.financialsSubtitle}>Revenue trend · last 6 months</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
            <Text style={styles.viewReports}>View Reports</Text>
          </TouchableOpacity>
        </View>
        <TrendChart
          points={chartData.map(d => ({label: d.month_label, value: d.revenue}))}
          width={contentWidth}
        />
      </View>

      {/* Membership Alerts */}
      {expiringStudents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Membership Alerts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ExpiryList', {})}>
              <Text style={styles.seeAll}>View All ({expiringStudents.length})</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityCard}>
            {expiringStudents.slice(0, 5).map((student, i) => (
              <View key={student.id}>
                <ExpiryItem item={student} />
                {i < Math.min(expiringStudents.length, 5) - 1 && <View style={styles.activityDivider} />}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {(
          [
            {icon: 'account-plus', label: 'Add Student', route: 'AddStudent' as const, color: COLORS.primary, locked: false},
            {icon: 'calendar-check', label: 'Attendance', route: 'Attendance' as const, color: COLORS.success, locked: false},
            {icon: 'account-clock', label: 'Verifications', route: 'VerificationList' as const, color: COLORS.warning, locked: false},
            {icon: 'cash-plus', label: 'Add Expense', route: 'AddExpense' as const, color: COLORS.error, locked: false},
            {icon: 'currency-inr', label: 'Trainer Salary', route: 'SalaryList' as const, color: COLORS.success, locked: false},
            {icon: 'package-variant', label: 'Packages', route: 'PackageList' as const, color: COLORS.info, locked: false},
            {icon: 'chart-bar', label: 'Reports', route: 'Reports' as const, color: COLORS.secondary, locked: !hasReports},
            {icon: 'account-group', label: 'Staff', route: 'UserManagement' as const, color: COLORS.roleTrainer, locked: !hasStaff},
            {icon: 'cog', label: 'Settings', route: 'GymSettings' as const, color: COLORS.textSecondary, locked: false},
          ] as const
        ).map(item => (
          <TouchableOpacity
            key={item.route}
            style={styles.quickAction}
            onPress={() => {
              if (item.locked) {
                navigation.navigate('FeatureLocked', {
                  featureName: item.label,
                  featureIcon: item.icon,
                  requiredPlan: 'starter',
                });
                return;
              }
              navigation.navigate(item.route);
            }}>
            <View style={[styles.quickActionIcon, {backgroundColor: item.color + '20'}]}>
              <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
              {item.locked && (
                <View style={styles.lockOverlay}>
                  <MaterialCommunityIcons name="lock" size={10} color={COLORS.background} />
                </View>
              )}
            </View>
            <Text style={styles.quickActionLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  content: {paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  avatar: {width: 44, height: 44, borderRadius: 22},
  headerText: {flex: 1},
  greeting: {fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},
  greetingName: {color: COLORS.primary},
  gymName: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceElevated,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  heroEyebrow: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroTitle: {fontSize: FONT_SIZE.pageTitle, fontWeight: FONT_WEIGHT.extraBold, color: COLORS.textPrimary},
  statsGrid: {flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm},
  section: {marginTop: SPACING.sm},
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  seeAll: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.primary},
  financialsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  financialsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  sectionTitleInline: {fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},
  financialsSubtitle: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},
  viewReports: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.primary},
  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  activityDivider: {height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.md + 36 + SPACING.sm},
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {flex: 1},
  activityTitle: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  activityTime: {fontSize: FONT_SIZE.xs, marginTop: 2},
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickAction: {
    width: '22.5%',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
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
  quickActionLabel: {fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, textAlign: 'center', color: COLORS.textPrimary},
  errorCenter: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl},
  errorTitle: {fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.sm},
  errorMsg: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg},
  retryBtn: {paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm + 4, borderRadius: RADIUS.lg, backgroundColor: COLORS.primary},
  retryText: {color: COLORS.background, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.sm},
});

export default AdminDashboardScreen;
