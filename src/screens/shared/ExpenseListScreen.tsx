import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {FAB, Card, Menu} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import {useExpenseStore} from '../../store/expenseStore';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_ICONS,
} from '../../constants';
import {RootStackParamList, Expense} from '../../types';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import CardSkeleton from '../../components/skeletons/CardSkeleton';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AppHeader from '../../components/common/AppHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORY_FILTERS = ['All', 'Rent', 'Electricity', 'Equipment', 'Maintenance', 'Marketing', 'Misc'];

const ExpenseListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const {
    expenses,
    total,
    isLoading,
    isLoadingMore: _isLoadingMore,
    hasMore,
    fetchExpenses,
    loadMore,
    deleteExpense,
    setFilter,
  } = useExpenseStore();

  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const load = useCallback(
    (reset = true) => {
      if (gym) fetchExpenses(gym.id, reset);
    },
    [gym],
  );

  useEffect(() => {
    load();
  }, []);

  const onSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilter({search: text});
      load();
    }, 350);
  };

  const onCategoryFilter = (cat: string) => {
    setActiveCategory(cat);
    setFilter({category: cat === 'All' ? undefined : (cat as any)});
    load();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExpenses(gym!.id, true);
    setRefreshing(false);
  };

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

  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const renderExpense = ({item}: {item: Expense}) => {
    const catColor = EXPENSE_CATEGORY_COLORS[item.category] || COLORS.textSecondary;
    const catIcon = EXPENSE_CATEGORY_ICONS[item.category] || 'cash';

    return (
      <Card
        style={[styles.card, {backgroundColor: cardBg}]}
        onPress={() =>
          navigation.navigate('EditExpense', {expenseId: item.id})
        }>
        <Card.Content style={styles.cardContent}>
          <View
            style={[styles.iconContainer, {backgroundColor: catColor + '20'}]}>
            <MaterialCommunityIcons name={catIcon} size={22} color={catColor} />
          </View>
          <View style={styles.expenseInfo}>
            <Text style={[styles.title, {color: textColor}]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.categoryBadge, {backgroundColor: catColor + '20'}]}>
                <Text style={[styles.categoryText, {color: catColor}]}>{item.category}</Text>
              </View>
              <Text style={[styles.date, {color: COLORS.textSecondary}]}>
                {dayjs(item.expense_date).format('DD MMM YYYY')}
              </Text>
            </View>
          </View>
          <View style={styles.amountContainer}>
            <Text style={[styles.amount, {color: COLORS.error}]}>
              ₹{Number(item.amount).toLocaleString('en-IN')}
            </Text>
            {(user?.role === 'Admin' || user?.role === 'Manager') && (
              <Menu
                visible={menuId === item.id}
                onDismiss={() => setMenuId(null)}
                anchor={
                  <TouchableOpacity onPress={() => setMenuId(item.id)}>
                    <MaterialCommunityIcons
                      name="dots-vertical"
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                }>
                <Menu.Item
                  onPress={() => {
                    setMenuId(null);
                    navigation.navigate('EditExpense', {expenseId: item.id});
                  }}
                  title="Edit"
                  leadingIcon="pencil"
                />
                <Menu.Item
                  onPress={() => {
                    setMenuId(null);
                    setSelectedExpense(item);
                    setDeleteDialog(true);
                  }}
                  title="Delete"
                  leadingIcon="delete"
                  titleStyle={{color: COLORS.error}}
                />
              </Menu>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      <AppHeader
        title="Expenses"
        subtitle={`Total: ₹${totalAmount.toLocaleString('en-IN')}`}
        isDark={isDark}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
            <MaterialCommunityIcons
              name="chart-bar"
              size={24}
              color={isDark ? COLORS.textDark : COLORS.text}
            />
          </TouchableOpacity>
        }
      />

      <SearchBar
        value={search}
        onChangeText={onSearchChange}
        placeholder="Search expenses..."
        isDark={isDark}
      />

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}>
        {CATEGORY_FILTERS.map(cat => {
          const isActive = activeCategory === cat;
          const activeColor =
            cat === 'All'
              ? COLORS.primary
              : EXPENSE_CATEGORY_COLORS[cat] || COLORS.primary;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => onCategoryFilter(cat)}
              activeOpacity={0.75}
              style={[
                styles.filterTab,
                isActive
                  ? {backgroundColor: activeColor, borderColor: activeColor}
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
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading && expenses.length === 0 ? (
        <CardSkeleton count={5} isDark={isDark} />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={item => item.id}
          renderItem={renderExpense}
          contentContainerStyle={[styles.list, {paddingBottom: 80 + insets.bottom}]}
          ListEmptyComponent={
            <EmptyState
              icon="cash-remove"
              title="No expenses yet"
              subtitle="Track your gym expenses here"
              actionLabel="Add Expense"
              onAction={() => navigation.navigate('AddExpense')}
              isDark={isDark}
            />
          }
          onEndReached={() => hasMore && gym && loadMore(gym.id)}
          onEndReachedThreshold={0.3}
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

      {(user?.role === 'Admin' || user?.role === 'Manager') && (
        <FAB
          icon="plus"
          style={[styles.fab, {backgroundColor: COLORS.error}]}
          color="#FFF"
          onPress={() => navigation.navigate('AddExpense')}
        />
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
  filterTabText: {fontSize: 13},
  list: {padding: SPACING.md},
  card: {borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.sm, elevation: 2},
  cardContent: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {flex: 1},
  title: {fontSize: 15, fontWeight: '600', marginBottom: 4},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.xs},
  categoryBadge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10},
  categoryText: {fontSize: 10, fontWeight: '600'},
  date: {fontSize: 11},
  amountContainer: {alignItems: 'flex-end', gap: 4},
  amount: {fontSize: 16, fontWeight: '700'},
  fab: {position: 'absolute', bottom: SPACING.lg, right: SPACING.lg, elevation: 4},
});

export default ExpenseListScreen;
