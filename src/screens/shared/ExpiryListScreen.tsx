import React, {useEffect, useCallback, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, Student} from '../../types';
import {getExpiryAlerts} from '../../services/studentService';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteT = RouteProp<RootStackParamList, 'ExpiryList'>;

type Filter = 'Today' | 'This Week' | 'This Month';

const getTimeBadge = (expiryDate: string): {label: string; color: string; bg: string} => {
  const diffDays = dayjs(expiryDate).startOf('day').diff(dayjs().startOf('day'), 'day');
  const diffHours = dayjs(expiryDate).diff(dayjs(), 'hour');

  if (diffDays < 0) return {label: 'EXPIRED', color: '#ffb4ab', bg: '#93000a'};
  if (diffHours <= 24 && diffHours >= 0) {
    if (diffHours < 12) return {label: `${diffHours}H`, color: '#ffb4ab', bg: '#93000a'};
    return {label: `${diffHours}H`, color: '#000', bg: '#eab308'};
  }
  if (diffDays === 0) return {label: 'TODAY', color: '#000', bg: '#eab308'};
  if (diffDays <= 3) return {label: `${diffDays} DAYS`, color: '#FFF', bg: '#F97316'};
  if (diffDays <= 7) return {label: `${diffDays} DAYS`, color: '#FFF', bg: '#FB923C'};
  return {label: `${diffDays} DAYS`, color: COLORS.textSecondary, bg: '#272b2a'};
};

const filterStudent = (s: Student, filter: Filter): boolean => {
  if (!s.membership_expiry) return false;
  const diffDays = dayjs(s.membership_expiry).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (filter === 'Today') return diffDays >= 0 && diffDays <= 1;
  if (filter === 'This Week') return diffDays >= 0 && diffDays <= 7;
  if (filter === 'This Month') return diffDays >= -30 && diffDays <= 30;
  return true;
};

const ExpiryListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const {gym} = useAuthStore();
  const insets = useSafeAreaInsets();

  const trainerId = route.params?.trainerId;

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<Filter>('Today');

  const load = useCallback(async () => {
    if (!gym) return;
    setLoading(true);
    const result = await getExpiryAlerts(gym.id, trainerId);
    if (result.data) setAllStudents(result.data);
    setLoading(false);
  }, [gym, trainerId]);

  useEffect(() => {
    load();
  }, [load]);

  const students = allStudents.filter(s => filterStudent(s, activeFilter));

  const criticalCount = allStudents.filter(s => {
    if (!s.membership_expiry) return false;
    const diffHours = dayjs(s.membership_expiry).diff(dayjs(), 'hour');
    return diffHours >= 0 && diffHours <= 24;
  }).length;

  const renderItem = ({item}: {item: Student}) => {
    if (!item.membership_expiry) return null;
    const badge = getTimeBadge(item.membership_expiry);
    const subInfo = item.package?.name || item.phone;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('StudentDetail', {studentId: item.id})}
        activeOpacity={0.7}>
        <AvatarWithFallback uri={item.image} name={item.name} size={48} viewable={false} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{subInfo}</Text>
        </View>
        <View style={[styles.timeBadge, {backgroundColor: badge.bg}]}>
          <Text style={[styles.timeBadgeText, {color: badge.color}]}>{badge.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const FILTERS: Filter[] = ['Today', 'This Week', 'This Month'];

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expiring Memberships</Text>
        <MaterialCommunityIcons name="account-outline" size={22} color={COLORS.textSecondary} />
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.7}>
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          onRefresh={load}
          refreshing={loading}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, {paddingBottom: 80 + insets.bottom}]}
          ListHeaderComponent={
            criticalCount > 0 ? (
              <View style={styles.criticalHeader}>
                <Text style={styles.criticalLabel}>CRITICAL EXPIRIES</Text>
                <Text style={styles.criticalCount}>
                  <Text style={styles.criticalNum}>{criticalCount}</Text>
                  {' '}Memberships ending in 24h
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="check-circle-outline" size={64} color={COLORS.success} />
              <Text style={styles.emptyTitle}>All clear for {activeFilter.toLowerCase()}</Text>
              <Text style={styles.emptySubtitle}>No expiring memberships in this period</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, {bottom: insets.bottom + 80}]}
        onPress={() => navigation.navigate('RenewStudent', {studentId: students[0]?.id ?? ''})}
        activeOpacity={0.85}>
        <MaterialCommunityIcons name="send" size={22} color="#0B0F0E" />
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
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: '#272b2a',
  },
  chipActive: {backgroundColor: COLORS.primary},
  chipText: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textSecondary},
  chipTextActive: {color: '#0B0F0E'},

  // Critical header
  criticalHeader: {
    marginBottom: SPACING.sm,
  },
  criticalLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  criticalCount: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary},
  criticalNum: {fontSize: 22, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},

  list: {paddingHorizontal: SPACING.md, paddingTop: SPACING.xs},

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},
  cardSub: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},

  // Time badge
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBadgeText: {fontSize: 10, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.5},

  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, marginTop: 60},
  emptyTitle: {fontSize: 18, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginTop: SPACING.md},
  emptySubtitle: {fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm},

  fab: {
    position: 'absolute',
    right: SPACING.md,
    width: 52,
    height: 52,
    borderRadius: 26,
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

export default ExpiryListScreen;
