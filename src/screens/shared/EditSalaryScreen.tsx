import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Chip} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import DatePickerModal from '../../components/common/DatePickerModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {useDashboardStore} from '../../store/dashboardStore';
import {COLORS, SPACING, BORDER_RADIUS, SALARY_PAYMENT_TYPES} from '../../constants';
import {RootStackParamList, TrainerSalary} from '../../types';
import {fetchSalaries, updateSalary, deleteSalary} from '../../services/salaryService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';

const schema = z.object({
  salary_amount: z.number().min(1, 'Amount required'),
  payment_date: z.string(),
  payment_type: z.enum(['Cash', 'Bank Transfer', 'UPI']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type Route = RouteProp<RootStackParamList, 'EditSalary'>;

const EditSalaryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const {gym} = useAuthStore();
  const {isDark} = useThemeStore();

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [salary, setSalary] = useState<TrainerSalary | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;

  const {control, handleSubmit, setValue, watch, formState: {errors}} = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const paymentDate = watch('payment_date');
  const selectedPaymentType = watch('payment_type');

  useEffect(() => {
    loadSalary();
  }, []);

  const loadSalary = async () => {
    if (!gym) return;
    setFetching(true);
    const result = await fetchSalaries(gym.id);
    const found = result.data?.find(s => s.id === route.params.salaryId);
    if (found) {
      setSalary(found);
      setValue('salary_amount', Number(found.salary_amount));
      setValue('payment_date', found.payment_date);
      setValue('payment_type', found.payment_type as any);
      setValue('notes', found.notes || '');
    }
    setFetching(false);
  };

  const onSubmit = async (data: FormData) => {
    if (!salary || !gym) return;
    setLoading(true);
    const result = await updateSalary(salary.id, {
      salary_amount: data.salary_amount,
      payment_date: data.payment_date,
      payment_type: data.payment_type,
      notes: data.notes || null,
    });
    setLoading(false);
    if (result.data) {
      useDashboardStore.getState().refresh(gym.id);
      Toast.show({type: 'success', text1: 'Salary Updated!'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Update failed'});
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Salary Record',
      'This will permanently delete this salary record and affect profit calculations. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!salary || !gym) return;
            setDeleting(true);
            const result = await deleteSalary(salary.id);
            setDeleting(false);
            if (!result.error) {
              useDashboardStore.getState().refresh(gym.id);
              Toast.show({type: 'success', text1: 'Salary record deleted'});
              navigation.goBack();
            } else {
              Toast.show({type: 'error', text1: 'Delete failed', text2: result.error});
            }
          },
        },
      ],
    );
  };

  if (fetching) {
    return (
      <KeyboardAvoidingView style={[styles.container, {backgroundColor: bgColor}]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <AppHeader title="Edit Salary" onBack={() => navigation.goBack()} isDark={isDark} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (!salary) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="Edit Salary" onBack={() => navigation.goBack()} isDark={isDark} />
      <ScrollView contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Trainer Info (read-only) */}
        <View style={[styles.trainerBadge, {backgroundColor: COLORS.trainerColor + '15'}]}>
          <MaterialCommunityIcons name="account-tie" size={20} color={COLORS.trainerColor} />
          <Text style={[styles.trainerName, {color: COLORS.trainerColor}]}>
            {salary.trainer?.name || 'Trainer'}
          </Text>
        </View>

        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Salary Details</Text>

          <Controller
            control={control}
            name="salary_amount"
            render={({field: {onChange, value}}) => (
              <AppInput
                label="Salary Amount (₹) *"
                value={value?.toString()}
                onChangeText={t => onChange(Number(t) || 0)}
                keyboardType="numeric"
                error={errors.salary_amount?.message}
              />
            )}
          />

          <TouchableOpacity
            style={[styles.dateField, {borderColor: COLORS.border}]}
            onPress={() => setShowDatePicker(true)}>
            <MaterialCommunityIcons name="calendar" size={20} color={COLORS.textSecondary} />
            <View style={styles.dateContent}>
              <Text style={styles.dateLabel}>Payment Date</Text>
              <Text style={[styles.dateValue, {color: textColor}]}>
                {dayjs(paymentDate).format('DD MMM YYYY')}
              </Text>
            </View>
          </TouchableOpacity>

          <DatePickerModal
            visible={showDatePicker}
            value={paymentDate || dayjs().format('YYYY-MM-DD')}
            isDark={isDark}
            onConfirm={date => {
              setValue('payment_date', date);
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />

          <Text style={[styles.fieldLabel, {color: COLORS.textSecondary}]}>Payment Method</Text>
          <View style={styles.chipRow}>
            {SALARY_PAYMENT_TYPES.map(type => (
              <Chip
                key={type}
                selected={selectedPaymentType === type}
                onPress={() => setValue('payment_type', type as any)}
                style={[styles.typeChip, selectedPaymentType === type && {backgroundColor: COLORS.success}]}
                textStyle={{color: selectedPaymentType === type ? '#FFF' : textColor, fontSize: 12}}
                compact>
                {type}
              </Chip>
            ))}
          </View>

          <Controller
            control={control}
            name="notes"
            render={({field: {onChange, value}}) => (
              <AppInput label="Notes (Optional)" value={value || ''} onChangeText={onChange} multiline numberOfLines={2} />
            )}
          />
        </View>

        <AppButton
          title="Update Salary"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.submitBtn}
          icon="content-save"
          color={COLORS.success}
        />

        <AppButton
          title={deleting ? 'Deleting…' : 'Delete Record'}
          onPress={handleDelete}
          mode="outlined"
          color={COLORS.error}
          style={styles.deleteBtn}
          icon="delete"
          disabled={deleting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  trainerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  trainerName: {fontSize: 16, fontWeight: '700'},
  section: {borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1},
  sectionTitle: {fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: SPACING.md},
  dateField: {flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm},
  dateContent: {flex: 1},
  dateLabel: {fontSize: 12, color: COLORS.textSecondary},
  dateValue: {fontSize: 15, fontWeight: '500', marginTop: 2},
  fieldLabel: {fontSize: 12, marginBottom: SPACING.xs, marginLeft: 4},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm},
  typeChip: {marginBottom: 0},
  submitBtn: {marginTop: SPACING.sm},
  deleteBtn: {marginTop: SPACING.sm},
});

export default EditSalaryScreen;
