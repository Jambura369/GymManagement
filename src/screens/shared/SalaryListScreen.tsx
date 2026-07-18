import React, {useCallback, useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  TextInput,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, TrainerSalary} from '../../types';
import {fetchSalaries} from '../../services/salaryService';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';
import EmptyState from '../../components/common/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type FilterType = 'All' | 'Cash' | 'Bank Transfer' | 'UPI';
const FILTERS: FilterType[] = ['All', 'Cash', 'Bank Transfer', 'UPI'];

const SalaryListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {gym, user} = useAuthStore();
  const insets = useSafeAreaInsets();

  const [salaries, setSalaries] = useState<TrainerSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');

  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  const load = useCallback(async () => {
    if (!gym) return;
    setLoading(true);
    const result = await fetchSalaries(gym.id);
    if (result.data) setSalaries(result.data);
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

  const totalPaid = salaries.reduce((sum, s) => sum + Number(s.salary_amount), 0);
  const thisMonthStart = dayjs().startOf('month').format('YYYY-MM-DD');
  const thisMonthEnd = dayjs().endOf('month').format('YYYY-MM-DD');
  const thisMonthTotal = salaries
    .filter(s => s.payment_date >= thisMonthStart && s.payment_date <= thisMonthEnd)
    .reduce((sum, s) => sum + Number(s.salary_amount), 0);
  const trainerCount = new Set(salaries.map(s => s.trainer_id)).size;

  const filtered = salaries.filter(s => {
    const matchesFilter = filter === 'All' || s.payment_type === filter;
    const matchesSearch =
      !search ||
      (s.trainer?.name || '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderItem = ({item}: {item: TrainerSalary}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('TrainerPaymentHistory', {
          trainerId: item.trainer_id,
          trainerName: item.trainer?.name || 'Trainer',
        })
      }
      activeOpacity={0.8}>
      {/* Avatar */}
      <AvatarWithFallback
        uri={item.trainer?.avatar ?? null}
        name={item.trainer?.name || 'T'}
        size={44}
      />

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.trainerName} numberOfLines={1}>
          {item.trainer?.name || 'Unknown'}
        </Text>
        <Text style={styles.cardMeta}>
          {dayjs(item.payment_date).format('MMMM YYYY')} · {item.payment_type}
        </Text>
        {item.payer?.name ? (
          <Text style={styles.cardPaidBy}>Paid by {item.payer.name}</Text>
        ) : null}
      </View>

      {/* Amount + actions */}
      <View style={styles.cardRight}>
        <Text style={styles.cardAmount}>
          ₹{Number(item.salary_amount).toLocaleString('en-IN')}
        </Text>
        <View style={styles.paidBadge}>
          <Text style={styles.paidBadgeText}>PAID</Text>
        </View>
      </View>

      {canManage && (
        <TouchableOpacity
          hitSlop={8}
          onPress={() => navigation.navigate('EditSalary', {salaryId: item.id})}>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={16}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trainer Salaries</Text>
        <TouchableOpacity hitSlop={8}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Stat tiles */}
      <View style={styles.statRow}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>TOTAL OUTFLOW</Text>
          <Text style={styles.statAmountBig}>
            ₹{totalPaid.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.statRight}>
          <View style={[styles.statTile, styles.statTileSmall]}>
            <Text style={styles.statLabel}>THIS MONTH</Text>
            <Text style={styles.statValue}>
              ₹{thisMonthTotal.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={[styles.statTile, styles.statTileSmall]}>
            <Text style={styles.statLabel}>TRAINERS</Text>
            <Text style={styles.statValue}>{trainerCount}</Text>
          </View>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search trainer..."
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            {paddingBottom: (canManage ? 140 : 24) + insets.bottom},
          ]}
          ListEmptyComponent={
            <EmptyState
              icon="cash-remove"
              title="No salary records"
              subtitle="Salary payments will appear here"
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
      )}

      {canManage && (
        <TouchableOpacity
          style={[styles.fab, {bottom: insets.bottom + 68}]}
          onPress={() => navigation.navigate('AddSalary')}
          activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus" size={22} color="#0B0F0E" />
          <Text style={styles.fabText}>Add Salary</Text>
        </TouchableOpacity>
      )}
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
    paddingBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },

  // Stat tiles
  statRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statTile: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flex: 1,
  },
  statRight: {
    flex: 1,
    gap: SPACING.sm,
  },
  statTileSmall: {
    flex: 0,
    paddingVertical: SPACING.sm,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statAmountBig: {
    fontSize: 28,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.primary,
    lineHeight: 34,
  },
  statValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  // Search
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

  // Filter chips
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
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
  },
  chipTextActive: {color: '#0B0F0E', fontWeight: FONT_WEIGHT.bold},

  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list: {paddingHorizontal: SPACING.md},

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  cardInfo: {flex: 1},
  trainerName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  cardPaidBy: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardRight: {alignItems: 'flex-end', gap: 6},
  cardAmount: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  paidBadge: {
    backgroundColor: COLORS.success + '20',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.success,
    letterSpacing: 0.3,
  },

  // FAB
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

export default SalaryListScreen;
