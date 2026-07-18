import React, {useEffect, useState, useCallback} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import {useExpenseStore} from '../../store/expenseStore';
import {useAuthStore} from '../../store/authStore';
import {EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_ICONS} from '../../constants';
import {COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING} from '../../theme';
import {RootStackParamList, Expense, TrainerSalary} from '../../types';
import {fetchSalaries} from '../../services/salaryService';
import EmptyState from '../../components/common/EmptyState';
import CardSkeleton from '../../components/skeletons/CardSkeleton';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ImageViewerModal from '../../components/common/ImageViewerModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORY_FILTERS = ['All', 'Rent', 'Equipment', 'Electricity', 'Salary'];

type CombinedItem =
  | {kind: 'expense'; data: Expense}
  | {kind: 'salary'; data: TrainerSalary};

type ListItem = CombinedItem | {kind: 'header'; date: string};

const ReceiptThumb: React.FC<{uri: string; catColor: string; catIcon: string; onPress: () => void}> = ({uri, catColor, catIcon, onPress}) => {
  const [imgError, setImgError] = React.useState(false);
  if (imgError) {
    return (
      <View style={[styles.iconBox, {backgroundColor: catColor + '20'}]}>
        <MaterialCommunityIcons name={catIcon} size={22} color={catColor} />
      </View>
    );
  }
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Image source={{uri}} style={styles.receiptThumb} resizeMode="cover" onError={() => setImgError(true)} />
    </TouchableOpacity>
  );
};

const ExpenseListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const {expenses, isLoading, hasMore, fetchExpenses, loadMore, deleteExpense, setFilter} = useExpenseStore();
  const insets = useSafeAreaInsets();

  const [activeCategory, setActiveCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [salaries, setSalaries] = useState<TrainerSalary[]>([]);

  const loadSalaries = useCallback(async () => {
    if (!gym) return;
    const result = await fetchSalaries(gym.id);
    if (result.data) setSalaries(result.data);
  }, [gym]);

  const load = useCallback((reset = true) => {
    if (gym) fetchExpenses(gym.id, reset);
  }, [gym]);

  useEffect(() => {
    load();
    loadSalaries();
  }, []);

  const onCategoryFilter = (cat: string) => {
    setActiveCategory(cat);
    if (cat !== 'Salary') {
      setFilter({category: cat === 'All' ? undefined : (cat as any)});
      load();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchExpenses(gym!.id, true), loadSalaries()]);
    setRefreshing(false);
  };

  const combinedItems: CombinedItem[] = (() => {
    if (activeCategory === 'Salary') {
      return salaries.map(s => ({kind: 'salary', data: s}));
    }
    if (activeCategory === 'All') {
      const all: CombinedItem[] = [
        ...expenses.map(e => ({kind: 'expense' as const, data: e})),
        ...salaries.map(s => ({kind: 'salary' as const, data: s})),
      ];
      return all.sort((a, b) => {
        const dateA = a.kind === 'expense' ? a.data.expense_date : a.data.payment_date;
        const dateB = b.kind === 'expense' ? b.data.expense_date : b.data.payment_date;
        return dayjs(dateB).diff(dayjs(dateA));
      });
    }
    return expenses.map(e => ({kind: 'expense', data: e}));
  })();

  // Group by date with headers
  const listData: ListItem[] = (() => {
    const result: ListItem[] = [];
    let lastDate = '';
    for (const item of combinedItems) {
      const d = item.kind === 'expense' ? item.data.expense_date : item.data.payment_date;
      const dateLabel = dayjs(d).format('MMMM DD, YYYY');
      if (dateLabel !== lastDate) {
        result.push({kind: 'header', date: dateLabel});
        lastDate = dateLabel;
      }
      result.push(item);
    }
    return result;
  })();

  const totalAmount =
    expenses.reduce((s, e) => s + Number(e.amount), 0) +
    (activeCategory === 'All' || activeCategory === 'Salary'
      ? salaries.reduce((s, sal) => s + Number(sal.salary_amount), 0)
      : 0);

  const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const salaryTotal = salaries.reduce((s, sal) => s + Number(sal.salary_amount), 0);

  const handleDelete = async () => {
    if (!selectedExpense) return;
    setDeleting(true);
    const success = await deleteExpense(selectedExpense.id);
    setDeleting(false);
    setDeleteDialog(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Expense deleted'});
    } else {
      Toast.show({type: 'error', text1: 'Failed to delete'});
    }
  };

  const renderItem = ({item}: {item: ListItem}) => {
    if (item.kind === 'header') {
      return <Text style={styles.dateHeader}>{item.date}</Text>;
    }

    if (item.kind === 'salary') {
      const sal = item.data;
      const catColor = EXPENSE_CATEGORY_COLORS.Salary ?? '#9CA3A0';
      const trainerName = (sal.trainer as any)?.name || 'Trainer';
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('EditSalary', {salaryId: sal.id})}
          activeOpacity={0.7}>
          <View style={[styles.iconBox, {backgroundColor: catColor + '20'}]}>
            <MaterialCommunityIcons name="currency-inr" size={22} color={catColor} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>Salary — {trainerName}</Text>
            <Text style={styles.cardSub}>
              Salary • {dayjs(sal.payment_date).format('hh:mm A')}
            </Text>
          </View>
          <Text style={styles.cardAmount}>
            ₹{Number(sal.salary_amount).toLocaleString('en-IN')}
          </Text>
        </TouchableOpacity>
      );
    }

    const expense = item.data;
    const catColor = EXPENSE_CATEGORY_COLORS[expense.category] || COLORS.textSecondary;
    const catIcon = EXPENSE_CATEGORY_ICONS[expense.category] || 'cash';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ExpenseDetail', {expenseId: expense.id})}
        activeOpacity={0.7}>
        {expense.receipt_image ? (
          <ReceiptThumb
            uri={expense.receipt_image}
            catColor={catColor}
            catIcon={catIcon}
            onPress={() => setViewerUri(expense.receipt_image)}
          />
        ) : (
          <View style={[styles.iconBox, {backgroundColor: catColor + '20'}]}>
            <MaterialCommunityIcons name={catIcon} size={22} color={catColor} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{expense.title}</Text>
          <Text style={styles.cardSub}>
            {expense.category} • {dayjs(expense.created_at).format('hh:mm A')}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>
            ₹{Number(expense.amount).toLocaleString('en-IN')}
          </Text>
          {expense.receipt_image ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          ) : (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>PENDING</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Expenses</Text>
        <TouchableOpacity hitSlop={8}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsArea}>
        <View style={styles.statMain}>
          <Text style={styles.statMainLabel}>TOTAL OUTFLOW</Text>
          <Text style={styles.statMainValue}>
            ₹{totalAmount.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statSmall}>
            <Text style={styles.statSmallLabel}>EXPENSES</Text>
            <Text style={styles.statSmallValue}>₹{expenseTotal.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.statSmall, {marginLeft: SPACING.sm}]}>
            <Text style={styles.statSmallLabel}>SALARIES</Text>
            <Text style={styles.statSmallValue}>₹{salaryTotal.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>

      {/* Category filter chips */}
      <View style={styles.filterRow}>
        {CATEGORY_FILTERS.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => onCategoryFilter(cat)}
              activeOpacity={0.75}
              style={[styles.chip, isActive && styles.chipActive]}>
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading && combinedItems.length === 0 ? (
        <CardSkeleton count={5} isDark />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, idx) =>
            item.kind === 'header'
              ? `header-${item.date}`
              : `${item.kind}-${item.data.id}`
          }
          renderItem={renderItem}
          contentContainerStyle={[styles.list, {paddingBottom: 140 + insets.bottom}]}
          ListEmptyComponent={
            <EmptyState
              icon="cash-remove"
              title="No expenses yet"
              subtitle="Track your gym expenses here"
              actionLabel="Add Expense"
              onAction={() => navigation.navigate('AddExpense')}
              isDark={true}
            />
          }
          onEndReached={() => activeCategory !== 'Salary' && hasMore && gym && loadMore(gym.id)}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {(user?.role === 'Admin' || user?.role === 'Manager') && (
        <TouchableOpacity
          style={[styles.fab, {bottom: insets.bottom + 68}]}
          onPress={() => navigation.navigate('AddExpense')}
          activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus" size={20} color="#0B0F0E" />
          <Text style={styles.fabText}>Add Expense</Text>
        </TouchableOpacity>
      )}

      <ConfirmDialog
        visible={deleteDialog}
        title="Delete Expense"
        message={`Delete "${selectedExpense?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(false)}
        confirmColor={COLORS.error}
        loading={deleting}
      />

      <ImageViewerModal
        visible={!!viewerUri}
        uri={viewerUri}
        onClose={() => setViewerUri(null)}
      />
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
  headerTitle: {fontSize: 24, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},

  // Stats
  statsArea: {paddingHorizontal: SPACING.md, marginBottom: SPACING.sm},
  statMain: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statMainLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statMainValue: {fontSize: 32, fontWeight: '800', color: COLORS.primary},
  statRow: {flexDirection: 'row'},
  statSmall: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  statSmallLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statSmallValue: {fontSize: 18, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 6,
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
  chipText: {fontSize: 11, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textSecondary},
  chipTextActive: {color: '#0B0F0E', fontWeight: FONT_WEIGHT.bold},

  // List
  list: {paddingHorizontal: SPACING.md},
  dateHeader: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptThumb: {width: 44, height: 44, borderRadius: RADIUS.md},
  cardInfo: {flex: 1},
  cardTitle: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  cardSub: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},
  cardRight: {alignItems: 'flex-end', gap: 4},
  cardAmount: {fontSize: 15, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},
  verifiedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary + '25',
  },
  verifiedText: {fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary, letterSpacing: 0.4},
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: '#eab30825',
  },
  pendingText: {fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: '#eab308', letterSpacing: 0.4},

  // FAB
  fab: {
    position: 'absolute',
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {fontSize: 14, fontWeight: FONT_WEIGHT.bold, color: '#0B0F0E'},
});

export default ExpenseListScreen;
