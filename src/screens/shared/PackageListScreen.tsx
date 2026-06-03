import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {FAB, Card, Chip, Menu} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList, Package} from '../../types';
import {fetchPackages, deletePackage} from '../../services/packageService';
import AppHeader from '../../components/common/AppHeader';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const PACKAGE_COLORS: Record<string, string> = {
  Monthly: COLORS.primary,
  Quarterly: COLORS.success,
  'Half Year': COLORS.info,
  Yearly: COLORS.warning,
  'Special Category': COLORS.secondary,
};

const PACKAGE_ICONS: Record<string, string> = {
  Monthly: 'calendar-month',
  Quarterly: 'calendar-range',
  'Half Year': 'calendar-multiselect',
  Yearly: 'calendar-star',
  'Special Category': 'star-circle',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FilterType = 'All' | 'Active' | 'Inactive';

const PackageListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {gym, user} = useAuthStore();
  const {isDark} = useThemeStore();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('All');

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;
  const subColor = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    if (!gym) return;
    setLoading(true);
    const result = await fetchPackages(gym.id, false);
    if (result.data) setPackages(result.data);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedPkg) return;
    setDeleting(true);
    const result = await deletePackage(selectedPkg.id);
    setDeleting(false);
    setDeleteDialog(false);
    if (!result.error) {
      Toast.show({type: 'success', text1: 'Package deactivated'});
      load();
    }
  };

  const activeCount = packages.filter(p => p.is_active).length;
  const inactiveCount = packages.length - activeCount;

  const filteredPackages = packages.filter(p => {
    if (filter === 'Active') return p.is_active;
    if (filter === 'Inactive') return !p.is_active;
    return true;
  });

  const renderPackage = ({item}: {item: Package}) => {
    const color = PACKAGE_COLORS[item.type] || COLORS.primary;
    const icon = PACKAGE_ICONS[item.type] || 'package-variant';
    const canManage = user?.role === 'Admin' || user?.role === 'Manager';

    return (
      <Card
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            opacity: item.is_active ? 1 : 0.65,
          },
        ]}>
        <Card.Content style={styles.cardContent}>
          {/* Icon */}
          <View style={[styles.iconBadge, {backgroundColor: color + '18'}]}>
            <MaterialCommunityIcons name={icon} size={24} color={color} />
          </View>

          {/* Info */}
          <View style={styles.pkgInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.pkgName, {color: textColor}]} numberOfLines={1}>
                {item.name}
              </Text>
              {!item.is_active && (
                <View style={[styles.inactivePill, {backgroundColor: COLORS.error + '18'}]}>
                  <Text style={[styles.inactivePillText, {color: COLORS.error}]}>Inactive</Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <View style={[styles.typeBadge, {backgroundColor: color + '15'}]}>
                <Text style={[styles.typeText, {color}]}>{item.type}</Text>
              </View>
              <MaterialCommunityIcons name="circle-small" size={14} color={subColor} />
              <MaterialCommunityIcons name="clock-outline" size={13} color={subColor} />
              <Text style={[styles.durationText, {color: subColor}]}>{item.duration_days} days</Text>
            </View>
          </View>

          {/* Price + Menu */}
          <View style={styles.priceSection}>
            <Text style={[styles.price, {color: COLORS.success}]}>
              ₹{Number(item.price).toLocaleString('en-IN')}
            </Text>
            {canManage && (
              <Menu
                visible={menuId === item.id}
                onDismiss={() => setMenuId(null)}
                anchor={
                  <TouchableOpacity
                    onPress={() => setMenuId(item.id)}
                    style={styles.menuBtn}>
                    <MaterialCommunityIcons
                      name="dots-vertical"
                      size={20}
                      color={subColor}
                    />
                  </TouchableOpacity>
                }>
                <Menu.Item
                  onPress={() => {
                    setMenuId(null);
                    navigation.navigate('EditPackage', {packageId: item.id});
                  }}
                  title="Edit"
                  leadingIcon="pencil"
                />
                {item.is_active && (
                  <Menu.Item
                    onPress={() => {
                      setMenuId(null);
                      setSelectedPkg(item);
                      setDeleteDialog(true);
                    }}
                    title="Deactivate"
                    leadingIcon="package-variant-closed-remove"
                    titleStyle={{color: COLORS.error}}
                  />
                )}
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
        title="Packages"
        subtitle={`${activeCount} active · ${inactiveCount} inactive`}
        onBack={() => navigation.goBack()}
        isDark={isDark}
      />

      {/* Summary Bar */}
      <View style={[styles.summaryBar, {backgroundColor: isDark ? COLORS.cardDark : COLORS.card}]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, {color: COLORS.primary}]}>{packages.length}</Text>
          <Text style={[styles.summaryLabel, {color: subColor}]}>Total</Text>
        </View>
        <View style={[styles.summaryDivider, {backgroundColor: COLORS.border}]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, {color: COLORS.success}]}>{activeCount}</Text>
          <Text style={[styles.summaryLabel, {color: subColor}]}>Active</Text>
        </View>
        <View style={[styles.summaryDivider, {backgroundColor: COLORS.border}]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, {color: COLORS.error}]}>{inactiveCount}</Text>
          <Text style={[styles.summaryLabel, {color: subColor}]}>Inactive</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['All', 'Active', 'Inactive'] as FilterType[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filter === f ? COLORS.primary : isDark ? COLORS.cardDark : COLORS.card,
                borderColor: filter === f ? COLORS.primary : COLORS.border,
              },
            ]}>
            <Text
              style={[
                styles.filterChipText,
                {color: filter === f ? '#FFF' : subColor},
              ]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, {color: subColor}]}>Loading packages...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPackages}
          keyExtractor={item => item.id}
          renderItem={renderPackage}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="package-variant-closed"
              title={filter === 'All' ? 'No packages' : `No ${filter.toLowerCase()} packages`}
              subtitle={
                filter === 'All'
                  ? 'Create membership packages for your gym'
                  : `Switch to "All" to see all packages`
              }
              isDark={isDark}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {(user?.role === 'Admin' || user?.role === 'Manager') && (
        <FAB
          icon="plus"
          style={[styles.fab, {backgroundColor: COLORS.primary}]}
          color="#FFF"
          onPress={() => navigation.navigate('AddPackage')}
        />
      )}

      <ConfirmDialog
        visible={deleteDialog}
        title="Deactivate Package"
        message={`Deactivate "${selectedPkg?.name}"? Members with this package won't be affected.`}
        confirmLabel="Deactivate"
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
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    elevation: 2,
  },
  summaryItem: {flex: 1, alignItems: 'center', paddingVertical: SPACING.xs},
  summaryValue: {fontSize: 20, fontWeight: '800'},
  summaryLabel: {fontSize: 11, fontWeight: '500', marginTop: 2},
  summaryDivider: {width: 1, marginVertical: 4},
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {fontSize: 13, fontWeight: '600'},
  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm},
  loadingText: {fontSize: 14},
  list: {padding: SPACING.md, paddingBottom: 96},
  card: {
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardContent: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pkgInfo: {flex: 1, minWidth: 0},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 4},
  pkgName: {fontSize: 15, fontWeight: '700', flexShrink: 1},
  inactivePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  inactivePillText: {fontSize: 10, fontWeight: '700'},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 2},
  typeBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},
  typeText: {fontSize: 11, fontWeight: '700'},
  durationText: {fontSize: 12},
  priceSection: {alignItems: 'flex-end', gap: 4, flexShrink: 0},
  price: {fontSize: 17, fontWeight: '800'},
  menuBtn: {padding: 4},
  fab: {position: 'absolute', bottom: SPACING.lg, right: SPACING.lg},
});

export default PackageListScreen;
