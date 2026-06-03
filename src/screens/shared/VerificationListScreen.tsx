import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Card, Chip} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useStudentStore} from '../../store/studentStore';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {VerificationRequest} from '../../types';
import AppHeader from '../../components/common/AppHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import AppButton from '../../components/common/AppButton';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';

const TABS = ['Pending', 'Approved', 'Rejected', 'All'];

const VerificationListScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const {
    verificationRequests,
    verificationLoading,
    fetchVerifications,
    approveVerification,
    rejectVerification,
  } = useStudentStore();

  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Pending');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  useEffect(() => {
    load(activeTab);
  }, [activeTab, gym]);

  const load = (tab: string) => {
    if (gym) {
      const trainerFilter = user?.role === 'Trainer' ? user.id : undefined;
      fetchVerifications(gym.id, tab === 'All' ? undefined : tab, trainerFilter);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    load(activeTab);
    setRefreshing(false);
  };

  const handleApprove = async (request: VerificationRequest) => {
    if (!user) return;
    setActionLoading(true);
    const success = await approveVerification(request.id, user.id);
    setActionLoading(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Student Approved!', text2: `${request.student?.name} is now active.`});
    } else {
      Toast.show({type: 'error', text1: 'Failed to approve'});
    }
  };

  const handleRejectOpen = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleRejectConfirm = async () => {
    if (!user || !selectedRequest) return;
    setActionLoading(true);
    const success = await rejectVerification(
      selectedRequest.id,
      user.id,
      rejectionReason,
    );
    setActionLoading(false);
    setRejectModalVisible(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Request Rejected'});
    }
  };

  const renderItem = ({item}: {item: VerificationRequest}) => (
    <Card style={[styles.card, {backgroundColor: cardBg}]}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <AvatarWithFallback
            uri={item.student?.image}
            name={item.student?.name || 'S'}
            size={44}
          />
          <View style={styles.studentInfo}>
            <Text style={[styles.studentName, {color: textColor}]} numberOfLines={1}>
              {item.student?.name || 'Unknown'}
            </Text>
            <Text style={[styles.phone, {color: COLORS.textSecondary}]}>
              {item.student?.phone}
            </Text>
            <Text style={[styles.date, {color: COLORS.textSecondary}]}>
              {dayjs(item.created_at).format('DD MMM YYYY')}
            </Text>
          </View>
          <StatusBadge status={item.status} size="sm" />
        </View>

        {/* Package Info */}
        {item.student?.package && (
          <View style={styles.packageRow}>
            <Chip
              icon="package-variant"
              compact
              style={{backgroundColor: COLORS.primary + '15'}}
              textStyle={{color: COLORS.primary, fontSize: 11}}>
              {item.student.package.name}
            </Chip>
            <Chip
              icon="cash"
              compact
              style={{backgroundColor: COLORS.success + '15'}}
              textStyle={{color: COLORS.success, fontSize: 11}}>
              ₹{item.student.amount_paid ?? 0}
            </Chip>
            <Chip
              icon={
                item.student.payment_type === 'Cash' ? 'cash' : 'qrcode'
              }
              compact
              style={{backgroundColor: COLORS.info + '15'}}
              textStyle={{color: COLORS.info, fontSize: 11}}>
              {item.student.payment_type}
            </Chip>
          </View>
        )}

        {/* Trainer */}
        {item.trainer && (
          <View style={styles.trainerRow}>
            <AvatarWithFallback
              uri={item.trainer.avatar}
              name={item.trainer.name}
              size={22}
              color={COLORS.trainerColor}
            />
            <Text style={[styles.trainerText, {color: COLORS.textSecondary}]}>
              Added by: {item.trainer.name}
            </Text>
          </View>
        )}

        {/* Actions - only for Admin/Manager on Pending items */}
        {item.status === 'Pending' &&
          (user?.role === 'Admin' || user?.role === 'Manager') && (
            <View style={styles.actions}>
              <AppButton
                title="Reject"
                onPress={() => handleRejectOpen(item)}
                mode="outlined"
                style={styles.actionBtn}
                color={COLORS.error}
                disabled={actionLoading}
              />
              <AppButton
                title="Approve"
                onPress={() => handleApprove(item)}
                style={[styles.actionBtn, {flex: 1.5}]}
                loading={actionLoading}
              />
            </View>
          )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      <AppHeader
        title="Verification Requests"
        onBack={() => navigation.goBack()}
        isDark={isDark}
      />

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && {
                borderBottomWidth: 2,
                borderBottomColor: COLORS.primary,
              },
            ]}
            onPress={() => setActiveTab(tab)}>
            <Text
              style={[
                styles.tabText,
                {color: activeTab === tab ? COLORS.primary : COLORS.textSecondary},
              ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={verificationRequests}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, {paddingBottom: SPACING.xxl + insets.bottom}]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="account-clock-outline"
            title="No verification requests"
            subtitle={
              activeTab === 'Pending'
                ? 'All students are verified'
                : `No ${activeTab.toLowerCase()} requests`
            }
            isDark={isDark}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Rejection Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View
            style={[
              styles.modalSheet,
              {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface},
            ]}>
            <Text style={[styles.modalTitle, {color: textColor}]}>
              Reject Request
            </Text>
            <Text style={[styles.modalSubtitle, {color: COLORS.textSecondary}]}>
              Rejecting: {selectedRequest?.student?.name}
            </Text>
            <TextInput
              style={[
                styles.reasonInput,
                {
                  color: textColor,
                  borderColor: COLORS.border,
                  backgroundColor: isDark ? COLORS.backgroundDark : COLORS.background,
                },
              ]}
              placeholder="Enter rejection reason (optional)"
              placeholderTextColor={COLORS.placeholder}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                onPress={() => setRejectModalVisible(false)}
                mode="outlined"
                style={{flex: 1}}
              />
              <AppButton
                title="Reject"
                onPress={handleRejectConfirm}
                loading={actionLoading}
                style={{flex: 1}}
                color={COLORS.error}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  tabText: {fontSize: 13, fontWeight: '600'},
  list: {padding: SPACING.md},
  card: {
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    elevation: 2,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  studentInfo: {flex: 1},
  studentName: {fontSize: 15, fontWeight: '700'},
  phone: {fontSize: 12, marginTop: 2},
  date: {fontSize: 11, marginTop: 1},
  packageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  trainerText: {fontSize: 12},
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionBtn: {flex: 1},
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  modalTitle: {fontSize: 18, fontWeight: '700', marginBottom: 4},
  modalSubtitle: {fontSize: 13, marginBottom: SPACING.md},
  reasonInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  modalActions: {flexDirection: 'row', gap: SPACING.sm},
});

export default VerificationListScreen;
