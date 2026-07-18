import React, {useState, useEffect, useCallback, useRef} from 'react';
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Chip} from 'react-native-paper';
import {showImagePicker, PICKER_PRESETS} from '../../utils/imagePicker';
import Toast from 'react-native-toast-message';
import DatePickerModal from '../../components/common/DatePickerModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useStudentStore} from '../../store/studentStore';
import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList, Package, User} from '../../types';
import {fetchPackages} from '../../services/packageService';
import {fetchUsers} from '../../services/userService';
import AppButton from '../../components/common/AppButton';
import FormField from '../../components/common/FormField';
import AppHeader from '../../components/common/AppHeader';
import SelectPicker from '../../components/common/SelectPicker';
import ImageViewerModal from '../../components/common/ImageViewerModal';

const PHONE_REGEX = /^[6-9]\d{9}$|^\+?[1-9]\d{7,14}$/;

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .regex(PHONE_REGEX, 'Enter a valid phone number'),
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

// Preview the membership expiry from the joining date + selected package type
// (mirrors the server's renewal duration). Display-only.
const computeExpiry = (start: string, pkgType?: string): string => {
  if (!pkgType) return '';
  const d = dayjs(start);
  switch (pkgType) {
    case 'Monthly':
      return d.add(1, 'month').format('DD MMM YYYY');
    case 'Quarterly':
      return d.add(3, 'month').format('DD MMM YYYY');
    case 'Half Year':
      return d.add(6, 'month').format('DD MMM YYYY');
    case 'Yearly':
      return d.add(1, 'year').format('DD MMM YYYY');
    default:
      return '';
  }
};

const AddStudentScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const {addStudent} = useStudentStore();

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const savedRef = useRef(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState('');
  const [trainers, setTrainers] = useState<User[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {errors, isDirty},
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
  const paymentType = watch('payment_type');
  const selectedPackageId = watch('package_id');

  const selectedPackage = packages.find(p => p.id === selectedPackageId);
  const expiryPreview = computeExpiry(joiningDate, selectedPackage?.type);

  useEffect(() => {
    loadData();
  }, []);

  // Warn user before discarding unsaved changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (savedRef.current || (!isDirty && !image)) return;
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
  }, [navigation, isDirty, image]);

  useEffect(() => {
    // Auto-fill amount from package
    const pkg = packages.find(p => p.id === selectedPackageId);
    if (pkg) setValue('amount_paid', pkg.price);
  }, [selectedPackageId, packages]);

  const loadData = async () => {
    if (!gym) return;
    setPackagesLoading(true);
    setPackagesError('');
    const [pkgRes, trainerRes] = await Promise.all([
      fetchPackages(gym.id, true),
      fetchUsers(gym.id, 'Trainer'),
    ]);
    setPackagesLoading(false);
    if (pkgRes.data) {
      setPackages(pkgRes.data);
      if (pkgRes.data.length === 0) {
        setPackagesError('No packages found. Please create at least one package in Gym Settings first.');
      }
    } else {
      setPackagesError(pkgRes.error || 'Failed to load packages');
    }
    if (trainerRes.data) setTrainers(trainerRes.data);
  };

  const pickImage = () => {
    showImagePicker(PICKER_PRESETS.AVATAR, uri => setImage(uri));
  };

  const onSubmit = async (data: FormData) => {
    if (!gym || !user) return;
    setLoading(true);

    const {id: studentId, error: addError} = await addStudent(gym.id, user.id, user.role, {
      ...data,
      image: image || undefined,
      email: data.email || undefined,
      trainer_id: data.trainer_id || undefined,
    });

    setLoading(false);

    const isAdminOrManager = user.role === 'Admin' || user.role === 'Manager';
    if (studentId) {
      savedRef.current = true;
      Toast.show({
        type: 'success',
        text1: 'Student Added!',
        text2: isAdminOrManager
          ? 'Student is now active.'
          : 'Waiting for Admin/Manager verification.',
      });
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Failed', text2: addError ?? 'Could not add student'});
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="Add Student" onBack={() => navigation.goBack()} isDark={true} />
      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Profile photo */}
        <View style={styles.photoBlock}>
          <TouchableOpacity
            style={styles.photoRing}
            onPress={() => (image ? setViewerVisible(true) : pickImage())}
            activeOpacity={0.8}>
            {image ? (
              <Image source={{uri: image}} style={styles.photo} />
            ) : (
              <MaterialCommunityIcons
                name="camera-plus-outline"
                size={32}
                color={COLORS.textSecondary}
              />
            )}
            <View style={styles.photoBadge}>
              <MaterialCommunityIcons name="plus" size={16} color={COLORS.background} />
            </View>
          </TouchableOpacity>
          {image ? (
            <View style={styles.photoActions}>
              <TouchableOpacity onPress={pickImage} style={styles.photoActionBtn}>
                <MaterialCommunityIcons name="image-edit" size={15} color={COLORS.primary} />
                <Text style={[styles.photoActionText, {color: COLORS.primary}]}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setImage(null)} style={styles.photoActionBtn}>
                <MaterialCommunityIcons name="close-circle" size={15} color={COLORS.error} />
                <Text style={[styles.photoActionText, {color: COLORS.error}]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.photoLabel}>Upload Profile Photo</Text>
          )}
        </View>

        {/* Identity */}
        <Controller
          control={control}
          name="name"
          render={({field: {onChange, value, onBlur}}) => (
            <FormField
              label="Full Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. Alex Rivera"
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({field: {onChange, value, onBlur}}) => (
            <FormField
              label="Phone Number"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              placeholder="+91 00000 00000"
              error={errors.phone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({field: {onChange, value, onBlur}}) => (
            <FormField
              label="Email Address"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="name@email.com"
              error={errors.email?.message}
            />
          )}
        />

        {/* Membership package */}
        <Text style={styles.fieldLabel}>Membership Package</Text>
        {packagesError ? (
          <View style={styles.packageAlert}>
            <Text style={styles.packageAlertText}>{packagesError}</Text>
          </View>
        ) : null}
        <Controller
          control={control}
          name="package_id"
          render={({field: {onChange, value}}) => (
            <SelectPicker
              label={packagesLoading ? 'Loading packages…' : 'Select a package'}
              value={value}
              options={packageOptions}
              onSelect={onChange}
              error={errors.package_id?.message}
              isDark={true}
            />
          )}
        />

        {/* Start / Expiry dates */}
        <View style={styles.dateRow}>
          <FormField
            label="Start Date"
            value={dayjs(joiningDate).format('DD MMM YYYY')}
            leftIcon="calendar"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateHalf}
          />
          <FormField
            label="Expiry Date"
            value={expiryPreview}
            placeholder="Auto"
            leftIcon="calendar-end"
            readOnly
            style={styles.dateHalf}
          />
        </View>

        <DatePickerModal
          visible={showDatePicker}
          value={joiningDate || dayjs().format('YYYY-MM-DD')}
          isDark={true}
          onConfirm={date => {
            setValue('joining_date', date);
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
        />

        {/* Assign trainer (Admin/Manager) */}
        {user?.role !== 'Trainer' && (
          <>
            <Text style={styles.fieldLabel}>Assign Trainer</Text>
            <Controller
              control={control}
              name="trainer_id"
              render={({field: {onChange, value}}) => (
                <SelectPicker
                  label="No Trainer"
                  value={value || ''}
                  options={trainerOptions}
                  onSelect={onChange}
                  isDark={true}
                />
              )}
            />
          </>
        )}

        {/* Payment */}
        <Text style={styles.fieldLabel}>Payment Type</Text>
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
                  style={[styles.typeChip, value === type && {backgroundColor: COLORS.primary}]}
                  textStyle={{
                    color: value === type ? '#151f00' : COLORS.textPrimary,
                    fontWeight: '600',
                  }}
                  icon={type === 'Cash' ? 'cash' : 'qrcode'}>
                  {type}
                </Chip>
              ))}
            </View>
          )}
        />

        {paymentType === 'QR' && (
          <TouchableOpacity
            style={styles.qrBanner}
            onPress={() => navigation.navigate('PaymentQR')}
            activeOpacity={0.75}>
            <MaterialCommunityIcons name="qrcode" size={22} color={COLORS.success} />
            <Text style={styles.qrBannerText}>Show Payment QR to student</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.success} />
          </TouchableOpacity>
        )}

        <Controller
          control={control}
          name="amount_paid"
          render={({field: {onChange, value}}) => (
            <FormField
              label="Amount Received"
              value={value?.toString()}
              onChangeText={text => {
                const num = parseFloat(text);
                onChange(isNaN(num) ? 0 : num);
              }}
              keyboardType="numeric"
              placeholder="0"
              leftIcon="currency-inr"
              error={errors.amount_paid?.message}
            />
          )}
        />

        {/* Notes */}
        <Controller
          control={control}
          name="notes"
          render={({field: {onChange, value}}) => (
            <FormField
              label="Notes"
              value={value || ''}
              onChangeText={onChange}
              multiline
              placeholder="Injuries, goals, or specific dietary requirements..."
            />
          )}
        />

        <AppButton
          title="Save Student"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.submitBtn}
          icon="account-plus"
        />

        <Text style={styles.hint}>
          {user?.role === 'Trainer'
            ? 'Student will be pending verification until Admin/Manager approves.'
            : 'Student will be activated immediately.'}
        </Text>
      </ScrollView>

      <ImageViewerModal
        visible={viewerVisible}
        uri={image}
        onClose={() => setViewerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  scroll: {padding: SPACING.md},
  photoBlock: {alignItems: 'center', marginBottom: SPACING.lg, marginTop: SPACING.sm},
  photoRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {width: 112, height: 112, borderRadius: 56},
  photoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  photoLabel: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.sm},
  photoActions: {flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm},
  photoActionBtn: {flexDirection: 'row', alignItems: 'center', gap: 4},
  photoActionText: {fontSize: 12, fontWeight: '600'},
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  dateRow: {flexDirection: 'row', gap: SPACING.sm},
  dateHalf: {flex: 1},
  chipRow: {flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md},
  typeChip: {flex: 1},
  qrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.success + '15',
    borderWidth: 1,
    borderColor: COLORS.success + '40',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  qrBannerText: {flex: 1, color: COLORS.success, fontWeight: '600', fontSize: 13},
  submitBtn: {marginTop: SPACING.sm},
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  packageAlert: {
    backgroundColor: COLORS.warning + '20',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  packageAlertText: {fontSize: 12, color: COLORS.warning, lineHeight: 18},
});

export default AddStudentScreen;
