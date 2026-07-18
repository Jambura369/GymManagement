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
  StatusBar,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useStudentStore} from '../../store/studentStore';
import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {VerificationRequest} from '../../types';
import EmptyState from '../../components/common/EmptyState';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';

const VerificationListScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user, gym} = useAuthStore();
  const {
    verificationRequests,
    fetchVerifications,
    approveVerification,
    rejectVerification,
  } = useStudentStore();

  const insets = useSafeAreaInsets();
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
  }, [gym]);

  const load = () => {
    if (gym) {
      const trainerFilter = user?.role === 'Trainer' ? user.id : undefined;
      fetchVerifications(gym.id, 'Pending', trainerFilter);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  };

  const handleApprove = async (request: VerificationRequest) => {
    if (!user) return;
    setActionLoading(request.id);
    const success = await approveVerification(request.id, user.id);
    setActionLoading(null);
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
    setActionLoading(selectedRequest.id);
    const success = await rejectVerification(selectedRequest.id, user.id, rejectionReason);
    setActionLoading(null);
    setRejectModalVisible(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Request Rejected'});
    }
  };

  const pendingCount = verificationRequests.length;
  const todayCount = verificationRequests.filter(r =>
    dayjs(r.created_at).isSame(dayjs(), 'day'),
  ).length;

  const renderItem = ({item}: {item: VerificationRequest}) => {
    const isLoading = actionLoading === item.id;
    const submittedTime = dayjs(item.created_at).format('MMM DD, hh:mm A');
    const canAct = item.status === 'Pending' && (user?.role === 'Admin' || user?.role === 'Manager');

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <AvatarWithFallback
            uri={item.student?.image}
            name={item.student?.name || 'S'}
            size={48}
          />
          <View style={styles.cardInfo}>
            <Text style={styles.studentName} numberOfLines={1}>
              {item.student?.name || 'Unknown'}
            </Text>
            {item.trainer ? (
              <Text style={styles.trainerName} numberOfLines={1}>
                Trainer: <Text style={{color: COLORS.primary}}>{item.trainer.name}</Text>
              </Text>
            ) : null}
            <Text style={styles.submittedAt}>SUBMITTED {submittedTime.toUpperCase()}</Text>
          </View>
        </View>

        {canAct && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => handleRejectOpen(item)}
              disabled={!!isLoading}
              activeOpacity={0.7}>
              <MaterialCommunityIcons name="close" size={14} color={COLORS.textPrimary} />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.approveBtn, isLoading && {opacity: 0.7}]}
              onPress={() => handleApprove(item)}
              disabled={!!isLoading}
              activeOpacity={0.85}>
              <MaterialCommunityIcons name="check" size={14} color="#0B0F0E" />
              <Text style={styles.approveBtnText}>
                {isLoading ? 'Approving...' : 'Approve'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification Requests</Text>
        {pendingCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{pendingCount}</Text>
          </View>
        )}
        <View style={{flex: 1}} />
        <TouchableOpacity hitSlop={8}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Stat tiles */}
      <View style={styles.statRow}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>NEW TODAY</Text>
          <Text style={styles.statValue}>{String(todayCount).padStart(2, '0')}</Text>
        </View>
        <View style={[styles.statTile, styles.statTileRight]}>
          <Text style={styles.statLabel}>AVG. TIME</Text>
          <Text style={styles.statValue}>2.4h</Text>
        </View>
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
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="account-clock-outline"
            title="No verification requests"
            subtitle="All students are verified"
            isDark={true}
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
          <View style={[styles.modalSheet, {backgroundColor: COLORS.surface}]}>
            <Text style={styles.modalTitle}>Reject Request</Text>
            <Text style={styles.modalSubtitle}>
              Rejecting: {selectedRequest?.student?.name}
            </Text>
            <TextInput
              style={[styles.reasonInput, {color: COLORS.textPrimary, borderColor: COLORS.border, backgroundColor: COLORS.background}]}
              placeholder="Enter rejection reason (optional)"
              placeholderTextColor={COLORS.textSecondary}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRejectBtn}
                onPress={handleRejectConfirm}>
                <Text style={styles.modalRejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {fontSize: 11, fontWeight: FONT_WEIGHT.bold, color: '#0B0F0E'},

  // Stat tiles
  statRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  statTileRight: {},
  statLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    lineHeight: 38,
  },

  list: {paddingHorizontal: SPACING.md},

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  cardInfo: {flex: 1},
  studentName: {fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},
  trainerName: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},
  submittedAt: {fontSize: 10, color: COLORS.textSecondary, marginTop: 3, letterSpacing: 0.3},

  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  rejectBtnText: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  approveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  approveBtnText: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#0B0F0E'},

  // Modal
  modalOverlay: {flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end'},
  modalSheet: {borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg},
  modalTitle: {fontSize: 18, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 4},
  modalSubtitle: {fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md},
  reasonInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  modalActions: {flexDirection: 'row', gap: SPACING.sm},
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  modalCancelText: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  modalRejectBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.error,
  },
  modalRejectText: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#FFF'},
});

export default VerificationListScreen;
