import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Menu} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useStudentStore} from '../../store/studentStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, Student} from '../../types';
import {getStudent} from '../../services/studentService';
import {fetchPaymentsByStudent} from '../../services/paymentService';
import {Payment} from '../../types';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';

type Nav = NativeStackNavigationProp<RootStackParamList, 'StudentDetail'>;
type Route = RouteProp<RootStackParamList, 'StudentDetail'>;

const StudentDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {user} = useAuthStore();
  const {deleteStudent} = useStudentStore();
  const insets = useSafeAreaInsets();

  const [student, setStudent] = useState<Student | null>(null);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStudent();
  }, [route.params.studentId]);

  const loadStudent = async () => {
    setLoading(true);
    const [studentRes, paymentsRes] = await Promise.all([
      getStudent(route.params.studentId),
      fetchPaymentsByStudent(route.params.studentId, 1),
    ]);
    if (studentRes.data) setStudent(studentRes.data);
    if (paymentsRes.data) setRecentPayments(paymentsRes.data.data.slice(0, 3));
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!student) return;
    setDeleting(true);
    const success = await deleteStudent(student.id);
    setDeleting(false);
    setDeleteDialog(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Student deleted'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed to delete student'});
    }
  };

  if (loading || !student) {
    return (
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Detail</Text>
          <View style={{width: 24}} />
        </View>
      </View>
    );
  }

  const daysLeft = student.membership_expiry
    ? dayjs(student.membership_expiry).diff(dayjs(), 'day')
    : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const memberSince = dayjs(student.joining_date).format('MMM YYYY');

  // Progress bar: percentage of membership used
  const progressPercent = (() => {
    if (!student.package?.duration_days || !student.joining_date || daysLeft === null) return 0;
    const total = student.package.duration_days;
    const used = total - Math.max(daysLeft, 0);
    return Math.min(Math.max(used / total, 0), 1);
  })();

  const statusColor = isExpired
    ? COLORS.error
    : daysLeft !== null && daysLeft <= 7
    ? COLORS.warning
    : COLORS.success;

  const isVip = student.package?.type === 'Yearly' || student.package?.type === 'Special Category';

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Detail</Text>
        {user?.role !== 'Trainer' ? (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity onPress={() => setMenuVisible(true)} hitSlop={8}>
                <MaterialCommunityIcons name="dots-vertical" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            }>
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('EditStudent', {studentId: student.id});
              }}
              title="Edit Student"
              leadingIcon="pencil"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setDeleteDialog(true);
              }}
              title="Delete Student"
              leadingIcon="delete"
              titleStyle={{color: COLORS.error}}
            />
          </Menu>
        ) : (
          <View style={{width: 24}} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, {paddingBottom: 100 + insets.bottom}]}>

        {/* Avatar + Name hero */}
        <View style={styles.heroSection}>
          <View style={[styles.avatarRing, {borderColor: statusColor + '80'}]}>
            <AvatarWithFallback uri={student.image} name={student.name} size={80} viewable />
          </View>
          <View style={[styles.statusBadge, {backgroundColor: isExpired ? '#93000a' : daysLeft !== null && daysLeft <= 7 ? '#eab308' : '#63ff95'}]}>
            <Text style={[styles.statusBadgeText, {color: isExpired ? '#ffb4ab' : daysLeft !== null && daysLeft <= 7 ? '#000' : '#003919'}]}>
              {isExpired ? 'Expired' : daysLeft !== null && daysLeft <= 7 ? 'Expiring' : 'Active'}
            </Text>
          </View>
          <Text style={styles.heroName}>{student.name}</Text>
          <Text style={styles.heroSince}>Member since {memberSince}</Text>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="lightning-bolt" size={14} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>CONTACT INFO</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="phone" size={18} color={COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{student.phone}</Text>
            </View>
          </View>
          {student.email ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <MaterialCommunityIcons name="email-outline" size={18} color={COLORS.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{student.email}</Text>
              </View>
            </View>
          ) : null}
          {student.trainer ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <MaterialCommunityIcons name="account-tie" size={18} color={COLORS.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Trainer</Text>
                <Text style={styles.infoValue}>{student.trainer.name}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Membership Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="trophy-outline" size={14} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>MEMBERSHIP INFO</Text>
            </View>
            {isVip && (
              <View style={styles.vipBadge}>
                <Text style={styles.vipText}>VIP</Text>
              </View>
            )}
          </View>

          {student.package ? (
            <>
              <Text style={styles.planName}>{student.package.name}</Text>
              {student.package.description ? (
                <Text style={styles.planDesc}>{student.package.description}</Text>
              ) : null}
              <View style={styles.renewalRow}>
                <Text style={styles.infoLabel}>Renewal Date</Text>
                <Text style={styles.infoValue}>
                  {student.membership_expiry
                    ? dayjs(student.membership_expiry).format('MMM DD, YYYY')
                    : 'N/A'}
                </Text>
              </View>
              {/* Progress bar */}
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {width: `${progressPercent * 100}%`}]} />
              </View>
              <Text style={styles.daysRemaining}>
                {daysLeft === null
                  ? ''
                  : isExpired
                  ? `Expired ${Math.abs(daysLeft)} days ago`
                  : daysLeft === 0
                  ? 'Expires today'
                  : `${daysLeft} days remaining`}
              </Text>
            </>
          ) : (
            <Text style={styles.noPackage}>No active package</Text>
          )}
        </View>

        {/* Payment History preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="receipt" size={14} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>PAYMENT HISTORY</Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('StudentPaymentHistory', {
                  studentId: student.id,
                  studentName: student.name,
                })
              }>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentPayments.length === 0 ? (
            <Text style={styles.paymentHint}>No payments recorded yet</Text>
          ) : (
            recentPayments.map((p, i) => (
              <View key={p.id} style={[styles.paymentRow, i > 0 && styles.paymentRowBorder]}>
                <MaterialCommunityIcons name="checkbox-marked-circle" size={32} color={COLORS.success} />
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentName} numberOfLines={1}>
                    {p.package?.name || 'Membership Payment'}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {dayjs(p.payment_date).format('MMM DD, YYYY')}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>
                  ₹{Number(p.amount).toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          )}
        </View>

        {student.notes ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="note-text-outline" size={14} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>NOTES</Text>
            </View>
            <Text style={styles.notes}>{student.notes}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditStudent', {studentId: student.id})}
          activeOpacity={0.7}>
          <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.textPrimary} />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.renewBtn}
          onPress={() => navigation.navigate('RenewStudent', {studentId: student.id})}
          activeOpacity={0.85}>
          <MaterialCommunityIcons name="autorenew" size={18} color="#0B0F0E" />
          <Text style={styles.renewBtnText}>Renew Membership</Text>
        </TouchableOpacity>
      </View>

      <ConfirmDialog
        visible={deleteDialog}
        title="Delete Student"
        message={`Are you sure you want to delete ${student.name}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(false)}
        confirmColor={COLORS.error}
        loading={deleting}
      />
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
    color: COLORS.primary,
  },
  scroll: {paddingHorizontal: SPACING.md},

  // Hero
  heroSection: {alignItems: 'center', paddingVertical: SPACING.lg, position: 'relative'},
  avatarRing: {
    padding: 3,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.primary + '60',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    marginTop: 10,
    marginBottom: 4,
  },
  statusBadgeText: {fontSize: 12, fontWeight: FONT_WEIGHT.bold},
  heroName: {
    fontSize: 26,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  heroSince: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4},

  // Section
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm},
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  viewAll: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.primary},

  // Info rows
  infoRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6},
  infoRowBorder: {borderTopWidth: 1, borderTopColor: COLORS.border},
  infoContent: {flex: 1},
  infoLabel: {fontSize: 11, color: COLORS.textSecondary},
  infoValue: {fontSize: 14, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary, marginTop: 2},

  // VIP
  vipBadge: {
    backgroundColor: COLORS.primary + '25',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
  },
  vipText: {fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary, letterSpacing: 1},

  // Plan
  planName: {fontSize: 20, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 3},
  planDesc: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm},
  noPackage: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary},

  renewalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  // Progress bar
  progressBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  daysRemaining: {fontSize: 12, color: COLORS.primary, fontWeight: FONT_WEIGHT.semiBold},

  paymentHint: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary},
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  paymentRowBorder: {borderTopWidth: 1, borderTopColor: COLORS.border},
  paymentInfo: {flex: 1},
  paymentName: {fontSize: 13, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  paymentDate: {fontSize: 11, color: COLORS.textSecondary, marginTop: 2},
  paymentAmount: {fontSize: 14, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},
  notes: {fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, lineHeight: 20},

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  editBtnText: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  renewBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  renewBtnText: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#0B0F0E'},
});

export default StudentDetailScreen;
