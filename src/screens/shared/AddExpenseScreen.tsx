import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  TextInput,
  Image,
  StatusBar,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import DatePickerModal from '../../components/common/DatePickerModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {showImagePicker, PICKER_PRESETS} from '../../utils/imagePicker';
import dayjs from 'dayjs';

import {useExpenseStore} from '../../store/expenseStore';
import {useAuthStore} from '../../store/authStore';
import {EXPENSE_CATEGORIES} from '../../constants';
import {COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING} from '../../theme';
import ImageViewerModal from '../../components/common/ImageViewerModal';

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
  const {addExpense} = useExpenseStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const savedRef = useRef(false);

  const {control, handleSubmit, setValue, watch, formState: {errors, isDirty}} =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        title: '',
        amount: 0,
        category: EXPENSE_CATEGORIES[0],
        expense_date: dayjs().format('YYYY-MM-DD'),
        description: '',
      },
    });

  const expenseDate = watch('expense_date');
  const selectedCategory = watch('category');
  const amountValue = watch('amount');

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (savedRef.current || (!isDirty && !receiptImage)) return;
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
    showImagePicker(PICKER_PRESETS.RECEIPT, uri => setReceiptImage(uri));
  };

  const onSubmit = async (data: FormData) => {
    if (!gym || !user) return;
    setLoading(true);
    const success = await addExpense(gym.id, user.id, {
      ...(data as any),
      receipt_image: receiptImage || undefined,
    });
    setLoading(false);
    if (success) {
      savedRef.current = true;
      Toast.show({type: 'success', text1: 'Expense Added!', text2: `₹${data.amount} recorded`});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed to add expense'});
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {paddingTop: insets.top}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: 120 + insets.bottom}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* AMOUNT */}
        <Text style={styles.sectionLabel}>AMOUNT</Text>
        <View style={styles.amountCard}>
          <Text style={styles.currencySymbol}>₹</Text>
          <Controller
            control={control}
            name="amount"
            render={({field: {onChange, value}}) => (
              <TextInput
                style={styles.amountInput}
                value={value > 0 ? value.toString() : ''}
                onChangeText={text => onChange(Number(text.replace(/[^0-9.]/g, '')) || 0)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={COLORS.textSecondary}
              />
            )}
          />
        </View>
        {errors.amount && <Text style={styles.errorText}>{errors.amount.message}</Text>}

        {/* CATEGORY */}
        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <View style={styles.chipGrid}>
          {EXPENSE_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => {
                  setValue('category', cat);
                  // Auto-fill title if empty
                }}>
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.category && <Text style={styles.errorText}>{errors.category.message}</Text>}

        {/* DATE */}
        <Text style={styles.sectionLabel}>DATE</Text>
        <TouchableOpacity
          style={styles.dateField}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}>
          <MaterialCommunityIcons name="calendar-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.dateValue}>
            {dayjs(expenseDate).format('MM/DD/YYYY')}
          </Text>
          <MaterialCommunityIcons name="calendar" size={18} color={COLORS.textSecondary} />
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

        {/* TITLE (vendor name) */}
        <Text style={styles.sectionLabel}>VENDOR / TITLE</Text>
        <Controller
          control={control}
          name="title"
          render={({field: {onChange, value, onBlur}}) => (
            <TextInput
              style={styles.textField}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. City Power Co."
              placeholderTextColor={COLORS.textSecondary}
            />
          )}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}

        {/* RECEIPT */}
        <Text style={styles.sectionLabel}>RECEIPT</Text>
        <TouchableOpacity
          style={styles.receiptArea}
          activeOpacity={0.8}
          onPress={() => (receiptImage ? setViewerVisible(true) : pickReceipt())}>
          {receiptImage ? (
            <Image source={{uri: receiptImage}} style={styles.receiptPreview} resizeMode="cover" />
          ) : (
            <View style={styles.receiptPlaceholder}>
              <View style={styles.receiptIconCircle}>
                <MaterialCommunityIcons name="camera" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.receiptTitle}>Upload Receipt</Text>
              <Text style={styles.receiptSub}>JPG, PNG or PDF (Max 5MB)</Text>
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

        {/* NOTES */}
        <Text style={styles.sectionLabel}>NOTES</Text>
        <Controller
          control={control}
          name="description"
          render={({field: {onChange, value}}) => (
            <TextInput
              style={[styles.textField, styles.notesField]}
              value={value || ''}
              onChangeText={onChange}
              placeholder="Enter details about this expense..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}
        />
      </ScrollView>

      {/* Save button — sticky bottom */}
      <View style={[styles.saveBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
        <TouchableOpacity
          style={[styles.saveBtn, loading && {opacity: 0.6}]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
          activeOpacity={0.85}>
          <MaterialCommunityIcons name="content-save" size={20} color="#0B0F0E" />
          <Text style={styles.saveBtnText}>
            {loading ? 'Saving...' : 'Save Expense'}
          </Text>
        </TouchableOpacity>
      </View>

      <ImageViewerModal
        visible={viewerVisible}
        uri={receiptImage}
        onClose={() => setViewerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},

  scroll: {paddingHorizontal: SPACING.md, paddingTop: SPACING.xs},

  sectionLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },

  // Amount
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    padding: 0,
  },
  errorText: {fontSize: 12, color: COLORS.error, marginTop: 4},

  // Category chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: '#272b2a',
  },
  categoryChipActive: {backgroundColor: COLORS.primary},
  categoryChipText: {fontSize: 13, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textSecondary},
  categoryChipTextActive: {color: '#0B0F0E', fontWeight: FONT_WEIGHT.bold},

  // Date
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    gap: SPACING.sm,
  },
  dateValue: {flex: 1, fontSize: 15, fontWeight: FONT_WEIGHT.medium, color: COLORS.textPrimary},

  // Text fields
  textField: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  notesField: {
    height: 110,
    paddingTop: SPACING.md,
  },

  // Receipt
  receiptArea: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  receiptPreview: {width: '100%', height: 160},
  receiptPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: '#2a2f2d',
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
  },
  receiptIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#272b2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTitle: {fontSize: 15, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  receiptSub: {fontSize: 12, color: COLORS.textSecondary},
  receiptActions: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.sm,
  },
  receiptActionBtn: {flexDirection: 'row', alignItems: 'center', gap: 4},
  receiptActionText: {fontSize: 12, fontWeight: FONT_WEIGHT.semiBold},

  // Save bar
  saveBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2f2d',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
  },
  saveBtnText: {fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: '#0B0F0E'},
});

export default AddExpenseScreen;
