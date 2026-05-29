import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Chip} from 'react-native-paper';
import {launchImageLibrary} from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import DatePickerModal from '../../components/common/DatePickerModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useStudentStore} from '../../store/studentStore';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList, Package, User} from '../../types';
import {fetchPackages} from '../../services/packageService';
import {fetchUsers} from '../../services/userService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';
import SelectPicker from '../../components/common/SelectPicker';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().min(10, 'Valid phone required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  joining_date: z.string(),
  package_id: z.string().min(1, 'Select a package'),
  payment_type: z.enum(['Cash', 'QR']),
  amount_paid: z.number().min(0, 'Amount must be positive'),
  trainer_id: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'AddStudent'>;

const AddStudentScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const {addStudent} = useStudentStore();

  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {errors},
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      joining_date: dayjs().format('YYYY-MM-DD'),
      package_id: '',
      payment_type: 'Cash',
      amount_paid: 0,
      trainer_id: user?.role === 'Trainer' ? user.id : '',
      notes: '',
    },
  });

  const joiningDate = watch('joining_date');
  const selectedPackageId = watch('package_id');


  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-fill amount from package
    const pkg = packages.find(p => p.id === selectedPackageId);
    if (pkg) setValue('amount_paid', pkg.price);
  }, [selectedPackageId, packages]);

  const loadData = async () => {
    if (!gym) return;
    const [pkgRes, trainerRes] = await Promise.all([
      fetchPackages(gym.id, true),
      fetchUsers(gym.id, 'Trainer'),
    ]);
    if (pkgRes.data) setPackages(pkgRes.data);
    if (trainerRes.data) setTrainers(trainerRes.data);
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 600,
      maxHeight: 600,
    });
    if (!result.didCancel && result.assets?.[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!gym || !user) return;
    setLoading(true);

    const studentId = await addStudent(gym.id, user.id, {
      ...data,
      image: image || undefined,
      email: data.email || undefined,
      trainer_id: data.trainer_id || undefined,
    });

    setLoading(false);

    if (studentId) {
      Toast.show({
        type: 'success',
        text1: 'Student Added!',
        text2: 'Waiting for verification approval.',
      });
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed', text2: 'Could not add student'});
    }
  };

  const packageOptions = packages.map(p => ({
    label: `${p.name} — ₹${p.price}`,
    value: p.id,
  }));

  const trainerOptions = [
    {label: 'No Trainer', value: ''},
    ...trainers.map(t => ({label: t.name, value: t.id})),
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader
        title="Add New Student"
        onBack={() => navigation.goBack()}
        isDark={isDark}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Photo */}
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          {image ? (
            <Image source={{uri: image}} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialCommunityIcons
                name="camera-plus-outline"
                size={32}
                color={COLORS.placeholder}
              />
              <Text style={styles.photoText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Personal Info */}
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Personal Info</Text>

          <Controller
            control={control}
            name="name"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Full Name *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Phone Number *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                error={errors.phone?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Email (Optional)"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />
        </View>

        {/* Membership */}
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Membership</Text>

          {/* Joining Date */}
          <TouchableOpacity
            style={[styles.dateField, {borderColor: COLORS.border}]}
            onPress={() => setShowDatePicker(true)}>
            <MaterialCommunityIcons
              name="calendar"
              size={20}
              color={COLORS.textSecondary}
            />
            <View style={styles.dateContent}>
              <Text style={styles.dateLabel}>Joining Date</Text>
              <Text style={[styles.dateValue, {color: textColor}]}>
                {dayjs(joiningDate).format('DD MMM YYYY')}
              </Text>
            </View>
          </TouchableOpacity>

          <DatePickerModal
            visible={showDatePicker}
            value={joiningDate || dayjs().format('YYYY-MM-DD')}
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
                options={packageOptions}
                onSelect={onChange}
                error={errors.package_id?.message}
                isDark={isDark}
              />
            )}
          />

          {user?.role !== 'Trainer' && (
            <Controller
              control={control}
              name="trainer_id"
              render={({field: {onChange, value}}) => (
                <SelectPicker
                  label="Assign Trainer"
                  value={value || ''}
                  options={trainerOptions}
                  onSelect={onChange}
                  isDark={isDark}
                />
              )}
            />
          )}
        </View>

        {/* Payment */}
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Payment</Text>

          <Text style={[styles.fieldLabel, {color: COLORS.textSecondary}]}>
            Payment Type *
          </Text>
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
                    textStyle={{
                      color: value === type ? '#FFF' : textColor,
                      fontWeight: '600',
                    }}
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
                onChangeText={text => onChange(Number(text) || 0)}
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
          title="Add Student"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.submitBtn}
          icon="account-plus"
        />

        <Text style={styles.hint}>
          Student will be pending verification until Admin/Manager approves.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md, paddingBottom: SPACING.xxl},
  photoContainer: {alignSelf: 'center', marginBottom: SPACING.md},
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  photoText: {fontSize: 11, color: COLORS.placeholder, marginTop: 4},
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
  fieldLabel: {fontSize: 12, marginBottom: SPACING.xs, marginLeft: 4},
  chipRow: {flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm},
  typeChip: {flex: 1},
  submitBtn: {marginTop: SPACING.sm},
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
});

export default AddStudentScreen;
