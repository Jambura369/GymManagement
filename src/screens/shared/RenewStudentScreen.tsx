import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Chip} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useStudentStore} from '../../store/studentStore';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList, Package} from '../../types';
import {getStudent} from '../../services/studentService';
import {fetchPackages} from '../../services/packageService';
import DatePickerModal from '../../components/common/DatePickerModal';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';
import SelectPicker from '../../components/common/SelectPicker';

const schema = z.object({
  joining_date: z.string(),
  package_id: z.string().min(1, 'Select a package'),
  payment_type: z.enum(['Cash', 'QR']),
  amount_paid: z.number().min(0, 'Amount must be positive'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type Route = RouteProp<RootStackParamList, 'RenewStudent'>;

const RenewStudentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const {renewStudent} = useStudentStore();

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [packages, setPackages] = useState<Package[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {errors},
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      joining_date: dayjs().format('YYYY-MM-DD'),
      package_id: '',
      payment_type: 'Cash',
      amount_paid: 0,
      notes: '',
    },
  });

  const joiningDate = watch('joining_date');
  const selectedPackageId = watch('package_id');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const pkg = packages.find(p => p.id === selectedPackageId);
    if (pkg) setValue('amount_paid', pkg.price);
  }, [selectedPackageId, packages]);

  const loadData = async () => {
    if (!gym) return;
    const [studentRes, pkgRes] = await Promise.all([
      getStudent(route.params.studentId),
      fetchPackages(gym.id, true),
    ]);
    if (studentRes.data) setStudentName(studentRes.data.name);
    if (pkgRes.data) setPackages(pkgRes.data);
  };

  const onSubmit = async (data: FormData) => {
    if (!gym || !user) return;
    setLoading(true);

    const success = await renewStudent(
      route.params.studentId,
      gym.id,
      user.id,
      user.role,
      data,
    );

    setLoading(false);

    if (success) {
      Toast.show({
        type: 'success',
        text1: 'Membership Renewed!',
        text2: isAdminOrManager
          ? 'Student is now active with new membership.'
          : 'Renewal pending Admin/Manager verification.',
      });
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed', text2: 'Could not renew membership'});
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader
        title="Renew Membership"
        onBack={() => navigation.goBack()}
        isDark={isDark}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Student badge */}
        <View style={[styles.studentBadge, {backgroundColor: COLORS.primary + '15'}]}>
          <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
          <Text style={[styles.studentName, {color: COLORS.primary}]}>{studentName}</Text>
        </View>

        {!isAdminOrManager && (
          <View style={styles.pendingNote}>
            <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.warning} />
            <Text style={[styles.pendingText, {color: COLORS.warning}]}>
              Renewal requires Admin/Manager approval before student is activated.
            </Text>
          </View>
        )}

        {/* New Membership */}
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>New Membership</Text>

          <Text style={[styles.fieldLabel, {color: COLORS.textSecondary}]}>Renewal Date</Text>
          <TouchableOpacity
            style={[styles.dateField, {borderColor: COLORS.border}]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}>
            <MaterialCommunityIcons name="calendar" size={20} color={COLORS.textSecondary} />
            <View style={styles.dateContent}>
              <Text style={styles.dateLabel}>Renewal Start Date</Text>
              <Text style={[styles.dateValue, {color: textColor}]}>
                {dayjs(joiningDate).format('DD MMM YYYY')}
              </Text>
            </View>
          </TouchableOpacity>

          <DatePickerModal
            visible={showDatePicker}
            value={joiningDate}
            isDark={isDark}
            onConfirm={date => {
              setValue('joining_date', date);
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />

          <Controller
            control={control}
            name="package_id"
            render={({field: {onChange, value}}) => (
              <SelectPicker
                label="Select Package *"
                value={value}
                options={packages.map(p => ({label: `${p.name} — ₹${p.price}`, value: p.id}))}
                onSelect={onChange}
                error={errors.package_id?.message}
                isDark={isDark}
              />
            )}
          />
        </View>

        {/* Payment */}
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Payment</Text>

          <Text style={[styles.fieldLabel, {color: COLORS.textSecondary}]}>Payment Type *</Text>
          <Controller
            control={control}
            name="payment_type"
            render={({field: {onChange, value}}) => (
              <View style={styles.chipRow}>
                {(['Cash', 'QR'] as const).map(type => (
                  <Chip
                    key={type}
                    selected={value === type}
                    onPress={() => onChange(type)}
                    style={[
                      styles.typeChip,
                      value === type && {backgroundColor: COLORS.primary},
                    ]}
                    textStyle={{color: value === type ? '#FFF' : textColor, fontWeight: '600'}}
                    icon={type === 'Cash' ? 'cash' : 'qrcode'}>
                    {type}
                  </Chip>
                ))}
              </View>
            )}
          />

          <Controller
            control={control}
            name="amount_paid"
            render={({field: {onChange, value}}) => (
              <AppInput
                label="Amount Received *"
                value={value?.toString()}
                onChangeText={text => {
                  const num = parseFloat(text);
                  onChange(isNaN(num) ? 0 : num);
                }}
                keyboardType="numeric"
                error={errors.amount_paid?.message}
              />
            )}
          />
        </View>

        {/* Notes */}
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Controller
            control={control}
            name="notes"
            render={({field: {onChange, value}}) => (
              <AppInput
                label="Notes (Optional)"
                value={value || ''}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
              />
            )}
          />
        </View>

        <AppButton
          title={isAdminOrManager ? 'Renew Membership' : 'Submit for Approval'}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.submitBtn}
          icon="refresh"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md},
  studentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  studentName: {fontSize: 16, fontWeight: '700'},
  pendingNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: COLORS.warning + '15',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  pendingText: {flex: 1, fontSize: 12, lineHeight: 18},
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
  fieldLabel: {fontSize: 12, marginBottom: SPACING.xs, marginLeft: 4},
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
  chipRow: {flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm},
  typeChip: {flex: 1},
  submitBtn: {marginTop: SPACING.sm},
});

export default RenewStudentScreen;
