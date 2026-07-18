import React, {useCallback, useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  Switch,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {useFeature} from '../../hooks/useFeature';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, User, UserRole} from '../../types';
import {fetchUsers, toggleUserActive} from '../../services/userService';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';
import EmptyState from '../../components/common/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type FilterType = 'All' | 'Manager' | 'Trainer';
const FILTERS: FilterType[] = ['All', 'Manager', 'Trainer'];

const ROLE_COLOR: Record<UserRole, string> = {
  Admin: COLORS.primary,
  Manager: COLORS.info,
  Trainer: COLORS.success,
};

const ROLE_TEXT_COLOR: Record<UserRole, string> = {
  Admin: '#0B0F0E',
  Manager: COLORS.textPrimary,
  Trainer: '#0B0F0E',
};

const UserManagementScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {gym, user: currentUser} = useAuthStore();
  const insets = useSafeAreaInsets();
  const {hasAccess} = useFeature('staff_management');

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');

  useEffect(() => {
    if (!hasAccess) {
      navigation.replace('FeatureLocked', {
        featureName: 'Staff Management',
        featureIcon: 'account-group',
        requiredPlan: 'starter',
        description: 'Manage trainers and staff members with the Starter plan.',
      });
    }
  }, [hasAccess, navigation]);

  const load = useCallback(async () => {
    if (!gym) return;
    setLoading(true);
    const result = await fetchUsers(gym.id);
    if (result.data) setUsers(result.data);
    setLoading(false);
  }, [gym]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleToggleActive = (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Not Allowed', 'You cannot deactivate your own account.');
      return;
    }
    const action = user.is_active ? 'deactivate' : 'activate';
    Alert.alert('Confirm', `Are you sure you want to ${action} ${user.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Confirm',
        onPress: async () => {
          const result = await toggleUserActive(user.id, !user.is_active);
          if (!result.error) {
            setUsers(prev =>
              prev.map(u => (u.id === user.id ? {...u, is_active: !u.is_active} : u)),
            );
            Toast.show({type: 'success', text1: `${user.name} ${action}d`});
          }
        },
      },
    ]);
  };

  const managerCount = users.filter(u => u.role === 'Manager').length;
  const trainerCount = users.filter(u => u.role === 'Trainer').length;
  const activeCount = users.filter(u => u.is_active).length;

  const filtered = users.filter(u => {
    const matchesFilter = filter === 'All' || u.role === filter;
    const matchesSearch =
      !search || u.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderItem = ({item}: {item: User}) => {
    const roleColor = ROLE_COLOR[item.role] || COLORS.primary;
    const roleTextColor = ROLE_TEXT_COLOR[item.role] || '#0B0F0E';
    return (
      <TouchableOpacity
        style={[styles.card, !item.is_active && styles.cardInactive]}
        onPress={() => navigation.navigate('StaffDetail', {user: item})}
        activeOpacity={0.8}>
        <View style={[styles.avatarWrap, {borderColor: roleColor + '40'}]}>
          <AvatarWithFallback
            uri={item.avatar ?? null}
            name={item.name}
            size={48}
            color={roleColor}
          />
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.roleBadge, {backgroundColor: roleColor}]}>
            <Text style={[styles.roleText, {color: roleTextColor}]}>
              {item.role.toUpperCase()}
            </Text>
          </View>
        </View>

        <Switch
          value={item.is_active}
          onValueChange={() => handleToggleActive(item)}
          thumbColor={item.is_active ? COLORS.primary : COLORS.textDisabled}
          trackColor={{false: '#2A332E', true: COLORS.primary + '60'}}
          disabled={item.id === currentUser?.id}
        />
      </TouchableOpacity>
    );
  };

  if (!hasAccess) return null;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Management</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSearch(s => s ? '' : s)} hitSlop={8}>
            <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stat pills */}
      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>TOTAL STAFF</Text>
          <Text style={styles.statBig}>{users.length}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>ACTIVE</Text>
          <Text style={[styles.statBig, {color: COLORS.success}]}>{activeCount}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>TRAINERS</Text>
          <Text style={[styles.statBig, {color: COLORS.info}]}>{trainerCount}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search staff..."
          placeholderTextColor={COLORS.textSecondary}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}>
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>Active Team Members</Text>
        <Text style={styles.sectionHeaderCount}>{filtered.length}</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          {paddingBottom: 140 + insets.bottom},
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="account-group-outline"
            title="No staff members"
            subtitle="Add managers and trainers using the button below"
            isDark={true}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, {bottom: insets.bottom + 68}]}
        onPress={() => navigation.navigate('AddUser')}
        activeOpacity={0.85}>
        <MaterialCommunityIcons name="plus" size={22} color="#0B0F0E" />
        <Text style={styles.fabText}>Add Staff</Text>
      </TouchableOpacity>
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
    gap: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  headerRight: {flexDirection: 'row', alignItems: 'center'},
  iconBtn: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},

  statRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statPill: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statBig: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.primary,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  sectionHeaderText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  sectionHeaderCount: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    padding: 0,
  },

  filterRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: '#1a1f1d',
    borderWidth: 1,
    borderColor: '#2e3533',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  chipText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
  },
  chipTextActive: {color: '#0B0F0E', fontWeight: FONT_WEIGHT.bold},

  list: {paddingHorizontal: SPACING.md, paddingTop: SPACING.xs},

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardInactive: {opacity: 0.5},
  avatarWrap: {
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
  },
  cardInfo: {flex: 1},
  cardName: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.6,
  },

  fab: {
    position: 'absolute',
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: '#0B0F0E',
  },
});

export default UserManagementScreen;
