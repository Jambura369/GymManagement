import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Card, Avatar, Chip} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import DatePickerModal from '../../components/common/DatePickerModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, SALARY_PAYMENT_TYPES} from '../../constants';
import {User, TrainerSalary} from '../../types';
import {fetchUsers} from '../../services/userService';
import {paySalary, fetchSalaries} from '../../services/salaryService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';
import SelectPicker from '../../components/common/SelectPicker';

const schema = z.object({
  trainer_id: z.string().min(1, 'Select a trainer'),
  salary_amount: z.number().min(1, 'Amount required'),
  payment_date: z.string(),
  payment_type: z.enum(['Cash', 'Bank Transfer', 'UPI']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const AddSalaryScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const [loading, setLoading] = useState(false);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [recentSalaries, setRecentSalaries] = useState<TrainerSalary[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const {control, handleSubmit, setValue, watch, formState: {errors}} =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        trainer_id: '',
        salary_amount: 0,
        payment_date: dayjs().format('YYYY-MM-DD'),
        payment_type: 'Cash',
        notes: '',
      },
    });

  const paymentDate = watch('payment_date');
  const selectedPaymentType = watch('payment_type');


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!gym) return;
    const [trainerRes, salaryRes] = await Promise.all([
      fetchUsers(gym.id, 'Trainer'),
      fetchSalaries(gym.id),
    ]);
    if (trainerRes.data) setTrainers(trainerRes.data);
    if (salaryRes.data) setRecentSalaries(salaryRes.data.slice(0, 5));
  };

  const onSubmit = async (data: FormData) => {
    if (!gym || !user) return;
    setLoading(true);
    const result = await paySalary(gym.id, user.id, data);
    setLoading(false);
    if (result.data) {
      Toast.show({
        type: 'success',
        text1: 'Salary Paid!',
        text2: `₹${data.salary_amount} paid successfully`,
      });
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed', text2: result.error || 'Something went wrong'});
    }
  };

  const trainerOptions = trainers.map(t => ({label: `${t.name} (${t.phone || ''})`, value: t.id}));

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Pay Trainer Salary" onBack={() => navigation.goBack()} isDark={isDark} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Trainer & Amount</Text>

          <Controller
            control={control}
            name="trainer_id"
            render={({field: {onChange, value}}) => (
              <SelectPicker
                label="Select Trainer *"
                value={value}
                options={trainerOptions}
                onSelect={onChange}
                error={errors.trainer_id?.message}
                isDark={isDark}
              />
            )}
          />

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
        </View>

        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Payment Details</Text>

          {/* Payment Date */}
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
                style={[
                  styles.typeChip,
                  selectedPaymentType === type && {backgroundColor: COLORS.success},
                ]}
                textStyle={{
                  color: selectedPaymentType === type ? '#FFF' : textColor,
                  fontSize: 12,
                }}
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
          title="Pay Salary"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.submitBtn}
          icon="currency-inr"
          color={COLORS.success}
        />

        {/* Recent Salaries */}
        {recentSalaries.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={[styles.sectionTitle, {color: textColor}]}>Recent Payments</Text>
            {recentSalaries.map(salary => (
              <Card key={salary.id} style={[styles.salaryCard, {backgroundColor: cardBg}]}>
                <Card.Content style={styles.salaryContent}>
                  <Avatar.Text
                    size={36}
                    label={(salary.trainer?.name || 'T').slice(0, 2).toUpperCase()}
                    style={{backgroundColor: COLORS.trainerColor + '30'}}
                    labelStyle={{color: COLORS.trainerColor, fontSize: 12}}
                  />
                  <View style={styles.salaryInfo}>
                    <Text style={[styles.trainerName, {color: textColor}]}>{salary.trainer?.name}</Text>
                    <Text style={[styles.salaryDate, {color: COLORS.textSecondary}]}>
                      {dayjs(salary.payment_date).format('DD MMM YYYY')} · {salary.payment_type}
                    </Text>
                  </View>
                  <Text style={[styles.salaryAmount, {color: COLORS.success}]}>
                    ₹{Number(salary.salary_amount).toLocaleString('en-IN')}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md, paddingBottom: SPACING.xxl},
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
  recentSection: {marginTop: SPACING.md},
  salaryCard: {borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xs, elevation: 1},
  salaryContent: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  salaryInfo: {flex: 1},
  trainerName: {fontSize: 14, fontWeight: '600'},
  salaryDate: {fontSize: 11, marginTop: 2},
  salaryAmount: {fontSize: 15, fontWeight: '700'},
});

export default AddSalaryScreen;
