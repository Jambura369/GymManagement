import React, {useCallback, useRef, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Menu} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {useFeature} from '../../hooks/useFeature';
import {useSupplementStore} from '../../store/supplementStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, Supplement} from '../../types';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SupplementListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {gym, user} = useAuthStore();
  const insets = useSafeAreaInsets();
  const {hasAccess} = useFeature('supplement_stock');
  const {supplements, isLoading, fetchSupplements, setSearch, deleteSupplement} = useSupplementStore();

  const [search, setLocalSearch] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<TextInput>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selected, setSelected] = useState<Supplement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  useFocusEffect(
    useCallback(() => {
      if (hasAccess && gym) fetchSupplements(gym.id);
    }, [hasAccess, gym]),
  );

  const toggleSearch = () => {
    if (searchVisible) {
      setLocalSearch('');
      if (gym) setSearch(gym.id, '');
      setSearchVisible(false);
    } else {
      setSearchVisible(true);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  };

  const onSearchChange = (text: string) => {
    setLocalSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (gym) setSearch(gym.id, text);
    }, 350);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    const success = await deleteSupplement(selected.id);
    setDeleting(false);
    setDeleteDialog(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Supplement removed'});
    } else {
      Toast.show({type: 'error', text1: 'Failed to remove'});
    }
  };

  const totalSKU = supplements.length;
  const lowStockCount = supplements.filter(s => s.quantity <= s.low_stock_threshold).length;
  const totalStockValue = supplements.reduce(
    (sum, s) => sum + s.quantity * Number(s.selling_price),
    0,
  );

  const renderItem = ({item, index}: {item: Supplement; index: number}) => {
    const isLowStock = item.quantity <= item.low_stock_threshold;
    const isOutOfStock = item.quantity === 0;
    const stockColor = isOutOfStock ? COLORS.error : isLowStock ? COLORS.warning : COLORS.success;
    const isLeft = index % 2 === 0;

    return (
      <TouchableOpacity
        style={[styles.card, {marginLeft: isLeft ? 0 : SPACING.sm / 2, marginRight: isLeft ? SPACING.sm / 2 : 0}]}
        onPress={() => navigation.navigate('StockTransaction', {supplementId: item.id, mode: 'sell'})}
        onLongPress={() => {
          if (canManage) navigation.navigate('EditSupplement', {supplementId: item.id});
        }}
        activeOpacity={0.75}>
        <View style={styles.cardTop}>
          <View style={[styles.iconCircle, {backgroundColor: stockColor + '20'}]}>
            <MaterialCommunityIcons name="pill" size={20} color={stockColor} />
          </View>
          {canManage && (
            <Menu
              visible={menuId === item.id}
              onDismiss={() => setMenuId(null)}
              anchor={
                <TouchableOpacity onPress={() => setMenuId(item.id)} hitSlop={8}>
                  <MaterialCommunityIcons name="dots-vertical" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              }>
              <Menu.Item
                onPress={() => { setMenuId(null); navigation.navigate('EditSupplement', {supplementId: item.id}); }}
                title="Edit"
                leadingIcon="pencil"
              />
              <Menu.Item
                onPress={() => { setMenuId(null); setSelected(item); setDeleteDialog(true); }}
                title="Remove"
                leadingIcon="delete"
                titleStyle={{color: COLORS.error}}
              />
            </Menu>
          )}
        </View>

        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        {item.category ? (
          <Text style={styles.cardCategory} numberOfLines={1}>{item.category}</Text>
        ) : null}

        <View style={styles.cardBottom}>
          <Text style={[styles.cardStock, {color: stockColor}]}>
            {item.quantity} {item.unit}
          </Text>
          {isLowStock && (
            <View style={[styles.lowBadge, {backgroundColor: stockColor + '20'}]}>
              <Text style={[styles.lowBadgeText, {color: stockColor}]}>
                {isOutOfStock ? 'OUT' : 'LOW'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.cardPrice}>₹{Number(item.selling_price).toLocaleString('en-IN')}</Text>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.cardActionBtn, {backgroundColor: COLORS.success + '18'}]}
            onPress={() => navigation.navigate('StockTransaction', {supplementId: item.id, mode: 'add'})}>
            <MaterialCommunityIcons name="plus" size={14} color={COLORS.success} />
            <Text style={[styles.cardActionText, {color: COLORS.success}]}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardActionBtn, {backgroundColor: COLORS.error + '18', opacity: item.quantity === 0 ? 0.4 : 1}]}
            onPress={() => navigation.navigate('StockTransaction', {supplementId: item.id, mode: 'sell'})}
            disabled={item.quantity === 0}>
            <MaterialCommunityIcons name="cart-outline" size={14} color={COLORS.error} />
            <Text style={[styles.cardActionText, {color: COLORS.error}]}>Sell</Text>
          </TouchableOpacity>
        </View>
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Supplement Stock</Text>
          <Text style={styles.headerSub}>₹{totalStockValue.toLocaleString('en-IN')} total value</Text>
        </View>
        <TouchableOpacity onPress={toggleSearch} style={styles.iconBtn} hitSlop={8}>
          <MaterialCommunityIcons
            name={searchVisible ? 'close' : 'magnify'}
            size={22}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Stat pills */}
      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <MaterialCommunityIcons name="package-variant" size={16} color={COLORS.primary} />
          <Text style={styles.statLabel}>Total SKU</Text>
          <Text style={[styles.statValue, {color: COLORS.primary}]}>{totalSKU}</Text>
        </View>
        <View style={[styles.statPill, lowStockCount > 0 && {borderColor: COLORS.warning + '40'}]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={lowStockCount > 0 ? COLORS.warning : COLORS.textSecondary} />
          <Text style={styles.statLabel}>Low Stock</Text>
          <Text style={[styles.statValue, {color: lowStockCount > 0 ? COLORS.warning : COLORS.textSecondary}]}>{lowStockCount.toString().padStart(2, '0')}</Text>
        </View>
      </View>

      {/* Search */}
      {searchVisible && (
        <View style={styles.searchRow}>
          <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search supplements..."
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

      {isLoading && supplements.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={supplements}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[styles.list, {paddingBottom: 100 + insets.bottom}]}
          ListEmptyComponent={
            <EmptyState
              icon="pill"
              title="No supplements yet"
              subtitle="Add protein, vitamins and other supplements to track stock"
              actionLabel={canManage ? 'Add Supplement' : undefined}
              onAction={canManage ? () => navigation.navigate('AddSupplement') : undefined}
              isDark={true}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom action bar */}
      {canManage && (
        <View style={[styles.bottomBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
          <TouchableOpacity
            style={styles.bottomBtnSecondary}
            onPress={() => navigation.navigate('StockTransaction', {supplementId: supplements[0]?.id || '', mode: 'add'})}
            disabled={supplements.length === 0}>
            <MaterialCommunityIcons name="swap-horizontal" size={18} color={COLORS.textPrimary} />
            <Text style={styles.bottomBtnSecondaryText}>Stock Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomBtnPrimary}
            onPress={() => navigation.navigate('AddSupplement')}>
            <MaterialCommunityIcons name="plus" size={18} color="#0B0F0E" />
            <Text style={styles.bottomBtnPrimaryText}>Add Supplement</Text>
          </TouchableOpacity>
        </View>
      )}

      <ConfirmDialog
        visible={deleteDialog}
        title="Remove Supplement"
        message={`Remove "${selected?.name}" from inventory?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(false)}
        confirmColor={COLORS.error}
        loading={deleting}
      />
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
  headerCenter: {flex: 1},
  headerTitle: {fontSize: 20, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},
  headerSub: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},
  iconBtn: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},

  statRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statLabel: {flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: '600'},
  statValue: {fontSize: 16, fontWeight: FONT_WEIGHT.bold},

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 42,
  },
  searchInput: {flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, padding: 0},

  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  list: {paddingHorizontal: SPACING.md, paddingTop: SPACING.xs},
  columnWrapper: {gap: SPACING.sm, marginBottom: SPACING.sm},

  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    elevation: 2,
  },
  cardTop: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.sm},
  iconCircle: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  cardName: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 2},
  cardCategory: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING.sm},
  cardBottom: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.xs},
  cardStock: {fontSize: 13, fontWeight: '700'},
  lowBadge: {paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4},
  lowBadgeText: {fontSize: 9, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.5},
  cardPrice: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2, marginBottom: SPACING.sm},
  cardActions: {flexDirection: 'row', gap: SPACING.xs},
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  cardActionText: {fontSize: 11, fontWeight: FONT_WEIGHT.bold},

  bottomBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  bottomBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bottomBtnSecondaryText: {fontSize: 13, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  bottomBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  bottomBtnPrimaryText: {fontSize: 13, fontWeight: FONT_WEIGHT.bold, color: '#0B0F0E'},
});

export default SupplementListScreen;
