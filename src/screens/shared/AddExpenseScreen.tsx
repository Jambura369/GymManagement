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
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Chip} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import DatePickerModal from '../../components/common/DatePickerModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {showImagePicker} from '../../utils/imagePicker';
import dayjs from 'dayjs';

import {useExpenseStore} from '../../store/expenseStore';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_ICONS,
} from '../../constants';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';

const schema = z.object({
  title: z.string().min(2, 'Title required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  category: z.string().min(1, 'Select category'),
  expense_date: z.string(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const AddExpenseScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const {addExpense} = useExpenseStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;

  const {control, handleSubmit, setValue, watch, formState: {errors, isDirty}} =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        title: '',
        amount: 0,
        category: 'Misc',
        expense_date: dayjs().format('YYYY-MM-DD'),
        description: '',
      },
    });

  const expenseDate = watch('expense_date');
  const selectedCategory = watch('category');

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!isDirty && !receiptImage) return;
      e.preventDefault();
      const {Alert} = require('react-native');
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          {text: 'Keep Editing', style: 'cancel'},
          {text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action)},
        ],
      );
    });
    return unsubscribe;
  }, [navigation, isDirty, receiptImage]);


  const pickReceipt = () => {
    showImagePicker({quality: 0.8, maxWidth: 1200, maxHeight: 1200}, uri =>
      setReceiptImage(uri),
    );
  };

  const onSubmit = async (data: FormData) => {
    if (!gym || !user) return;
    setLoading(true);
    const success = await addExpense(gym.id, user.id, {...(data as any), receipt_image: receiptImage || undefined});
    setLoading(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Expense Added!', text2: `₹${data.amount} recorded`});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed to add expense'});
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="Add Expense" onBack={() => navigation.goBack()} isDark={isDark} />

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Category Selection */}
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
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
                  <MaterialCommunityIcons
                    name={icon}
                    size={24}
                    color={isSelected ? '#FFF' : color}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      {color: isSelected ? '#FFF' : color},
                    ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.category && (
            <Text style={styles.errorText}>{errors.category.message}</Text>
          )}
        </View>

        {/* Expense Details */}
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Details</Text>

          <Controller
            control={control}
            name="title"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Expense Title *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.title?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({field: {onChange, value}}) => (
              <AppInput
                label="Amount (₹) *"
                value={value?.toString()}
                onChangeText={text => onChange(Number(text) || 0)}
                keyboardType="numeric"
                error={errors.amount?.message}
              />
            )}
          />

          {/* Date */}
          <TouchableOpacity
            style={[styles.dateField, {borderColor: COLORS.border}]}
            onPress={() => setShowDatePicker(true)}>
            <MaterialCommunityIcons name="calendar" size={20} color={COLORS.textSecondary} />
            <View style={styles.dateContent}>
              <Text style={styles.dateLabel}>Expense Date</Text>
              <Text style={[styles.dateValue, {color: textColor}]}>
                {dayjs(expenseDate).format('DD MMM YYYY')}
              </Text>
            </View>
          </TouchableOpacity>

          <DatePickerModal
            visible={showDatePicker}
            value={expenseDate || dayjs().format('YYYY-MM-DD')}
            isDark={isDark}
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
              <AppInput
                label="Description (Optional)"
                value={value || ''}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
              />
            )}
          />
        </View>

        {/* Receipt Image */}
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Receipt (Optional)</Text>
          <TouchableOpacity style={styles.receiptPicker} onPress={pickReceipt}>
            {receiptImage ? (
              <Image source={{uri: receiptImage}} style={styles.receiptPreview} resizeMode="cover" />
            ) : (
              <View style={styles.receiptPlaceholder}>
                <MaterialCommunityIcons name="camera-plus-outline" size={28} color={COLORS.placeholder} />
                <Text style={styles.receiptPlaceholderText}>Add Receipt Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {receiptImage && (
            <TouchableOpacity onPress={() => setReceiptImage(null)} style={styles.removeReceiptBtn}>
              <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.error} />
              <Text style={[styles.removeReceiptText, {color: COLORS.error}]}>Remove Receipt</Text>
            </TouchableOpacity>
          )}
        </View>

        <AppButton
          title="Save Expense"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.submitBtn}
          icon="cash-plus"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md},
  section: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  categoryLabel: {fontSize: 11, fontWeight: '600', textAlign: 'center'},
  errorText: {color: COLORS.error, fontSize: 12, marginTop: 4},
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  dateContent: {flex: 1},
  dateLabel: {fontSize: 12, color: COLORS.textSecondary},
  dateValue: {fontSize: 15, fontWeight: '500', marginTop: 2},
  submitBtn: {marginTop: SPACING.sm},
  receiptPicker: {borderRadius: BORDER_RADIUS.md, overflow: 'hidden'},
  receiptPreview: {width: '100%', height: 160, borderRadius: BORDER_RADIUS.md},
  receiptPlaceholder: {
    height: 100,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  receiptPlaceholderText: {fontSize: 12, color: COLORS.placeholder},
  removeReceiptBtn: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.xs},
  removeReceiptText: {fontSize: 12, fontWeight: '600'},
});

export default AddExpenseScreen;
