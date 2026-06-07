import React, {useCallback, useState, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ScrollView,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FAB} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useStudentStore} from '../../store/studentStore';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, VERIFICATION_COLORS} from '../../constants';
import {RootStackParamList, Student} from '../../types';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import CardSkeleton from '../../components/skeletons/CardSkeleton';
import StatusBadge from '../../components/common/StatusBadge';
import AppHeader from '../../components/common/AppHeader';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTER_OPTIONS = ['All', 'Active', 'Pending', 'Approved', 'Rejected'];

const StudentListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const {
    students,
    total,
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
  const [activeFilter, setActiveFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  useFocusEffect(
    useCallback(() => {
      if (gym) fetchStudents(gym.id, true);
    }, [gym, fetchStudents]),
  );

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
    } else {
      setFilter({verification_status: f as any, is_active: undefined});
    }
    if (gym) fetchStudents(gym.id, true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStudents(gym!.id, true);
    setRefreshing(false);
  };

  const renderStudent = ({item}: {item: Student}) => {
    const isExpired =
      item.membership_expiry &&
      dayjs(item.membership_expiry).isBefore(dayjs());
    const daysLeft = item.membership_expiry
      ? dayjs(item.membership_expiry).diff(dayjs(), 'day')
      : null;

    return (
      <TouchableOpacity
        style={[styles.card, {backgroundColor: cardBg}]}
        onPress={() =>
          navigation.navigate('StudentDetail', {studentId: item.id})
        }
        activeOpacity={0.7}>
        <View style={styles.cardRow}>
          <AvatarWithFallback uri={item.image} name={item.name} size={48} viewable={false} />
          <View style={styles.cardInfo}>
            <Text style={[styles.name, {color: textColor}]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.phone, {color: COLORS.textSecondary}]}>
              {item.phone}
            </Text>
            {item.membership_expiry && (
              <Text
                style={[
                  styles.expiry,
                  {
                    color: isExpired
                      ? COLORS.error
                      : (daysLeft ?? 999) <= 7
                      ? COLORS.warning
                      : COLORS.success,
                  },
                ]}>
                {isExpired
                  ? 'Expired'
                  : daysLeft === 0
                  ? 'Expires today'
                  : `Expires in ${daysLeft}d`}
              </Text>
            )}
          </View>
          <View style={styles.cardActions}>
            <StatusBadge
              status={
                item.is_active
                  ? 'Active'
                  : item.verification_status === 'Pending'
                  ? 'Pending'
                  : item.verification_status === 'Rejected'
                  ? 'Rejected'
                  : 'Inactive'
              }
              size="sm"
            />
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${item.phone}`)}>
              <MaterialCommunityIcons
                name="phone"
                size={18}
                color={COLORS.success}
              />
            </TouchableOpacity>
          </View>
        </View>
        {item.package && (
          <View style={styles.packageBadge}>
            <MaterialCommunityIcons
              name="package-variant"
              size={12}
              color={COLORS.primary}
            />
            <Text style={[styles.packageText, {color: COLORS.primary}]}>
              {item.package.name}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return <CardSkeleton count={2} isDark={isDark} />;
  };

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      <AppHeader
        title="Students"
        subtitle={`${total} found`}
        isDark={isDark}
        rightComponent={
          (user?.role === 'Admin' || user?.role === 'Manager') ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('VerificationList')}>
              <MaterialCommunityIcons
                name="account-clock"
                size={24}
                color={isDark ? COLORS.textDark : COLORS.text}
              />
            </TouchableOpacity>
          ) : null
        }
      />

      <SearchBar
        value={search}
        onChangeText={onSearchChange}
        placeholder="Search by name or phone..."
        isDark={isDark}
      />

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}>
        {FILTER_OPTIONS.map(f => {
          const isActive = activeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => onFilterChange(f)}
              activeOpacity={0.75}
              style={[
                styles.filterTab,
                isActive
                  ? styles.filterTabActive
                  : {
                      backgroundColor: isDark ? COLORS.cardDark : '#F3F4F6',
                      borderColor: isDark ? COLORS.border : '#E5E7EB',
                    },
              ]}>
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color: isActive
                      ? '#FFF'
                      : isDark
                      ? COLORS.textDark
                      : '#374151',
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}>
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading && students.length === 0 ? (
        <CardSkeleton count={6} isDark={isDark} />
      ) : error && students.length === 0 ? (
        <View style={styles.errorCenter}>
          <MaterialCommunityIcons name="wifi-off" size={48} color={COLORS.error} />
          <Text style={[styles.errorTitle, {color: textColor}]}>Failed to load students</Text>
          <Text style={[styles.errorMsg, {color: COLORS.textSecondary}]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, {backgroundColor: COLORS.primary}]}
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
              isDark={isDark}
            />
          }
          ListFooterComponent={renderFooter}
          onEndReached={() => hasMore && gym && loadMore(gym.id)}
          onEndReachedThreshold={0.3}
          contentContainerStyle={[styles.list, {paddingBottom: 80 + insets.bottom}]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, {backgroundColor: COLORS.primary}]}
        color="#FFF"
        onPress={() => navigation.navigate('AddStudent')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  filterScroll: {flexGrow: 0, flexShrink: 0},
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
  },
  list: {padding: SPACING.md},
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  cardInfo: {flex: 1},
  name: {fontSize: 15, fontWeight: '700'},
  phone: {fontSize: 13, marginTop: 2},
  expiry: {fontSize: 11, marginTop: 2, fontWeight: '600'},
  cardActions: {alignItems: 'flex-end', gap: 8},
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  packageText: {fontSize: 11, fontWeight: '600'},
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    elevation: 4,
  },
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xxl,
  },
  errorTitle: {fontSize: 17, fontWeight: '700', marginTop: SPACING.md, marginBottom: SPACING.xs},
  errorMsg: {fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg},
  retryBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 4,
    borderRadius: BORDER_RADIUS.lg,
  },
  retryText: {color: '#FFF', fontWeight: '700', fontSize: 14},
});

export default StudentListScreen;
