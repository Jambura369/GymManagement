import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, UserRole} from '../../types';
import {toggleUserActive} from '../../services/userService';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'StaffDetail'>;

const ROLE_BG: Record<UserRole, string> = {
  Admin: COLORS.primary,
  Manager: COLORS.info,
  Trainer: COLORS.success,
};

const ROLE_TEXT: Record<UserRole, string> = {
  Admin: '#0B0F0E',
  Manager: COLORS.textPrimary,
  Trainer: '#0B0F0E',
};

const StaffDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const {user: currentUser} = useAuthStore();

  const [staff, setStaff] = useState(route.params.user);

  const roleColor = ROLE_BG[staff.role] ?? COLORS.primary;
  const roleTextColor = ROLE_TEXT[staff.role] ?? '#0B0F0E';
  const isSelf = staff.id === currentUser?.id;

  const handleToggleActive = () => {
    if (isSelf) {
      Alert.alert('Not Allowed', 'You cannot deactivate your own account.');
      return;
    }
    const action = staff.is_active ? 'deactivate' : 'activate';
    Alert.alert(
      'Confirm',
      `Are you sure you want to ${action} ${staff.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm',
          onPress: async () => {
            const result = await toggleUserActive(staff.id, !staff.is_active);
            if (!result.error) {
              setStaff(prev => ({...prev, is_active: !prev.is_active}));
              Toast.show({type: 'success', text1: `${staff.name} ${action}d`});
            } else {
              Toast.show({type: 'error', text1: 'Failed to update status'});
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Details</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + SPACING.xl}]}
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.avatarRing, {borderColor: roleColor}]}>
            <AvatarWithFallback
              uri={staff.avatar ?? null}
              name={staff.name}
              size={96}
              color={roleColor}
            />
          </View>

          <Text style={styles.heroName}>{staff.name}</Text>

          <View style={[styles.roleBadge, {backgroundColor: roleColor}]}>
            <Text style={[styles.roleBadgeText, {color: roleTextColor}]}>
              {staff.role.toUpperCase()}
            </Text>
          </View>

          <View style={[
            styles.statusBadge,
            {backgroundColor: staff.is_active ? COLORS.success + '1A' : COLORS.error + '1A'},
          ]}>
            <View style={[
              styles.statusDot,
              {backgroundColor: staff.is_active ? COLORS.success : COLORS.error},
            ]} />
            <Text style={[
              styles.statusText,
              {color: staff.is_active ? COLORS.success : COLORS.error},
            ]}>
              {staff.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CONTACT INFO</Text>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, {backgroundColor: COLORS.primary + '18'}]}>
              <MaterialCommunityIcons name="email-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{staff.email}</Text>
            </View>
          </View>

          {staff.phone ? (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, {backgroundColor: COLORS.info + '18'}]}>
                <MaterialCommunityIcons name="phone-outline" size={18} color={COLORS.info} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{staff.phone}</Text>
              </View>
            </View>
          ) : null}

          <View style={[styles.infoRow, {marginBottom: 0}]}>
            <View style={[styles.infoIcon, {backgroundColor: COLORS.success + '18'}]}>
              <MaterialCommunityIcons name="calendar-outline" size={18} color={COLORS.success} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Joined</Text>
              <Text style={styles.infoValue}>{dayjs(staff.created_at).format('DD MMM YYYY')}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACTIONS</Text>

          {staff.role === 'Trainer' && (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() =>
                navigation.navigate('TrainerPaymentHistory', {
                  trainerId: staff.id,
                  trainerName: staff.name,
                })
              }
              activeOpacity={0.8}>
              <View style={[styles.actionIcon, {backgroundColor: COLORS.primary + '18'}]}>
                <MaterialCommunityIcons name="cash-multiple" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.actionLabel}>Payment History</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {!isSelf && (
            <TouchableOpacity
              style={[styles.actionRow, {marginBottom: 0}]}
              onPress={handleToggleActive}
              activeOpacity={0.8}>
              <View style={[
                styles.actionIcon,
                {backgroundColor: staff.is_active ? COLORS.error + '18' : COLORS.success + '18'},
              ]}>
                <MaterialCommunityIcons
                  name={staff.is_active ? 'account-off-outline' : 'account-check-outline'}
                  size={20}
                  color={staff.is_active ? COLORS.error : COLORS.success}
                />
              </View>
              <Text style={[
                styles.actionLabel,
                {color: staff.is_active ? COLORS.error : COLORS.success},
              ]}>
                {staff.is_active ? 'Deactivate Account' : 'Activate Account'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  iconBtn: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},

  scroll: {paddingHorizontal: SPACING.md, paddingTop: SPACING.md},

  hero: {
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  avatarRing: {
    borderRadius: 54,
    borderWidth: 3,
    padding: 3,
  },
  heroName: {
    fontSize: 22,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  roleBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
  },

  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {flex: 1},
  infoLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
});

export default StaffDetailScreen;
