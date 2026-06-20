import React, {useEffect, useState} from 'react';
import {StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Text, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {useSupplementStore} from '../../store/supplementStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList, Supplement} from '../../types';
import {getSupplement, recordStockTransaction} from '../../services/supplementService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';
import DatePickerModal from '../../components/common/DatePickerModal';

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
  const {isDark} = useThemeStore();
  const {adjustLocalQuantity} = useSupplementStore();
  const insets = useSafeAreaInsets();

  const {supplementId, mode} = route.params;
  const isSell = mode === 'sell';

  const [supplement, setSupplement] = useState<Supplement | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const accentColor = isSell ? COLORS.error : COLORS.success;

  const {control, handleSubmit, setValue, watch, formState: {errors}} = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      quantity: 1,
      price_per_unit: 0,
      transaction_date: dayjs().format('YYYY-MM-DD'),
      notes: '',
    },
  });

  const transactionDate = watch('transaction_date');
  const quantity = watch('quantity');

  useEffect(() => {
    loadSupplement();
  }, []);

  const loadSupplement = async () => {
    const result = await getSupplement(supplementId);
    if (result.data) {
      setSupplement(result.data);
      setValue('price_per_unit', Number(isSell ? result.data.selling_price : result.data.cost_price ?? 0));
    }
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

  const total = quantity * watch('price_per_unit');

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader
        title={isSell ? 'Sell Supplement' : 'Add Stock'}
        subtitle={supplement.name}
        onBack={() => navigation.goBack()}
        isDark={isDark}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={[styles.stockBanner, {backgroundColor: accentColor + '15'}]}>
          <MaterialCommunityIcons name={isSell ? 'cart-outline' : 'package-variant-plus'} size={22} color={accentColor} />
          <Text style={[styles.stockBannerText, {color: accentColor}]}>
            Current stock: {supplement.quantity} {supplement.unit}
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: accentColor}]}>
            {isSell ? 'Sale Details' : 'Stock Details'}
          </Text>
          <Controller control={control} name="quantity" render={({field: {onChange, value}}) => (
            <AppInput
              label={`Quantity (${supplement.unit}) *`}
              value={value?.toString()}
              onChangeText={t => onChange(Number(t) || 0)}
              keyboardType="numeric"
              error={errors.quantity?.message}
            />
          )} />
          <Controller control={control} name="price_per_unit" render={({field: {onChange, value}}) => (
            <AppInput
              label={`Price per ${supplement.unit} (₹) *`}
              value={value?.toString()}
              onChangeText={t => onChange(Number(t) || 0)}
              keyboardType="numeric"
              error={errors.price_per_unit?.message}
            />
          )} />

          <TouchableOpacity
            style={[styles.dateField, {borderColor: COLORS.border}]}
            onPress={() => setShowDatePicker(true)}>
            <MaterialCommunityIcons name="calendar" size={20} color={COLORS.textSecondary} />
            <View style={styles.dateContent}>
              <Text style={styles.dateLabel}>Date</Text>
              <Text style={[styles.dateValue, {color: textColor}]}>
                {dayjs(transactionDate).format('DD MMM YYYY')}
              </Text>
            </View>
          </TouchableOpacity>

          <DatePickerModal
            visible={showDatePicker}
            value={transactionDate || dayjs().format('YYYY-MM-DD')}
            isDark={isDark}
            onConfirm={date => {
              setValue('transaction_date', date);
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />

          <Controller control={control} name="notes" render={({field: {onChange, value}}) => (
            <AppInput label="Notes (Optional)" value={value || ''} onChangeText={onChange} multiline numberOfLines={2} />
          )} />
        </View>

        <View style={[styles.totalBar, {backgroundColor: accentColor + '12'}]}>
          <Text style={[styles.totalLabel, {color: textColor}]}>Total {isSell ? 'Sale' : 'Cost'}</Text>
          <Text style={[styles.totalValue, {color: accentColor}]}>₹{total.toLocaleString('en-IN')}</Text>
        </View>

        <AppButton
          title={isSell ? 'Record Sale' : 'Add to Stock'}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          color={accentColor}
          icon={isSell ? 'cart-check' : 'package-variant-plus'}
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md},
  stockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  stockBannerText: {fontSize: 13, fontWeight: '600'},
  section: {borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1},
  sectionTitle: {fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: SPACING.md},
  dateField: {flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm},
  dateContent: {flex: 1},
  dateLabel: {fontSize: 12, color: COLORS.textSecondary},
  dateValue: {fontSize: 15, fontWeight: '500', marginTop: 2},
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  totalLabel: {fontSize: 14, fontWeight: '600'},
  totalValue: {fontSize: 18, fontWeight: '800'},
  submitBtn: {marginTop: 0},
});

export default StockTransactionScreen;
