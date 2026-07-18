import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {useSupplementStore} from '../../store/supplementStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';

const CATEGORIES = ['Protein', 'Pre-Workout', 'Creatine', 'BCAA', 'Vitamins', 'Accessories', 'Other'];
const UNITS = ['pcs', 'kg', 'g', 'bottle', 'pack', 'scoop'];

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  category: z.string().optional(),
  unit: z.string().optional(),
  cost_price: z.number().optional(),
  selling_price: z.number().min(1, 'Selling price required'),
  quantity: z.number().min(0, 'Quantity required'),
  low_stock_threshold: z.number().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const AddSupplementScreen: React.FC = () => {
  const navigation = useNavigation();
  const {gym} = useAuthStore();
  const {addSupplement} = useSupplementStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [lowStockEnabled, setLowStockEnabled] = useState(true);

  const {control, handleSubmit, setValue, watch, formState: {errors}} = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: 'Protein',
      unit: 'pcs',
      cost_price: undefined,
      selling_price: 0,
      quantity: 0,
      low_stock_threshold: 5,
      description: '',
    },
  });

  const selectedCategory = watch('category');
  const selectedUnit = watch('unit');
  const quantity = watch('quantity');

  const stepQuantity = (delta: number) => {
    const current = quantity || 0;
    const next = Math.max(0, current + delta);
    setValue('quantity', next);
  };

  const onSubmit = async (data: FormData) => {
    if (!gym) return;
    setLoading(true);
    const success = await addSupplement(gym.id, {
      ...data,
      low_stock_threshold: lowStockEnabled ? (data.low_stock_threshold ?? 5) : 0,
    });
    setLoading(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Supplement Added!'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed to add supplement'});
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: COLORS.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="Add Supplement" onBack={() => navigation.goBack()} isDark />

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Product Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRODUCT DETAILS</Text>
          <Controller
            control={control}
            name="name"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Product Name *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({field: {onChange, value}}) => (
              <AppInput
                label="Description (Optional)"
                value={value || ''}
                onChangeText={onChange}
                multiline
                numberOfLines={2}
              />
            )}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CATEGORY</Text>
          <View style={styles.chipWrap}>
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, isActive && {backgroundColor: COLORS.primary}]}
                  onPress={() => setValue('category', cat)}
                  activeOpacity={0.75}>
                  <Text style={[styles.chipText, {color: isActive ? '#0B0F0E' : COLORS.textSecondary}]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRICING</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceHalf}>
              <Controller
                control={control}
                name="cost_price"
                render={({field: {onChange, value}}) => (
                  <AppInput
                    label="Cost Price (₹)"
                    value={value?.toString() || ''}
                    onChangeText={t => onChange(t ? Number(t) : undefined)}
                    keyboardType="numeric"
                  />
                )}
              />
            </View>
            <View style={styles.priceHalf}>
              <Controller
                control={control}
                name="selling_price"
                render={({field: {onChange, value}}) => (
                  <AppInput
                    label="Selling Price (₹) *"
                    value={value?.toString()}
                    onChangeText={t => onChange(Number(t) || 0)}
                    keyboardType="numeric"
                    error={errors.selling_price?.message}
                  />
                )}
              />
            </View>
          </View>
        </View>

        {/* Unit & Quantity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UNIT</Text>
          <View style={styles.chipWrap}>
            {UNITS.map(u => {
              const isActive = selectedUnit === u;
              return (
                <TouchableOpacity
                  key={u}
                  style={[styles.chip, isActive && {backgroundColor: COLORS.primary}]}
                  onPress={() => setValue('unit', u)}
                  activeOpacity={0.75}>
                  <Text style={[styles.chipText, {color: isActive ? '#0B0F0E' : COLORS.textSecondary}]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, {marginTop: SPACING.md}]}>Initial Stock Quantity</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => stepQuantity(-1)}
              disabled={quantity <= 0}>
              <MaterialCommunityIcons
                name="minus"
                size={20}
                color={quantity <= 0 ? COLORS.textSecondary : COLORS.textPrimary}
              />
            </TouchableOpacity>
            <View style={styles.stepValue}>
              <Text style={styles.stepValueText}>{quantity}</Text>
              <Text style={styles.stepUnit}>{selectedUnit}</Text>
            </View>
            <TouchableOpacity style={styles.stepBtn} onPress={() => stepQuantity(1)}>
              <MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Inventory Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INVENTORY STATUS</Text>
          <View style={styles.toggleRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.warning} />
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Low Stock Alert</Text>
              <Text style={styles.toggleSub}>Get notified when stock runs low</Text>
            </View>
            <Switch
              value={lowStockEnabled}
              onValueChange={setLowStockEnabled}
              trackColor={{false: COLORS.surface, true: COLORS.primary + '80'}}
              thumbColor={lowStockEnabled ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          {lowStockEnabled && (
            <Controller
              control={control}
              name="low_stock_threshold"
              render={({field: {onChange, value}}) => (
                <AppInput
                  label={`Alert when below (${selectedUnit})`}
                  value={value?.toString() || ''}
                  onChangeText={t => onChange(t ? Number(t) : undefined)}
                  keyboardType="numeric"
                  style={{marginTop: SPACING.sm}}
                />
              )}
            />
          )}
        </View>

        <AppButton
          title="Save Product"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          icon="content-save"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md},

  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },

  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {fontSize: 13, fontWeight: FONT_WEIGHT.semiBold},

  priceRow: {flexDirection: 'row', gap: SPACING.sm},
  priceHalf: {flex: 1},

  fieldLabel: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600', marginBottom: SPACING.sm},

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {flex: 1, alignItems: 'center'},
  stepValueText: {fontSize: 22, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},
  stepUnit: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary},

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toggleInfo: {flex: 1},
  toggleLabel: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  toggleSub: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},
});

export default AddSupplementScreen;
