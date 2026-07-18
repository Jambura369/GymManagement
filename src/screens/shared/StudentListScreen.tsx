import React, {useCallback, useState, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  StatusBar,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useStudentStore} from '../../store/studentStore';
import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, Student} from '../../types';
import EmptyState from '../../components/common/EmptyState';
import CardSkeleton from '../../components/skeletons/CardSkeleton';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTER_OPTIONS = ['All', 'Active', 'Expired', 'Expiring'];

const StudentListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const {
    students,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    fetchStudents,
    loadMore,
    setFilter,
    clearFilter,
  } = useStudentStore();

  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      if (gym) fetchStudents(gym.id, true);
    }, [gym, fetchStudents]),
  );

  const toggleSearch = () => {
    if (searchVisible) {
      onSearchChange('');
      setSearchVisible(false);
    } else {
      setSearchVisible(true);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  };

  const onSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilter({search: text});
      if (gym) fetchStudents(gym.id, true);
    }, 350);
  };

  const onFilterChange = (f: string) => {
    setActiveFilter(f);
    if (f === 'All') {
      clearFilter();
    } else if (f === 'Active') {
      setFilter({is_active: true, verification_status: undefined});
    } else if (f === 'Expired') {
      setFilter({is_active: false, verification_status: undefined});
    } else if (f === 'Expiring') {
      setFilter({expiring_soon: true} as any);
    }
    if (gym) fetchStudents(gym.id, true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStudents(gym!.id, true);
    setRefreshing(false);
  };

  const getStatusBadge = (item: Student) => {
    const isExpired = item.membership_expiry && dayjs(item.membership_expiry).isBefore(dayjs());
    const daysLeft = item.membership_expiry
      ? dayjs(item.membership_expiry).diff(dayjs(), 'day')
      : null;
    const isExpiringSoon = !isExpired && daysLeft !== null && daysLeft <= 7;

    if (!item.is_active || isExpired) return {label: 'EXPIRED', bg: '#93000a', color: '#ffb4ab'};
    if (isExpiringSoon) return {label: 'EXPIRING', bg: '#eab308', color: '#000'};
    return {label: 'ACTIVE', bg: '#63ff95', color: '#003919'};
  };

  const renderStudent = ({item}: {item: Student}) => {
    const badge = getStatusBadge(item);
    const daysLeft = item.membership_expiry
      ? dayjs(item.membership_expiry).diff(dayjs(), 'day')
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('StudentDetail', {studentId: item.id})}
        activeOpacity={0.7}>
        <AvatarWithFallback uri={item.image} name={item.name} size={48} viewable={false} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {item.package?.name || item.phone}
          </Text>
          {item.membership_expiry && (
            <Text style={[
              styles.cardExpiry,
              {color: badge.label === 'EXPIRED' ? COLORS.error : COLORS.textSecondary},
            ]}>
              {daysLeft !== null && daysLeft < 0
                ? `Expired ${dayjs(item.membership_expiry).format('DD MMM YYYY')}`
                : daysLeft === 0
                ? 'Expires today'
                : `Expires ${dayjs(item.membership_expiry).format('DD MMM YYYY')}`}
            </Text>
          )}
        </View>
        <View style={[styles.badge, {backgroundColor: badge.bg}]}>
          <Text style={[styles.badgeText, {color: badge.color}]}>{badge.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Students</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={toggleSearch} hitSlop={8} style={styles.iconBtn}>
            <MaterialCommunityIcons
              name={searchVisible ? 'close' : 'magnify'}
              size={22}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('ExpiryList', {})}
            hitSlop={8}
            style={styles.iconBtn}>
            <MaterialCommunityIcons name="filter-variant" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collapsible search */}
      {searchVisible && (
        <View style={styles.searchRow}>
          <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search by name or phone..."
            placeholderTextColor={COLORS.textSecondary}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map(f => {
          const isActive = activeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => onFilterChange(f)}
              style={[styles.chip, isActive && styles.chipActive]}>
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading && students.length === 0 ? (
        <CardSkeleton count={6} isDark />
      ) : error && students.length === 0 ? (
        <View style={styles.errorCenter}>
          <MaterialCommunityIcons name="wifi-off" size={48} color={COLORS.error} />
          <Text style={styles.errorTitle}>Failed to load students</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => gym && fetchStudents(gym.id, true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={item => item.id}
          renderItem={renderStudent}
          ListEmptyComponent={
            <EmptyState
              icon="account-off-outline"
              title="No students found"
              subtitle="Add a student to get started"
              actionLabel="Add Student"
              onAction={() => navigation.navigate('AddStudent')}
              isDark={true}
            />
          }
          ListFooterComponent={isLoadingMore ? <CardSkeleton count={2} isDark /> : null}
          onEndReached={() => hasMore && gym && loadMore(gym.id)}
          onEndReachedThreshold={0.3}
          contentContainerStyle={[styles.list, {paddingBottom: 140 + insets.bottom}]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, {bottom: insets.bottom + 68}]}
        onPress={() => navigation.navigate('AddStudent')}
        activeOpacity={0.85}>
        <MaterialCommunityIcons name="plus" size={26} color="#0B0F0E" />
      </TouchableOpacity>
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
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  headerIcons: {flexDirection: 'row', gap: SPACING.xs},
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Collapsible search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: '#272b2a',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    padding: 0,
  },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: '#272b2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {backgroundColor: COLORS.primary},
  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  chipTextActive: {color: '#0B0F0E', fontWeight: FONT_WEIGHT.bold},

  list: {paddingHorizontal: SPACING.md},

  // Card — matches Figma: avatar | name+sub+expiry | badge (no call button)
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},
  cardSub: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},
  cardExpiry: {fontSize: FONT_SIZE.xs, marginTop: 2, fontWeight: FONT_WEIGHT.semiBold},
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  badgeText: {fontSize: 10, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.4},

  // Error
  errorCenter: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.sm},
  errorTitle: {fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},
  errorMsg: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center'},
  retryBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.sm,
  },
  retryText: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: '#0B0F0E'},

  // FAB
  fab: {
    position: 'absolute',
    right: SPACING.md,
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default StudentListScreen;
