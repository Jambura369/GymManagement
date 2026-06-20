import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
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
import {useStudentStore} from '../../store/studentStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList, Student} from '../../types';
import {getStudent} from '../../services/studentService';
import AppHeader from '../../components/common/AppHeader';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AppButton from '../../components/common/AppButton';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';

type Nav = NativeStackNavigationProp<RootStackParamList, 'StudentDetail'>;
type Route = RouteProp<RootStackParamList, 'StudentDetail'>;

const StudentDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {user} = useAuthStore();
  const {isDark} = useThemeStore();
  const {deleteStudent} = useStudentStore();

  const insets = useSafeAreaInsets();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;
  const subColor = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;

  useEffect(() => {
    loadStudent();
  }, [route.params.studentId]);

  const loadStudent = async () => {
    setLoading(true);
    const result = await getStudent(route.params.studentId);
    if (result.data) setStudent(result.data);
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

  if (!student && loading) {
    return (
      <View style={[styles.container, {backgroundColor: bgColor}]}>
        <AppHeader title="Student Detail" onBack={() => navigation.goBack()} isDark={isDark} />
      </View>
    );
  }

  if (!student) return null;

  const daysLeft = student.membership_expiry
    ? dayjs(student.membership_expiry).diff(dayjs(), 'day')
    : null;
  const isExpired = daysLeft !== null && daysLeft < 0;

  const InfoRow = ({label, value, icon, first}: {label: string; value: string; icon: string; first?: boolean}) => (
    <View style={[styles.infoRow, !first && styles.infoRowBorder]}>
      <MaterialCommunityIcons name={icon} size={18} color={COLORS.primary} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, {color: subColor}]}>{label}</Text>
        <Text style={[styles.infoValue, {color: textColor}]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      <AppHeader
        title="Student Detail"
        onBack={() => navigation.goBack()}
        isDark={isDark}
        rightComponent={
          user?.role !== 'Trainer' ? (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={24}
                    color={textColor}
                  />
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
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={[styles.profileCard, {backgroundColor: cardBg}]}>
          <Card.Content style={styles.profileContent}>
            <AvatarWithFallback uri={student.image} name={student.name} size={80} />
            <Text style={[styles.studentName, {color: textColor}]}>
              {student.name}
            </Text>
            <View style={styles.badgeRow}>
              <StatusBadge
                status={
                  student.is_active
                    ? 'Active'
                    : student.verification_status === 'Pending'
                    ? 'Pending'
                    : student.verification_status === 'Rejected'
                    ? 'Rejected'
                    : 'Inactive'
                }
              />
              {student.package && (
                <View style={styles.categoryBadge}>
                  <MaterialCommunityIcons
                    name="package-variant"
                    size={11}
                    color={COLORS.primary}
                  />
                  <Text style={styles.categoryText}>
                    {student.package.name}
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: COLORS.success + '20'}]}
                onPress={() => Linking.openURL(`tel:${student.phone}`)}>
                <MaterialCommunityIcons name="phone" size={20} color={COLORS.success} />
                <Text style={[styles.actionText, {color: COLORS.success}]}>Call</Text>
              </TouchableOpacity>
              {student.email && (
                <TouchableOpacity
                  style={[styles.actionBtn, {backgroundColor: COLORS.info + '20'}]}
                  onPress={() => Linking.openURL(`mailto:${student.email}`)}>
                  <MaterialCommunityIcons name="email" size={20} color={COLORS.info} />
                  <Text style={[styles.actionText, {color: COLORS.info}]}>Email</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: '#25D36620'}]}
                onPress={() => Linking.openURL(`https://wa.me/${student.phone}`)}>
                <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
                <Text style={[styles.actionText, {color: '#25D366'}]}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: COLORS.primary + '20'}]}
                onPress={() =>
                  navigation.navigate('StudentPaymentHistory', {
                    studentId: student.id,
                    studentName: student.name,
                  })
                }>
                <MaterialCommunityIcons name="receipt-text-outline" size={20} color={COLORS.primary} />
                <Text style={[styles.actionText, {color: COLORS.primary}]}>History</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Membership Info */}
        <Card style={[styles.card, {backgroundColor: cardBg}]}>
          <Card.Title title="Membership" titleVariant="titleMedium" />
          <Card.Content>
            {student.membership_expiry && (
              <View
                style={[
                  styles.expiryAlert,
                  {
                    backgroundColor: isExpired
                      ? COLORS.error + '15'
                      : (daysLeft ?? 999) <= 7
                      ? COLORS.warning + '15'
                      : COLORS.success + '15',
                  },
                ]}>
                <MaterialCommunityIcons
                  name={isExpired ? 'calendar-remove' : 'calendar-check'}
                  size={20}
                  color={
                    isExpired
                      ? COLORS.error
                      : (daysLeft ?? 999) <= 7
                      ? COLORS.warning
                      : COLORS.success
                  }
                />
                <Text
                  style={[
                    styles.expiryText,
                    {
                      color: isExpired
                        ? COLORS.error
                        : (daysLeft ?? 999) <= 7
                        ? COLORS.warning
                        : COLORS.success,
                    },
                  ]}>
                  {isExpired
                    ? `Expired ${Math.abs(daysLeft!)} days ago`
                    : daysLeft === 0
                    ? 'Expires today!'
                    : `Expires in ${daysLeft} days`}
                </Text>
              </View>
            )}
            <InfoRow
              label="Joining Date"
              value={dayjs(student.joining_date).format('DD MMM YYYY')}
              icon="calendar-today"
              first
            />
            <InfoRow
              label="Expiry Date"
              value={
                student.membership_expiry
                  ? dayjs(student.membership_expiry).format('DD MMM YYYY')
                  : 'N/A'
              }
              icon="calendar-end"
            />
            <InfoRow
              label="Package"
              value={
                student.package
                  ? `${student.package.name} (${student.package.type})`
                  : 'N/A'
              }
              icon="package-variant"
            />
            <InfoRow
              label="Amount Paid"
              value={`₹${student.amount_paid ?? 0}`}
              icon="cash"
            />
            <InfoRow
              label="Payment Method"
              value={student.payment_type ?? 'N/A'}
              icon="credit-card"
            />
          </Card.Content>
        </Card>

        {/* Contact Info */}
        <Card style={[styles.card, {backgroundColor: cardBg}]}>
          <Card.Title title="Contact Info" titleVariant="titleMedium" />
          <Card.Content>
            <InfoRow label="Phone" value={student.phone} icon="phone" first />
            <InfoRow
              label="Email"
              value={student.email || 'N/A'}
              icon="email"
            />
          </Card.Content>
        </Card>

        {/* Trainer */}
        {student.trainer && (
          <Card style={[styles.card, {backgroundColor: cardBg}]}>
            <Card.Title title="Assigned Trainer" titleVariant="titleMedium" />
            <Card.Content>
              <InfoRow label="Name" value={student.trainer.name} icon="account-tie" first />
              <InfoRow label="Phone" value={student.trainer.phone || 'N/A'} icon="phone" />
            </Card.Content>
          </Card>
        )}

        {/* Verification Status */}
        <Card style={[styles.card, {backgroundColor: cardBg}]}>
          <Card.Title title="Verification" titleVariant="titleMedium" />
          <Card.Content>
            <InfoRow
              label="Status"
              value={student.verification_status}
              icon="shield-check"
              first
            />
          </Card.Content>
        </Card>

        {student.notes && (
          <Card style={[styles.card, {backgroundColor: cardBg}]}>
            <Card.Title title="Notes" titleVariant="titleMedium" />
            <Card.Content>
              <Text style={{color: textColor}}>{student.notes}</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Renew Membership — sticky bottom action */}
      <View style={[styles.renewBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
        <AppButton
          title="Renew Membership"
          onPress={() => navigation.navigate('RenewStudent', {studentId: student.id})}
          icon="refresh"
          style={styles.renewBtn}
        />
      </View>

      <ConfirmDialog
        visible={deleteDialog}
        title="Delete Student"
        message={`Are you sure you want to delete ${student.name}? This action cannot be undone.`}
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
  container: {flex: 1},
  renewBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  renewBtn: {marginBottom: 0},
  content: {padding: SPACING.md, paddingBottom: SPACING.md},
  profileCard: {borderRadius: BORDER_RADIUS.xl, marginBottom: SPACING.md, elevation: 3},
  profileContent: {alignItems: 'center', paddingVertical: SPACING.lg},
  avatar: {width: 80, height: 80, borderRadius: 40, marginBottom: SPACING.sm},
  studentName: {fontSize: 22, fontWeight: '700', marginTop: SPACING.sm, marginBottom: SPACING.sm},
  badgeRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md},
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  categoryText: {fontSize: 12, fontWeight: '600', color: COLORS.primary},
  quickActions: {flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm},
  actionBtn: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 64,
  },
  actionText: {fontSize: 11, fontWeight: '600', marginTop: 4},
  card: {borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, elevation: 2},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  infoRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  infoContent: {flex: 1},
  infoLabel: {fontSize: 11},
  infoValue: {fontSize: 14, fontWeight: '600', marginTop: 2},
  expiryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  expiryText: {fontSize: 13, fontWeight: '600'},
});

export default StudentDetailScreen;
