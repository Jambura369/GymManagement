import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import Toast from 'react-native-toast-message';
import DatePickerModal from '../../components/common/DatePickerModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {showImagePicker, PICKER_PRESETS} from '../../utils/imagePicker';

import {useExpenseStore} from '../../store/expenseStore';
import {EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_ICONS, SUPABASE_BUCKETS} from '../../constants';
import {COLORS, RADIUS, SPACING} from '../../theme';
import {RootStackParamList, Expense} from '../../types';
import {supabase} from '../../supabase/client';
import {uploadImage} from '../../services/storageService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';
import ImageViewerModal from '../../components/common/ImageViewerModal';

const schema = z.object({
  title: z.string().min(2, 'Title required'),
  amount: z.number().min(1, 'Amount required'),
  category: z.string(),
  expense_date: z.string(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type Route = RouteProp<RootStackParamList, 'EditExpense'>;

const EditExpenseScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const {updateExpense} = useExpenseStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [originalReceipt, setOriginalReceipt] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [imgError, setImgError] = useState(false);


  const {control, handleSubmit, setValue, watch, reset, formState: {errors}} =
    useForm<FormData>({resolver: zodResolver(schema)});

  const expenseDate = watch('expense_date') || dayjs().format('YYYY-MM-DD');
  const selectedCategory = watch('category') || 'Misc';


  useEffect(() => {
    loadExpense();
  }, [route.params.expenseId]);

  const loadExpense = async () => {
    const {data, error} = await supabase
      .from('expenses')
      .select('*')
      .eq('id', route.params.expenseId)
      .single();

    if (data) {
      reset({
        title: data.title,
        amount: Number(data.amount),
        category: data.category,
        expense_date: data.expense_date,
        description: data.description || '',
      });
      setReceiptImage(data.receipt_image || null);
      setOriginalReceipt(data.receipt_image || null);
      setImgError(false);
      setInitialLoaded(true);
    } else {
      setLoadError(error?.message || 'Could not load expense');
    }
  };

  const pickReceipt = () => {
    showImagePicker(PICKER_PRESETS.RECEIPT, uri =>
      setReceiptImage(uri),
    );
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    // Resolve receipt: upload if newly picked, keep URL if unchanged, null if removed
    let receiptUrl = originalReceipt;
    if (receiptImage !== originalReceipt) {
      if (receiptImage) {
        const res = await uploadImage(
          receiptImage,
          SUPABASE_BUCKETS.RECEIPTS,
          `${data.expense_date}/${Date.now()}`,
          originalReceipt || undefined,
        );
        receiptUrl = res.data ?? originalReceipt;
      } else {
        receiptUrl = null;
      }
    }

    const success = await updateExpense(route.params.expenseId, {
      ...(data as any),
      receipt_image: receiptUrl,
    });
    setLoading(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Expense Updated!'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed to update expense'});
    }
  };

  if (!initialLoaded) {
    return (
      <View style={[styles.container, {backgroundColor: COLORS.background}]}>
        <AppHeader title="Edit Expense" onBack={() => navigation.goBack()} isDark />
        <View style={styles.centerFill}>
          {loadError ? (
            <>
              <Text style={{color: COLORS.error, marginBottom: SPACING.md, textAlign: 'center'}}>{loadError}</Text>
              <AppButton title="Retry" onPress={() => { setLoadError(null); loadExpense(); }} />
            </>
          ) : (
            <ActivityIndicator size="large" color={COLORS.primary} />
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: COLORS.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="Edit Expense" onBack={() => navigation.goBack()} isDark />

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={[styles.section, {backgroundColor: COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Category</Text>
          <View style={styles.categoryGrid}>
            {EXPENSE_CATEGORIES.map(cat => {
              const color = EXPENSE_CATEGORY_COLORS[cat];
              const icon = EXPENSE_CATEGORY_ICONS[cat];
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor: isSelected ? color : color + '15',
                      borderColor: color,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setValue('category', cat)}>
                  <MaterialCommunityIcons name={icon} size={22} color={isSelected ? '#FFF' : color} />
                  <Text style={[styles.categoryLabel, {color: isSelected ? '#FFF' : color}]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, {backgroundColor: COLORS.surface}]}>
          <Controller
            control={control}
            name="title"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput label="Title *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.title?.message} />
            )}
          />
          <Controller
            control={control}
            name="amount"
            render={({field: {onChange, value}}) => (
              <AppInput label="Amount (₹) *" value={value?.toString()} onChangeText={t => onChange(Number(t) || 0)} keyboardType="numeric" error={errors.amount?.message} />
            )}
          />
          <TouchableOpacity style={[styles.dateField, {borderColor: COLORS.border}]} onPress={() => setShowDatePicker(true)}>
            <MaterialCommunityIcons name="calendar" size={20} color={COLORS.textSecondary} />
            <View style={styles.dateContent}>
              <Text style={styles.dateLabel}>Date</Text>
              <Text style={[styles.dateValue, {color: COLORS.textPrimary}]}>{dayjs(expenseDate).format('DD MMM YYYY')}</Text>
            </View>
          </TouchableOpacity>
          <DatePickerModal
            visible={showDatePicker}
            value={expenseDate || dayjs().format('YYYY-MM-DD')}
            isDark={true}
            onConfirm={date => {
              setValue('expense_date', date);
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
          <Controller
            control={control}
            name="description"
            render={({field: {onChange, value}}) => (
              <AppInput label="Description" value={value || ''} onChangeText={onChange} multiline numberOfLines={3} />
            )}
          />
        </View>

        {/* Receipt Image */}
        <View style={[styles.section, {backgroundColor: COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Receipt</Text>
          <TouchableOpacity
            style={styles.receiptPicker}
            activeOpacity={0.8}
            onPress={() => (receiptImage && !imgError ? setViewerVisible(true) : pickReceipt())}>
            {receiptImage && !imgError ? (
              <Image
                source={{uri: receiptImage}}
                style={styles.receiptPreview}
                resizeMode="cover"
                onError={() => setImgError(true)}
              />
            ) : receiptImage && imgError ? (
              <View style={[styles.receiptPlaceholder, {gap: 6}]}>
                <MaterialCommunityIcons name="image-broken-variant" size={28} color={COLORS.textSecondary} />
                <Text style={styles.receiptPlaceholderText}>Tap to replace image</Text>
              </View>
            ) : (
              <View style={styles.receiptPlaceholder}>
                <MaterialCommunityIcons name="camera-plus-outline" size={28} color={COLORS.textSecondary} />
                <Text style={styles.receiptPlaceholderText}>Add Receipt Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {receiptImage && (
            <View style={styles.receiptActions}>
              <TouchableOpacity onPress={pickReceipt} style={styles.receiptActionBtn}>
                <MaterialCommunityIcons name="image-edit" size={16} color={COLORS.primary} />
                <Text style={[styles.receiptActionText, {color: COLORS.primary}]}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setReceiptImage(null)} style={styles.receiptActionBtn}>
                <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.error} />
                <Text style={[styles.receiptActionText, {color: COLORS.error}]}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <AppButton title="Update Expense" onPress={handleSubmit(onSubmit)} loading={loading} style={styles.submitBtn} icon="content-save" />
      </ScrollView>

      <ImageViewerModal
        visible={viewerVisible}
        uri={receiptImage}
        onClose={() => setViewerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  centerFill: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl},
  scroll: {padding: SPACING.md},
  section: {borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1},
  sectionTitle: {fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: SPACING.md},
  categoryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm},
  categoryItem: {width: '30%', alignItems: 'center', padding: SPACING.sm, borderRadius: RADIUS.md, gap: 4},
  categoryLabel: {fontSize: 11, fontWeight: '600', textAlign: 'center'},
  dateField: {flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.sm, padding: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm},
  dateContent: {flex: 1},
  dateLabel: {fontSize: 12, color: COLORS.textSecondary},
  dateValue: {fontSize: 15, fontWeight: '500', marginTop: 2},
  submitBtn: {marginTop: SPACING.sm},
  receiptPicker: {borderRadius: RADIUS.md, overflow: 'hidden'},
  receiptPreview: {width: '100%', height: 160, borderRadius: RADIUS.md},
  receiptPlaceholder: {
    height: 100,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  receiptPlaceholderText: {fontSize: 12, color: COLORS.textSecondary},
  receiptActions: {flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm},
  receiptActionBtn: {flexDirection: 'row', alignItems: 'center', gap: 4},
  receiptActionText: {fontSize: 12, fontWeight: '600'},
});

export default EditExpenseScreen;
