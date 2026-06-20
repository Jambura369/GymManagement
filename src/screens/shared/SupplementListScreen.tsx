import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {FAB, Card, Menu} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {useFeature} from '../../hooks/useFeature';
import {useSupplementStore} from '../../store/supplementStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList, Supplement} from '../../types';
import AppHeader from '../../components/common/AppHeader';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SupplementListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {gym, user} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();
  const {hasAccess} = useFeature('supplement_stock');
  const {supplements, isLoading, fetchSupplements, setSearch, deleteSupplement} = useSupplementStore();

  const [search, setLocalSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selected, setSelected] = useState<Supplement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;
  const subColor = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    if (!hasAccess) {
      navigation.replace('FeatureLocked', {
        featureName: 'Supplement Stock',
        featureIcon: 'pill',
        requiredPlan: 'professional',
        description: 'Track supplement inventory and sales with the Professional plan.',
      });
    }
  }, [hasAccess, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (hasAccess && gym) fetchSupplements(gym.id);
    }, [hasAccess, gym]),
  );

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

  const totalStockValue = supplements.reduce(
    (sum, s) => sum + s.quantity * Number(s.selling_price),
    0,
  );
  const lowStockCount = supplements.filter(s => s.quantity <= s.low_stock_threshold).length;

  const renderItem = ({item}: {item: Supplement}) => {
    const isLowStock = item.quantity <= item.low_stock_threshold;
    const stockColor = item.quantity === 0 ? COLORS.error : isLowStock ? COLORS.warning : COLORS.success;

    return (
      <Card style={[styles.card, {backgroundColor: cardBg}]}>
        <Card.Content style={styles.cardContent}>
          <TouchableOpacity
            style={styles.mainArea}
            onPress={() => canManage && navigation.navigate('EditSupplement', {supplementId: item.id})}
            disabled={!canManage}>
            <View style={[styles.iconContainer, {backgroundColor: stockColor + '20'}]}>
              <MaterialCommunityIcons name="pill" size={22} color={stockColor} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, {color: textColor}]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.stockText, {color: stockColor}]}>
                  {item.quantity} {item.unit} in stock
                </Text>
                {isLowStock && (
                  <View style={[styles.lowStockBadge, {backgroundColor: COLORS.warning + '20'}]}>
                    <Text style={[styles.lowStockText, {color: COLORS.warning}]}>Low</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.price, {color: subColor}]}>
                ₹{Number(item.selling_price).toLocaleString('en-IN')} / {item.unit}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, {backgroundColor: COLORS.success + '18'}]}
              onPress={() => navigation.navigate('StockTransaction', {supplementId: item.id, mode: 'add'})}>
              <MaterialCommunityIcons name="plus" size={18} color={COLORS.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, {backgroundColor: COLORS.error + '18'}]}
              onPress={() => navigation.navigate('StockTransaction', {supplementId: item.id, mode: 'sell'})}
              disabled={item.quantity === 0}>
              <MaterialCommunityIcons name="cart-outline" size={18} color={item.quantity === 0 ? COLORS.placeholder : COLORS.error} />
            </TouchableOpacity>
            {canManage && (
              <Menu
                visible={menuId === item.id}
                onDismiss={() => setMenuId(null)}
                anchor={
                  <TouchableOpacity onPress={() => setMenuId(item.id)} style={styles.menuBtn}>
                    <MaterialCommunityIcons name="dots-vertical" size={18} color={subColor} />
                  </TouchableOpacity>
                }>
                <Menu.Item
                  onPress={() => {
                    setMenuId(null);
                    navigation.navigate('EditSupplement', {supplementId: item.id});
                  }}
                  title="Edit"
                  leadingIcon="pencil"
                />
                <Menu.Item
                  onPress={() => {
                    setMenuId(null);
                    setSelected(item);
                    setDeleteDialog(true);
                  }}
                  title="Remove"
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

  if (!hasAccess) return null;

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      <AppHeader
        title="Supplement Stock"
        subtitle={`₹${totalStockValue.toLocaleString('en-IN')} stock value · ${lowStockCount} low`}
        onBack={() => navigation.goBack()}
        isDark={isDark}
      />

      <SearchBar
        value={search}
        onChangeText={onSearchChange}
        placeholder="Search supplements..."
        isDark={isDark}
      />

      {isLoading && supplements.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={supplements}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, {paddingBottom: 96 + insets.bottom}]}
          ListEmptyComponent={
            <EmptyState
              icon="pill"
              title="No supplements yet"
              subtitle="Add protein, vitamins and other supplements to track stock"
              actionLabel={canManage ? 'Add Supplement' : undefined}
              onAction={canManage ? () => navigation.navigate('AddSupplement') : undefined}
              isDark={isDark}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {canManage && (
        <FAB
          icon="plus"
          style={[styles.fab, {backgroundColor: COLORS.primary, bottom: insets.bottom + SPACING.lg}]}
          color="#FFF"
          onPress={() => navigation.navigate('AddSupplement')}
        />
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
  container: {flex: 1},
  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list: {padding: SPACING.md},
  card: {borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.sm, elevation: 2},
  cardContent: {flexDirection: 'row', alignItems: 'center', gap: SPACING.xs},
  mainArea: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {flex: 1, minWidth: 0},
  name: {fontSize: 15, fontWeight: '600', marginBottom: 3},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 2},
  stockText: {fontSize: 12, fontWeight: '600'},
  lowStockBadge: {paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8},
  lowStockText: {fontSize: 10, fontWeight: '700'},
  price: {fontSize: 12},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 6},
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtn: {padding: 2},
  fab: {position: 'absolute', bottom: SPACING.lg, right: SPACING.lg},
});

export default SupplementListScreen;
