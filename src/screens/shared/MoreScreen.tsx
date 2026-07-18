import React from 'react';
import {StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Avatar, Divider} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuthStore} from '../../store/authStore';
import {useSubscriptionStore} from '../../store/subscriptionStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList} from '../../types';
import RoleBadge from '../../components/common/RoleBadge';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  icon: string;
  label: string;
  route?: keyof RootStackParamList;
  color?: string;
  badge?: string;
  rightComponent?: React.ReactNode;
  onPress?: () => void;
  adminOnly?: boolean;
  managerAndAdmin?: boolean;
  trainerOnly?: boolean;
}

const MoreScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym, logout} = useAuthStore();
  const {plan} = useSubscriptionStore();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  const menuSections: Array<{title: string; items: MenuItem[]}> = [
    {
      title: 'Gym Management',
      items: [
        {icon: 'account-clock', label: 'Verification Requests', route: 'VerificationList', color: COLORS.warning},
        {icon: 'qrcode', label: 'Payment QR', route: 'PaymentQR', color: COLORS.success},
        {icon: 'package-variant', label: 'Packages', route: 'PackageList', color: COLORS.info, managerAndAdmin: true},
        {icon: 'currency-inr', label: 'Trainer Salary', route: 'SalaryList', color: COLORS.success, managerAndAdmin: true},
        {icon: 'chart-bar', label: 'Reports', route: 'Reports', color: COLORS.secondary, managerAndAdmin: true},
        {icon: 'pill', label: 'Supplement Stock', route: 'SupplementList', color: '#39FF88', managerAndAdmin: true},
        {
          icon: 'cash-multiple',
          label: 'My Salary History',
          color: COLORS.success,
          trainerOnly: true,
          onPress: () =>
            user &&
            navigation.navigate('TrainerPaymentHistory', {trainerId: user.id, trainerName: user.name}),
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {icon: 'account-group', label: 'Staff Management', route: 'UserManagement', color: COLORS.info, adminOnly: true},
        {
          icon: 'crown-outline',
          label: 'Subscription',
          color: '#FFD700',
          adminOnly: true,
          badge: plan?.name as string | undefined,
          route: 'Subscription',
        },
        {icon: 'cog', label: 'Gym Settings', route: 'GymSettings', color: COLORS.textSecondary as string, adminOnly: true},
      ],
    },
    {
      title: 'Preferences',
      items: [
        {icon: 'bell-outline', label: 'Notifications', route: 'Notifications', color: COLORS.info},
        {icon: 'account', label: 'My Profile', route: 'Profile', color: COLORS.primary},
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: 'logout',
          label: 'Sign Out',
          color: COLORS.error,
          onPress: handleLogout,
        },
      ],
    },
  ];

  const shouldShow = (item: MenuItem) => {
    if (item.adminOnly && user?.role !== 'Admin') return false;
    if (item.managerAndAdmin && user?.role === 'Trainer') return false;
    if (item.trainerOnly && user?.role !== 'Trainer') return false;
    return true;
  };

  const renderMenuItem = (item: MenuItem) => {
    if (!shouldShow(item)) return null;
    return (
      <TouchableOpacity
        key={item.label}
        style={styles.menuItem}
        onPress={item.onPress || (item.route ? () => navigation.navigate(item.route as any) : undefined)}
        activeOpacity={0.7}>
        <View style={[styles.menuIcon, {backgroundColor: (item.color || COLORS.primary) + '20'}]}>
          <MaterialCommunityIcons
            name={item.icon}
            size={22}
            color={item.color || COLORS.primary}
          />
        </View>
        <Text style={[styles.menuLabel, {color: item.color === COLORS.error ? item.color : COLORS.textPrimary}]}>
          {item.label}
        </Text>
        {item.badge && (
          <View style={[styles.badgeChip, {backgroundColor: (item.color || COLORS.primary) + '18'}]}>
            <Text style={[styles.badgeText, {color: item.color || COLORS.primary}]}>{item.badge}</Text>
          </View>
        )}
        {item.rightComponent || (
          (item.route || item.onPress) && item.color !== COLORS.error ? (
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
          ) : null
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Fixed header — stays put while the list scrolls */}
      <View style={[styles.header, {paddingTop: insets.top}]}>
        <Text style={styles.headerTitle}>More</Text>
        <View style={styles.headerRight}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(user?.name || 'U').slice(0, 1).toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + SPACING.xl}]}
        showsVerticalScrollIndicator={false}>

      {/* Profile card */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => navigation.navigate('Profile' as any)}
        activeOpacity={0.75}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{(user?.name || 'U').slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {gym?.gym_name ? <Text style={styles.gymName}>{gym.gym_name}</Text> : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {/* Menu Sections */}
      {menuSections.map(section => {
        const visibleItems = section.items.filter(shouldShow);
        if (visibleItems.length === 0) return null;
        return (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {section.title.toUpperCase()}
            </Text>
            <View style={styles.sectionCard}>
              {visibleItems.map((item, idx) => (
                <View key={item.label}>
                  {renderMenuItem(item)}
                  {idx < visibleItems.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <Text style={styles.version}>Gymblix v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  content: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: '#111413',
  },
  headerTitle: {fontSize: 24, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},
  headerRight: {flexDirection: 'row', gap: SPACING.sm},
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: '#323534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},
  profileInfo: {flex: 1},
  profileName: {color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold},
  profileEmail: {color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, marginTop: 2},
  gymName: {color: COLORS.primary, fontSize: FONT_SIZE.xs, marginTop: 2},
  section: {paddingHorizontal: SPACING.md, marginTop: SPACING.sm},
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
    color: COLORS.textSecondary,
  },
  sectionCard: {borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.surface},
  divider: {height: 1, backgroundColor: COLORS.border},
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium},
  badgeChip: {paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.pill, marginRight: 4},
  badgeText: {fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold},
  version: {textAlign: 'center', fontSize: FONT_SIZE.xs, marginTop: SPACING.lg, color: COLORS.textDisabled},
});

export default MoreScreen;
