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
} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {TextInput} from 'react-native-paper';
import {showImagePicker} from '../../utils/imagePicker';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {registerGym} from '../../services/authService';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, APP_NAME} from '../../constants';
import {RootStackParamList} from '../../types';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';

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

const RegisterGymScreen: React.FC<Props> = ({navigation}) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [gymLogo, setGymLogo] = useState<string | null>(null);
  const [paymentQr, setPaymentQr] = useState<string | null>(null);
  const {setAuth} = useAuthStore();
  const {isDark} = useThemeStore();

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;

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
    showImagePicker({quality: 0.8, maxWidth: 800, maxHeight: 800}, uri => {
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
      Toast.show({
        type: 'success',
        text1: 'Gym Registered!',
        text2: `Welcome to ${APP_NAME}`,
      });
      setAuth(result.data.user, result.data.gym);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader
        title="Register Your Gym"
        subtitle="Set up your gym account"
        onBack={() => navigation.goBack()}
        isDark={isDark}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Section: Gym Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>
            Gym Information
          </Text>

          {/* Logo Upload */}
          <TouchableOpacity
            style={styles.imageUpload}
            onPress={() => pickImage('logo')}>
            {gymLogo ? (
              <Image source={{uri: gymLogo}} style={styles.logoImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <MaterialCommunityIcons
                  name="store-outline"
                  size={32}
                  color={COLORS.placeholder}
                />
                <Text style={styles.uploadText}>Upload Gym Logo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Controller
            control={control}
            name="gym_name"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Gym Name *"
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
                label="Address *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={2}
                error={errors.address?.message}
              />
            )}
          />

          {/* Payment QR Upload */}
          <TouchableOpacity
            style={styles.qrUpload}
            onPress={() => pickImage('qr')}>
            {paymentQr ? (
              <Image source={{uri: paymentQr}} style={styles.qrImage} />
            ) : (
              <View style={styles.qrPlaceholder}>
                <MaterialCommunityIcons
                  name="qrcode"
                  size={28}
                  color={COLORS.placeholder}
                />
                <Text style={styles.uploadText}>Upload Payment QR (Optional)</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Section: Owner Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>
            Owner Information
          </Text>

          <Controller
            control={control}
            name="owner_name"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Owner Name *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.owner_name?.message}
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
        </View>

        {/* Section: Account */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>
            Account Credentials
          </Text>

          <Controller
            control={control}
            name="email"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Email Address *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
                left={<TextInput.Icon icon="email-outline" />}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Password *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showPassword}
                error={errors.password?.message}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowPassword(p => !p)}
                  />
                }
              />
            )}
          />

          <Controller
            control={control}
            name="confirm_password"
            render={({field: {onChange, value, onBlur}}) => (
              <AppInput
                label="Confirm Password *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showConfirmPassword}
                error={errors.confirm_password?.message}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowConfirmPassword(p => !p)}
                  />
                }
              />
            )}
          />
        </View>

        <AppButton
          title="Register Gym"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.submitBtn}
          icon="store-check-outline"
        />

        <Text style={styles.terms}>
          By registering, you agree to our Terms of Service
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md, paddingBottom: SPACING.xxl},
  section: {
    backgroundColor: COLORS.surface,
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
  imageUpload: {
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  uploadPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  qrUpload: {
    alignSelf: 'center',
    marginTop: SPACING.sm,
  },
  qrImage: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  qrPlaceholder: {
    width: 160,
    height: 60,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
  },
  uploadText: {fontSize: 11, color: COLORS.placeholder, textAlign: 'center', marginTop: 4},
  submitBtn: {marginTop: SPACING.sm, marginBottom: SPACING.sm},
  terms: {textAlign: 'center', fontSize: 11, color: COLORS.textSecondary},
});

export default RegisterGymScreen;
