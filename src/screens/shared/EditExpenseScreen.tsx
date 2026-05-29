import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import Toast from 'react-native-toast-message';
import DatePickerModal from '../../components/common/DatePickerModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useExpenseStore} from '../../store/expenseStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_ICONS} from '../../constants';
import {RootStackParamList, Expense} from '../../types';
import {supabase} from '../../supabase/client';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';

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
  const {isDark} = useThemeStore();
  const {updateExpense} = useExpenseStore();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;

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
      setInitialLoaded(true);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const success = await updateExpense(route.params.expenseId, data as any);
    setLoading(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Expense Updated!'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed to update expense'});
    }
  };

  if (!initialLoaded) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Edit Expense" onBack={() => navigation.goBack()} isDark={isDark} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

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
                  <MaterialCommunityIcons name={icon} size={22} color={isSelected ? '#FFF' : color} />
                  <Text style={[styles.categoryLabel, {color: isSelected ? '#FFF' : color}]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
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
              <Text style={[styles.dateValue, {color: textColor}]}>{dayjs(expenseDate).format('DD MMM YYYY')}</Text>
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
              <AppInput label="Description" value={value || ''} onChangeText={onChange} multiline numberOfLines={3} />
            )}
          />
        </View>

        <AppButton title="Update Expense" onPress={handleSubmit(onSubmit)} loading={loading} style={styles.submitBtn} icon="content-save" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md, paddingBottom: SPACING.xxl},
  section: {borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1},
  sectionTitle: {fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: SPACING.md},
  categoryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm},
  categoryItem: {width: '30%', alignItems: 'center', padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, gap: 4},
  categoryLabel: {fontSize: 11, fontWeight: '600', textAlign: 'center'},
  dateField: {flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm},
  dateContent: {flex: 1},
  dateLabel: {fontSize: 12, color: COLORS.textSecondary},
  dateValue: {fontSize: 15, fontWeight: '500', marginTop: 2},
  submitBtn: {marginTop: SPACING.sm},
});

export default EditExpenseScreen;
