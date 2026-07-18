import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {showImagePicker, PICKER_PRESETS} from '../../utils/imagePicker';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {registerGym} from '../../services/authService';
import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {APP_NAME} from '../../constants';
import {RootStackParamList} from '../../types';
import AppInput from '../../components/common/AppInput';

const PHONE_REGEX = /^[6-9]\d{9}$|^\+?[1-9]\d{7,14}$/;

const schema = z
  .object({
    gym_name: z.string().min(2, 'Gym name must be at least 2 characters'),
    owner_name: z.string().min(2, 'Owner name required'),
    phone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .regex(PHONE_REGEX, 'Enter a valid phone number'),
    email: z.string().email('Invalid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/\d/, 'Password must contain at least one number'),
    confirm_password: z.string(),
    address: z.string().min(5, 'Address required'),
  })
  .refine(data => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type FormData = z.infer<typeof schema>;
type Props = {navigation: NativeStackNavigationProp<RootStackParamList, 'RegisterGym'>};

const STEPS = ['Gym Info', 'Owner Info', 'Account'];

const RegisterGymScreen: React.FC<Props> = ({navigation}) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [gymLogo, setGymLogo] = useState<string | null>(null);
  const [paymentQr, setPaymentQr] = useState<string | null>(null);
  const {setAuth} = useAuthStore();
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      gym_name: '',
      owner_name: '',
      phone: '',
      email: '',
      password: '',
      confirm_password: '',
      address: '',
    },
  });

  const pickImage = (type: 'logo' | 'qr') => {
    showImagePicker(PICKER_PRESETS.LOGO, uri => {
      if (type === 'logo') setGymLogo(uri);
      else setPaymentQr(uri);
    });
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const result = await registerGym({
      ...data,
      gym_logo: gymLogo || undefined,
      payment_qr: paymentQr || undefined,
    });
    setLoading(false);

    if (result.error) {
      Toast.show({
        type: result.error.includes('verify your email') ? 'info' : 'error',
        text1: result.error.includes('verify your email') ? 'Check Your Email' : 'Registration Failed',
        text2: result.error,
        visibilityTime: 5000,
      });
      return;
    }

    if (result.data) {
      Toast.show({type: 'success', text1: 'Gym Registered!', text2: `Welcome to ${APP_NAME}`});
      setAuth(result.data.user, result.data.gym);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor="#111413" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Gym</Text>
        <Text style={styles.stepLabel}>Step {step} of {STEPS.length}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Step 1: Gym Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GYM INFORMATION</Text>

          {/* Logo Upload */}
          <View style={styles.logoRow}>
            <TouchableOpacity style={styles.logoBtn} onPress={() => pickImage('logo')}>
              {gymLogo ? (
                <Image source={{uri: gymLogo}} style={styles.logoImage} />
              ) : (
                <MaterialCommunityIcons name="camera-plus-outline" size={36} color={COLORS.textSecondary} />
              )}
            </TouchableOpacity>
            {/* Plus indicator */}
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons name="plus" size={16} color="#0b0f0e" />
            </View>
          </View>
          <Text style={styles.uploadHint}>Upload Gym Logo</Text>

          <Controller
            control={control}
            name="gym_name"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Gym Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.gym_name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="address"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Gym Address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={2}
                error={errors.address?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Gym Phone"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                error={errors.phone?.message}
              />
            )}
          />
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Your gym profile will be visible to members. You can update this information later in Settings.
          </Text>
        </View>

        {/* Owner Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OWNER INFORMATION</Text>

          <Controller
            control={control}
            name="owner_name"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Owner Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.owner_name?.message}
              />
            )}
          />
        </View>

        {/* Account Credentials */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT CREDENTIALS</Text>

          <Controller
            control={control}
            name="email"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Email Address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showPassword}
                error={errors.password?.message}
                right={
                  <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={{padding: 8}}>
                    <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                }
              />
            )}
          />

          <Controller
            control={control}
            name="confirm_password"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Confirm Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showConfirmPassword}
                error={errors.confirm_password?.message}
                right={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)} style={{padding: 8}}>
                    <MaterialCommunityIcons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                }
              />
            )}
          />
        </View>

        {/* Payment QR */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PAYMENT QR (OPTIONAL)</Text>
          <TouchableOpacity style={styles.qrUpload} onPress={() => pickImage('qr')}>
            {paymentQr ? (
              <Image source={{uri: paymentQr}} style={styles.qrImage} />
            ) : (
              <View style={styles.qrPlaceholder}>
                <MaterialCommunityIcons name="qrcode" size={28} color={COLORS.textSecondary} />
                <Text style={styles.uploadHint}>Upload Payment QR</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[styles.actionBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
        <TouchableOpacity
          style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}>
          <Text style={styles.continueBtnText}>{loading ? 'REGISTERING...' : 'CONTINUE'}</Text>
          {!loading && (
            <MaterialCommunityIcons name="arrow-right" size={18} color="#0b0f0e" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: '#111413',
    gap: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  stepLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
  },
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  logoRow: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: SPACING.xs,
  },
  logoBtn: {
    width: 128,
    height: 128,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 128,
    height: 128,
    borderRadius: RADIUS.pill,
  },
  logoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadHint: {
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: '#191c1b',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  qrUpload: {
    alignSelf: 'center',
  },
  qrImage: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  qrPlaceholder: {
    width: 160,
    height: 60,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  bottomSpacer: {height: SPACING.xl},
  actionBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  continueBtn: {
    height: 48,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  continueBtnDisabled: {opacity: 0.6},
  continueBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: '#0b0f0e',
    letterSpacing: 0.5,
  },
});

export default RegisterGymScreen;
