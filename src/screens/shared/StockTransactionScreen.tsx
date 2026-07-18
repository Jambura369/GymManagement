import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import {useAuthStore} from '../../store/authStore';
import {useSupplementStore} from '../../store/supplementStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, Supplement, SupplementTransaction} from '../../types';
import {getSupplement, recordStockTransaction, fetchSupplementTransactions} from '../../services/supplementService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';

dayjs.extend(relativeTime);

const schema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  price_per_unit: z.number().min(0, 'Price required'),
  transaction_date: z.string(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type Route = RouteProp<RootStackParamList, 'StockTransaction'>;

const StockTransactionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const {gym, user} = useAuthStore();
  const {adjustLocalQuantity} = useSupplementStore();
  const insets = useSafeAreaInsets();

  const {supplementId} = route.params;
  const initialMode = route.params.mode === 'sell' ? 'out' : 'in';

  const [mode, setMode] = useState<'in' | 'out'>(initialMode);
  const [supplement, setSupplement] = useState<Supplement | null>(null);
  const [recentTxns, setRecentTxns] = useState<SupplementTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const isSell = mode === 'out';
  const accentColor = isSell ? COLORS.error : COLORS.success;

  const {control, handleSubmit, setValue, watch, reset, formState: {errors}} = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      quantity: 1,
      price_per_unit: 0,
      transaction_date: dayjs().format('YYYY-MM-DD'),
      notes: '',
    },
  });

  const quantity = watch('quantity');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (supplement) {
      setValue('price_per_unit', Number(isSell ? supplement.selling_price : supplement.cost_price ?? 0));
    }
  }, [mode, supplement]);

  const loadData = async () => {
    const [supRes, txnRes] = await Promise.all([
      getSupplement(supplementId),
      gym ? fetchSupplementTransactions(gym.id, supplementId) : Promise.resolve({data: null, error: null}),
    ]);
    if (supRes.data) {
      setSupplement(supRes.data);
      setValue('price_per_unit', Number(initialMode === 'out' ? supRes.data.selling_price : supRes.data.cost_price ?? 0));
    }
    if (txnRes.data) setRecentTxns(txnRes.data.slice(0, 5));
  };

  const stepQuantity = (delta: number) => {
    const current = quantity || 0;
    const max = isSell ? (supplement?.quantity ?? 999) : 9999;
    setValue('quantity', Math.max(1, Math.min(max, current + delta)));
  };

  const onSubmit = async (data: FormData) => {
    if (!gym || !user || !supplement) return;

    if (isSell && data.quantity > supplement.quantity) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient stock',
        text2: `Only ${supplement.quantity} ${supplement.unit} left`,
      });
      return;
    }

    setLoading(true);
    const result = await recordStockTransaction(gym.id, supplementId, user.id, {
      type: isSell ? 'Sell' : 'Add',
      quantity: data.quantity,
      price_per_unit: data.price_per_unit,
      notes: data.notes,
      transaction_date: data.transaction_date,
    });
    setLoading(false);

    if (result.data) {
      adjustLocalQuantity(supplementId, isSell ? -data.quantity : data.quantity);
      Toast.show({
        type: 'success',
        text1: isSell ? 'Sale Recorded!' : 'Stock Added!',
        text2: `${data.quantity} ${supplement.unit} of ${supplement.name}`,
      });
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed', text2: result.error || 'Something went wrong'});
    }
  };

  if (!supplement) return null;

  const isLowStock = supplement.quantity <= supplement.low_stock_threshold;
  const stockColor = supplement.quantity === 0 ? COLORS.error : isLowStock ? COLORS.warning : COLORS.success;

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: COLORS.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="Stock Transaction" onBack={() => navigation.goBack()} isDark />

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Product Card */}
        <View style={styles.productCard}>
          <View style={[styles.productIcon, {backgroundColor: stockColor + '20'}]}>
            <MaterialCommunityIcons name="pill" size={28} color={stockColor} />
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{supplement.name}</Text>
            {supplement.category ? (
              <Text style={styles.productCategory}>{supplement.category}</Text>
            ) : null}
            <Text style={[styles.productStock, {color: stockColor}]}>
              {supplement.quantity} {supplement.unit} available
              {isLowStock ? ' · Low Stock' : ''}
            </Text>
          </View>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'in' && {backgroundColor: COLORS.success, borderColor: COLORS.success}]}
            onPress={() => setMode('in')}
            activeOpacity={0.8}>
            <MaterialCommunityIcons
              name="plus-circle"
              size={18}
              color={mode === 'in' ? '#0B0F0E' : COLORS.textSecondary}
            />
            <Text style={[styles.modeBtnText, {color: mode === 'in' ? '#0B0F0E' : COLORS.textSecondary}]}>
              Stock In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'out' && {backgroundColor: COLORS.error, borderColor: COLORS.error}]}
            onPress={() => setMode('out')}
            activeOpacity={0.8}>
            <MaterialCommunityIcons
              name="minus-circle"
              size={18}
              color={mode === 'out' ? '#FFF' : COLORS.textSecondary}
            />
            <Text style={[styles.modeBtnText, {color: mode === 'out' ? '#FFF' : COLORS.textSecondary}]}>
              Stock Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Adjust Quantity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: accentColor}]}>ADJUST QUANTITY</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepBtn, {borderColor: accentColor + '40'}]}
              onPress={() => stepQuantity(-1)}
              disabled={quantity <= 1}>
              <MaterialCommunityIcons
                name="minus"
                size={22}
                color={quantity <= 1 ? COLORS.textSecondary : accentColor}
              />
            </TouchableOpacity>
            <View style={styles.stepValueWrap}>
              <Text style={[styles.stepValue, {color: accentColor}]}>{quantity}</Text>
              <Text style={styles.stepUnit}>{supplement.unit}</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepBtn, {borderColor: accentColor + '40'}]}
              onPress={() => stepQuantity(1)}>
              <MaterialCommunityIcons name="plus" size={22} color={accentColor} />
            </TouchableOpacity>
          </View>

          <Controller
            control={control}
            name="price_per_unit"
            render={({field: {onChange, value}}) => (
              <AppInput
                label={`Price per ${supplement.unit} (₹)`}
                value={value?.toString()}
                onChangeText={t => onChange(Number(t) || 0)}
                keyboardType="numeric"
                error={errors.price_per_unit?.message}
              />
            )}
          />

          <View style={[styles.totalBar, {backgroundColor: accentColor + '12'}]}>
            <Text style={[styles.totalLabel, {color: COLORS.textPrimary}]}>
              Total {isSell ? 'Sale' : 'Cost'}
            </Text>
            <Text style={[styles.totalValue, {color: accentColor}]}>
              ₹{(quantity * watch('price_per_unit')).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>REASON / NOTES</Text>
          <Controller
            control={control}
            name="notes"
            render={({field: {onChange, value}}) => (
              <AppInput
                label="Add a note (optional)"
                value={value || ''}
                onChangeText={onChange}
                multiline
                numberOfLines={2}
              />
            )}
          />
        </View>

        {/* Recent Transactions */}
        {recentTxns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
            {recentTxns.map((txn, idx) => {
              const isIn = txn.type === 'Add';
              const tColor = isIn ? COLORS.success : COLORS.error;
              return (
                <View
                  key={txn.id}
                  style={[
                    styles.txnRow,
                    idx < recentTxns.length - 1 && styles.txnDivider,
                  ]}>
                  <View style={[styles.txnIcon, {backgroundColor: tColor + '18'}]}>
                    <MaterialCommunityIcons
                      name={isIn ? 'arrow-down-circle' : 'arrow-up-circle'}
                      size={18}
                      color={tColor}
                    />
                  </View>
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnDesc}>
                      <Text style={{color: tColor}}>{isIn ? '+' : '-'}{txn.quantity}</Text>
                      {(txn as any).recorder?.name ? ` by ${(txn as any).recorder.name}` : ''}
                    </Text>
                    {txn.notes ? (
                      <Text style={styles.txnNotes} numberOfLines={1}>{txn.notes}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.txnTime}>
                    {dayjs(txn.transaction_date).fromNow()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <AppButton
          title={isSell ? 'Record Sale' : 'Update Stock'}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          color={accentColor}
          icon={isSell ? 'cart-check' : 'package-variant-plus'}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md},

  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 2,
  },
  productIcon: {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
  productInfo: {flex: 1},
  productName: {fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},
  productCategory: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},
  productStock: {fontSize: 13, fontWeight: '600', marginTop: 4},

  modeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  modeBtnText: {fontSize: 14, fontWeight: FONT_WEIGHT.bold},

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

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  stepValueWrap: {flex: 1, alignItems: 'center'},
  stepValue: {fontSize: 32, fontWeight: '900'},
  stepUnit: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary},

  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  totalLabel: {fontSize: 14, fontWeight: '600'},
  totalValue: {fontSize: 18, fontWeight: '800'},

  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  txnDivider: {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border},
  txnIcon: {width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  txnInfo: {flex: 1},
  txnDesc: {fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '600'},
  txnNotes: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},
  txnTime: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary},
});

export default StockTransactionScreen;
