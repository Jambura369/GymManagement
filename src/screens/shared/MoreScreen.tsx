import React from 'react';
import {StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Avatar, Divider, Switch} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {useSubscriptionStore} from '../../store/subscriptionStore';
import {COLORS, SPACING, BORDER_RADIUS, ROLE_COLORS} from '../../constants';
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
  const {isDark, toggleTheme} = useThemeStore();
  const {plan} = useSubscriptionStore();
  const insets = useSafeAreaInsets();

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;
  const subColor = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;

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
        {icon: 'currency-inr', label: 'Trainer Salary', route: 'AddSalary', color: COLORS.success, managerAndAdmin: true},
        {icon: 'chart-bar', label: 'Reports', route: 'Reports', color: COLORS.secondary, managerAndAdmin: true},
        {icon: 'pill', label: 'Supplement Stock', route: 'SupplementList', color: COLORS.trainerColor, managerAndAdmin: true},
        {
          icon: 'cash-clock',
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
        {icon: 'account-group', label: 'Staff Management', route: 'UserManagement', color: COLORS.managerColor, adminOnly: true},
        {
          icon: 'crown-outline',
          label: 'Subscription',
          color: COLORS.gold,
          adminOnly: true,
          badge: plan?.name,
          onPress: () =>
            navigation.navigate('FeatureLocked', {
              featureName: 'Subscription',
              featureIcon: 'crown-outline',
              requiredPlan: plan.tier,
              description: 'View and manage your Gymblix plan.',
            }),
        },
        {icon: 'cog', label: 'Gym Settings', route: 'GymSettings', color: COLORS.textSecondary, adminOnly: true},
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'theme-light-dark',
          label: 'Dark Mode',
          color: COLORS.primary,
          rightComponent: (
            <Switch value={isDark} onValueChange={toggleTheme} color={COLORS.primary} />
          ),
        },
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
        style={[styles.menuItem, {backgroundColor: cardBg}]}
        onPress={item.onPress || (item.route ? () => navigation.navigate(item.route as any) : undefined)}
        activeOpacity={0.7}>
        <View style={[styles.menuIcon, {backgroundColor: (item.color || COLORS.primary) + '20'}]}>
          <MaterialCommunityIcons
            name={item.icon}
            size={22}
            color={item.color || COLORS.primary}
          />
        </View>
        <Text style={[styles.menuLabel, {color: item.color === COLORS.error ? item.color : textColor}]}>
          {item.label}
        </Text>
        {item.badge && (
          <View style={[styles.badgeChip, {backgroundColor: (item.color || COLORS.primary) + '18'}]}>
            <Text style={[styles.badgeText, {color: item.color || COLORS.primary}]}>{item.badge}</Text>
          </View>
        )}
        {item.rightComponent || (
          (item.route || item.onPress) && item.color !== COLORS.error ? (
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.placeholder} />
          ) : null
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: bgColor}]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* Profile Header */}
      <View style={[styles.profileHeader, {backgroundColor: COLORS.primary, paddingTop: insets.top + SPACING.md}]}>
        <Avatar.Text
          size={64}
          label={(user?.name || 'U').slice(0, 2).toUpperCase()}
          style={{backgroundColor: 'rgba(255,255,255,0.3)'}}
          labelStyle={{fontSize: 20}}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {gym?.gym_name ? (
            <View style={styles.gymBrand}>
              <MaterialCommunityIcons name="dumbbell" size={11} color={COLORS.goldLight} />
              <Text style={styles.gymBrandText}>{gym.gym_name}</Text>
            </View>
          ) : null}
        </View>
        <RoleBadge role={user?.role || 'Trainer'} onDark />
      </View>

      {/* Menu Sections */}
      {menuSections.map(section => {
        const visibleItems = section.items.filter(shouldShow);
        if (visibleItems.length === 0) return null;
        return (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, {color: subColor}]}>
              {section.title.toUpperCase()}
            </Text>
            <View style={[styles.sectionCard, {backgroundColor: cardBg}]}>
              {visibleItems.map((item, idx) => (
                <View key={item.label}>
                  {renderMenuItem(item)}
                  {idx < visibleItems.length - 1 && (
                    <Divider style={{backgroundColor: isDark ? COLORS.borderDark : COLORS.border}} />
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <Text style={[styles.version, {color: subColor}]}>Gymblix v1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: SPACING.xxl},
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  profileInfo: {flex: 1},
  profileName: {color: '#FFF', fontSize: 18, fontWeight: '700'},
  profileEmail: {color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2},
  profileGym: {color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1},
  gymBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.goldLight + '60',
  },
  gymBrandText: {color: COLORS.goldLight, fontSize: 11, fontWeight: '700', letterSpacing: 0.5},
  section: {paddingHorizontal: SPACING.md, marginTop: SPACING.md},
  sectionTitle: {fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: SPACING.xs},
  sectionCard: {borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', elevation: 1},
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {flex: 1, fontSize: 14, fontWeight: '500'},
  badgeChip: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.round, marginRight: 4},
  badgeText: {fontSize: 11, fontWeight: '700'},
  version: {textAlign: 'center', fontSize: 12, marginTop: SPACING.xl},
});

export default MoreScreen;
