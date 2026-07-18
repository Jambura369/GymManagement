import React, {useEffect, useState} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, Package} from '../../types';
import {fetchPackages, deletePackage} from '../../services/packageService';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PackageListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {gym, user} = useAuthStore();
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

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

  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  const filteredPackages = packages.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Parse description into feature bullets
  const getFeatures = (pkg: Package): string[] => {
    if (!pkg.description) return [];
    return pkg.description
      .split(/\n|•/)
      .map(f => f.trim())
      .filter(f => f.length > 0)
      .slice(0, 4);
  };

  const getBillingLabel = (pkg: Package): string => {
    switch (pkg.type) {
      case 'Monthly': return 'Monthly';
      case 'Quarterly': return 'Quarterly';
      case 'Half Year': return 'Half-yearly';
      case 'Yearly': return 'Yearly';
      default: return pkg.type;
    }
  };

  const renderPackage = ({item}: {item: Package}) => {
    const features = getFeatures(item);
    const billingLabel = getBillingLabel(item);

    return (
      <View style={[styles.card, !item.is_active && styles.cardInactive]}>
        {/* Top row: name + actions */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardActions}>
            {!item.is_active && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftText}>DRAFT</Text>
              </View>
            )}
            {canManage && (
              <>
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() => navigation.navigate('EditPackage', {packageId: item.id})}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() => {
                    setSelectedPkg(item);
                    setDeleteDialog(true);
                  }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
          <Text style={styles.billingLabel}>/ {billingLabel}</Text>
        </View>

        {/* Feature bullets */}
        {features.length > 0 && (
          <View style={styles.featureList}>
            {features.map((feature, idx) => (
              <View key={idx} style={styles.featureRow}>
                <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.primary} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Duration */}
        <Text style={styles.durationText}>{item.duration_days} days</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Packages</Text>
        <TouchableOpacity hitSlop={8}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search packages..."
          placeholderTextColor={COLORS.textSecondary}
          returnKeyType="search"
        />
        <TouchableOpacity hitSlop={8}>
          <MaterialCommunityIcons name="filter-variant" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredPackages}
          keyExtractor={item => item.id}
          renderItem={renderPackage}
          contentContainerStyle={[styles.list, {paddingBottom: 100 + insets.bottom}]}
          ListEmptyComponent={
            <EmptyState
              icon="package-variant-closed"
              title="No packages"
              subtitle="Create membership packages for your gym"
              isDark={true}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {canManage && (
        <TouchableOpacity
          style={[styles.fab, {bottom: insets.bottom + 68}]}
          onPress={() => navigation.navigate('AddPackage')}
          activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus" size={26} color="#0B0F0E" />
        </TouchableOpacity>
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

  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list: {paddingHorizontal: SPACING.md},

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardInactive: {opacity: 0.6},

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  cardName: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  draftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: '#2a2f2d',
  },
  draftText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  price: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
  },
  billingLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },

  featureList: {gap: 6, marginBottom: SPACING.sm},
  featureRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  featureText: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, flex: 1},

  durationText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

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

export default PackageListScreen;
