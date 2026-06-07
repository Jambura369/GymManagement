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
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Card} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList, Student} from '../../types';
import {fetchStudents, getExpiryAlerts} from '../../services/studentService';
import StatCard from '../../components/common/StatCard';
import {formatExpiryLabel} from '../../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TrainerDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();

  const [myStudents, setMyStudents] = React.useState(0);
  const [pendingStudents, setPendingStudents] = React.useState<Student[]>([]);
  const [expiryAlerts, setExpiryAlerts] = React.useState<Student[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const load = useCallback(async () => {
    if (!gym || !user) return;
    const [studentsRes, pendingRes, alertsRes] = await Promise.all([
      fetchStudents(gym.id, {trainer_id: user.id}, 1, 1),
      fetchStudents(gym.id, {trainer_id: user.id, verification_status: 'Pending'}, 1, 50),
      getExpiryAlerts(gym.id, user.id),
    ]);
    if (studentsRes.data) setMyStudents(studentsRes.data.total);
    if (pendingRes.data) setPendingStudents(pendingRes.data.data);
    if (alertsRes.data) setExpiryAlerts(alertsRes.data);
  }, [gym, user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /* ── Pending verification student card ── */
  const PendingCard = ({student}: {student: Student}) => {
    const isCash = student.payment_type === 'Cash';
    return (
      <Card style={[styles.pendingCard, {backgroundColor: cardBg}]}>
        <Card.Content style={styles.pendingContent}>
          <View style={[styles.pendingIcon, {backgroundColor: COLORS.warning + '20'}]}>
            <MaterialCommunityIcons name="account-clock" size={20} color={COLORS.warning} />
          </View>
          <View style={styles.pendingInfo}>
            <Text style={[styles.pendingName, {color: textColor}]} numberOfLines={1}>
              {student.name}
            </Text>
            <Text style={[styles.pendingPhone, {color: COLORS.textSecondary}]}>
              {student.phone}
            </Text>
            {student.package && (
              <Text style={[styles.pendingPkg, {color: COLORS.textSecondary}]}>
                {student.package.name}
              </Text>
            )}
            {/* Amount + cash hand-off note */}
            {student.amount_paid != null && student.amount_paid > 0 ? (
              isCash ? (
                <View style={styles.cashNote}>
                  <MaterialCommunityIcons name="cash" size={13} color={COLORS.warning} />
                  <Text style={[styles.cashNoteText, {color: COLORS.warning}]}>
                    ₹{student.amount_paid} cash — hand to Admin/Manager
                  </Text>
                </View>
              ) : (
                <View style={styles.qrNote}>
                  <MaterialCommunityIcons name="qrcode" size={13} color={COLORS.info} />
                  <Text style={[styles.qrNoteText, {color: COLORS.info}]}>
                    ₹{student.amount_paid} paid via QR
                  </Text>
                </View>
              )
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.callBtn, {backgroundColor: COLORS.success + '20'}]}
            onPress={() => Linking.openURL(`tel:${student.phone}`)}>
            <MaterialCommunityIcons name="phone" size={18} color={COLORS.success} />
          </TouchableOpacity>
        </Card.Content>
      </Card>
    );
  };

  /* ── Expired / nearly-expired student card ── */
  const AlertCard = ({student}: {student: Student}) => {
    if (!student.membership_expiry) return null;
    const {label, isExpired} = formatExpiryLabel(student.membership_expiry);
    const diffDays = dayjs(student.membership_expiry).startOf('day').diff(dayjs().startOf('day'), 'day');
    const color = isExpired ? COLORS.error : diffDays <= 3 ? COLORS.warning : COLORS.info;

    return (
      <Card style={[styles.alertCard, {backgroundColor: cardBg}]}>
        <Card.Content style={styles.alertContent}>
          <View style={[styles.alertIcon, {backgroundColor: color + '20'}]}>
            <MaterialCommunityIcons
              name={isExpired ? 'calendar-remove' : 'calendar-clock'}
              size={20}
              color={color}
            />
          </View>
          <View style={styles.alertInfo}>
            <Text style={[styles.alertName, {color: textColor}]} numberOfLines={1}>
              {student.name}
            </Text>
            <Text style={[styles.alertPhone, {color: COLORS.textSecondary}]}>
              {student.phone}
            </Text>
            <Text style={[styles.alertExpiry, {color}]}>{label}</Text>
          </View>
          <View style={styles.alertActions}>
            <TouchableOpacity
              style={[styles.alertBtn, {backgroundColor: COLORS.success + '20'}]}
              onPress={() => Linking.openURL(`tel:${student.phone}`)}>
              <MaterialCommunityIcons name="phone" size={18} color={COLORS.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.alertBtn, {backgroundColor: COLORS.primary + '20'}]}
              onPress={() => navigation.navigate('RenewStudent', {studentId: student.id})}>
              <MaterialCommunityIcons name="refresh" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
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
          colors={[COLORS.trainerColor]}
        />
      }
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View
        style={[
          styles.header,
          {backgroundColor: COLORS.trainerColor, paddingTop: insets.top + SPACING.md},
        ]}>
        <View style={styles.headerLeft}>
          {gym?.gym_logo ? (
            <Image source={{uri: gym.gym_logo}} style={styles.gymLogo} />
          ) : null}
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>Trainer Dashboard</Text>
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
          title="My Students"
          value={myStudents}
          icon="account-group"
          color={COLORS.primary}
          isDark={isDark}
          onPress={() => navigation.navigate('Students' as any)}
        />
        <StatCard
          title="Awaiting Verify"
          value={pendingStudents.length}
          icon="account-clock"
          color={COLORS.warning}
          isDark={isDark}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="≤ 3 Days"
          value={expiryAlerts.filter(s => {
            if (!s.membership_expiry) return false;
            const d = dayjs(s.membership_expiry).startOf('day').diff(dayjs().startOf('day'), 'day');
            return d >= 0 && d <= 3;
          }).length}
          icon="calendar-alert"
          color={COLORS.warning}
          isDark={isDark}
          onPress={() => navigation.navigate('ExpiryList', {trainerId: user?.id, expiryFilter: 'expiring_3'})}
        />
        <StatCard
          title="4-7 Days"
          value={expiryAlerts.filter(s => {
            if (!s.membership_expiry) return false;
            const d = dayjs(s.membership_expiry).startOf('day').diff(dayjs().startOf('day'), 'day');
            return d >= 4 && d <= 7;
          }).length}
          icon="calendar-clock"
          color={COLORS.info}
          isDark={isDark}
          onPress={() => navigation.navigate('ExpiryList', {trainerId: user?.id, expiryFilter: 'expiring_7'})}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="Expired"
          value={expiryAlerts.filter(s => {
            if (!s.membership_expiry) return false;
            return dayjs(s.membership_expiry).startOf('day').diff(dayjs().startOf('day'), 'day') < 0;
          }).length}
          icon="calendar-remove"
          color={COLORS.error}
          isDark={isDark}
          onPress={() => navigation.navigate('ExpiryList', {trainerId: user?.id, expiryFilter: 'expired'})}
        />
      </View>

      {/* Pending Verification — my students only */}
      {pendingStudents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-clock" size={18} color={COLORS.warning} />
            <Text style={[styles.sectionTitle, {color: COLORS.warning}]}>
              Awaiting Verification ({pendingStudents.length})
            </Text>
          </View>
          <View style={[styles.sectionNote, {backgroundColor: COLORS.warning + '12'}]}>
            <MaterialCommunityIcons name="information-outline" size={14} color={COLORS.warning} />
            <Text style={[styles.sectionNoteText, {color: COLORS.warning}]}>
              Admin/Manager must approve these students. Hand over any cash collected.
            </Text>
          </View>
          {pendingStudents.map(s => (
            <PendingCard key={s.id} student={s} />
          ))}
        </View>
      )}

      {/* Membership Alerts (expired + expiring soon) */}
      {expiryAlerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="calendar-alert" size={18} color={COLORS.error} />
            <Text style={[styles.sectionTitle, {color: COLORS.error}]}>
              Membership Alerts ({expiryAlerts.length})
            </Text>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('ExpiryList', {trainerId: user?.id})}>
              <Text style={[styles.seeAllText, {color: COLORS.primary}]}>View All</Text>
            </TouchableOpacity>
          </View>
          {expiryAlerts.slice(0, 5).map(s => (
            <AlertCard key={s.id} student={s} />
          ))}
          {expiryAlerts.length > 5 && (
            <TouchableOpacity
              style={[styles.viewAllBtn, {backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary + '40'}]}
              onPress={() => navigation.navigate('ExpiryList', {trainerId: user?.id})}>
              <MaterialCommunityIcons name="calendar-alert" size={16} color={COLORS.primary} />
              <Text style={[styles.viewAllText, {color: COLORS.primary}]}>
                View all {expiryAlerts.length} alerts
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Quick Actions */}
      <Text style={[styles.qaTitle, {color: textColor}]}>Quick Actions</Text>
      <View style={styles.qaGrid}>
        {[
          {icon: 'account-plus', label: 'Add Student', route: 'AddStudent', color: COLORS.primary},
          {icon: 'account-group', label: 'My Students', route: 'Students', color: COLORS.trainerColor},
          {icon: 'bell-outline', label: 'Notifications', route: 'Notifications', color: COLORS.info},
          {icon: 'account', label: 'Profile', route: 'Profile', color: COLORS.success},
        ].map(item => (
          <TouchableOpacity
            key={item.route}
            style={[styles.qaItem, {backgroundColor: cardBg}]}
            onPress={() => navigation.navigate(item.route as any)}>
            <View style={[styles.qaIcon, {backgroundColor: item.color + '20'}]}>
              <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
            </View>
            <Text style={[styles.qaLabel, {color: textColor}]}>{item.label}</Text>
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
  statsGrid: {flexDirection: 'row', paddingHorizontal: SPACING.sm, marginTop: SPACING.sm},
  section: {paddingHorizontal: SPACING.md, marginTop: SPACING.lg},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  sectionTitle: {fontSize: 15, fontWeight: '700', flex: 1},
  seeAllBtn: {marginLeft: 'auto'},
  seeAllText: {fontSize: 13, fontWeight: '600'},
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
  sectionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionNoteText: {flex: 1, fontSize: 12, lineHeight: 17},
  /* Pending card */
  pendingCard: {borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xs, elevation: 1},
  pendingContent: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs},
  pendingIcon: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  pendingInfo: {flex: 1},
  pendingName: {fontSize: 14, fontWeight: '700'},
  pendingPhone: {fontSize: 12, marginTop: 1},
  pendingPkg: {fontSize: 11, marginTop: 1},
  cashNote: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4},
  cashNoteText: {fontSize: 11, fontWeight: '600'},
  qrNote: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4},
  qrNoteText: {fontSize: 11, fontWeight: '600'},
  callBtn: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  /* Alert card */
  alertCard: {borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xs, elevation: 1},
  alertContent: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs},
  alertIcon: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  alertInfo: {flex: 1},
  alertName: {fontSize: 14, fontWeight: '700'},
  alertPhone: {fontSize: 12, marginTop: 1},
  alertExpiry: {fontSize: 11, fontWeight: '600', marginTop: 2},
  alertActions: {flexDirection: 'row', gap: SPACING.xs},
  alertBtn: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  /* Quick actions */
  qaTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  qaGrid: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: SPACING.md},
  qaItem: {width: '44%', alignItems: 'center', padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, elevation: 2},
  qaIcon: {width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm},
  qaLabel: {fontSize: 13, fontWeight: '600', textAlign: 'center'},
});

export default TrainerDashboardScreen;
