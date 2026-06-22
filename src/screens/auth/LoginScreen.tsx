import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {TextInput} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {login, getGymAuthMethod, sendLoginOtp, verifyLoginOtp} from '../../services/authService';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, APP_NAME} from '../../constants';
import {RootStackParamList, AuthMethod} from '../../types';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import GymblixLogo from '../../components/common/GymblixLogo';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const otpSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code'),
});

type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type OtpForm = z.infer<typeof otpSchema>;
type Props = {navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>};

type Step = 'email' | 'password' | 'otp';

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [checkingMethod, setCheckingMethod] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {setAuth} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {email: ''},
  });
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {password: ''},
  });
  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: {code: ''},
  });

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.surfaceDark : COLORS.surface;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  const goBackToEmail = () => {
    setStep('email');
    passwordForm.reset({password: ''});
    otpForm.reset({code: ''});
  };

  const onSubmitEmail = async ({email: enteredEmail}: EmailForm) => {
    setCheckingMethod(true);
    const method: AuthMethod = await getGymAuthMethod(enteredEmail);
    setEmail(enteredEmail);

    if (method === 'email_otp') {
      const result = await sendLoginOtp(enteredEmail);
      setCheckingMethod(false);
      if (result.error) {
        Toast.show({type: 'error', text1: 'Could not send code', text2: result.error});
        return;
      }
      Toast.show({type: 'success', text1: 'Code sent', text2: `Check ${enteredEmail}`});
      setStep('otp');
    } else {
      setCheckingMethod(false);
      setStep('password');
    }
  };

  const onSubmitPassword = async ({password}: PasswordForm) => {
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.error) {
      Toast.show({type: 'error', text1: 'Login Failed', text2: result.error});
      return;
    }
    if (result.data) {
      setAuth(result.data.user, result.data.gym);
      Toast.show({type: 'success', text1: `Welcome back, ${result.data.user.name}!`});
    }
  };

  const onSubmitOtp = async ({code}: OtpForm) => {
    setLoading(true);
    const result = await verifyLoginOtp(email, code);
    setLoading(false);

    if (result.error) {
      Toast.show({type: 'error', text1: 'Verification Failed', text2: result.error});
      return;
    }
    if (result.data) {
      setAuth(result.data.user, result.data.gym);
      Toast.show({type: 'success', text1: `Welcome back, ${result.data.user.name}!`});
    }
  };

  const onResendOtp = async () => {
    setResending(true);
    const result = await sendLoginOtp(email);
    setResending(false);
    if (result.error) {
      Toast.show({type: 'error', text1: 'Could not resend code', text2: result.error});
    } else {
      Toast.show({type: 'success', text1: 'Code resent', text2: `Check ${email}`});
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Gradient Header */}
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[styles.header, {paddingTop: insets.top + SPACING.xl}]}>
          {/* Decorative circle */}
          <View style={styles.headerDecor1} />
          <View style={styles.headerDecor2} />

          <View style={styles.headerContent}>
            <View style={styles.logoGlow}>
              <GymblixLogo size={88} />
            </View>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <View style={styles.taglineRow}>
              <View style={styles.taglineDash} />
              <Text style={styles.tagline}>FITNESS MANAGEMENT</Text>
              <View style={styles.taglineDash} />
            </View>
          </View>
        </LinearGradient>

        {/* Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor: isDark ? COLORS.borderDark : 'transparent',
              borderWidth: isDark ? 1 : 0,
            },
          ]}>
          {step !== 'email' && (
            <TouchableOpacity style={styles.backRow} onPress={goBackToEmail} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left" size={16} color={COLORS.primary} />
              <Text style={[styles.backText, {color: COLORS.primary}]}>{email}</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.title, {color: textColor}]}>
            {step === 'email' ? 'Welcome Back' : step === 'password' ? 'Enter Password' : 'Verify Code'}
          </Text>
          <Text style={[styles.subtitle, {color: COLORS.textSecondary}]}>
            {step === 'email'
              ? 'Sign in to manage your gym'
              : step === 'password'
              ? 'Enter your password to continue'
              : `Enter the 6-digit code sent to ${email}`}
          </Text>

          {step === 'email' && (
            <>
              <Controller
                control={emailForm.control}
                name="email"
                render={({field: {onChange, value, onBlur}}) => (
                  <AppInput
                    label="Email Address"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={emailForm.formState.errors.email?.message}
                    left={<TextInput.Icon icon="email-outline" color={COLORS.primary} />}
                  />
                )}
              />
              <AppButton
                title="Continue"
                onPress={emailForm.handleSubmit(onSubmitEmail)}
                loading={checkingMethod}
                style={styles.button}
              />
            </>
          )}

          {step === 'password' && (
            <>
              <Controller
                control={passwordForm.control}
                name="password"
                render={({field: {onChange, value, onBlur}}) => (
                  <AppInput
                    label="Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showPassword}
                    error={passwordForm.formState.errors.password?.message}
                    left={<TextInput.Icon icon="lock-outline" color={COLORS.primary} />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        onPress={() => setShowPassword(prev => !prev)}
                        color={COLORS.textSecondary}
                      />
                    }
                  />
                )}
              />
              <AppButton
                title="Sign In"
                onPress={passwordForm.handleSubmit(onSubmitPassword)}
                loading={loading}
                style={styles.button}
              />
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => navigation.navigate('ForgotPassword')}
                activeOpacity={0.7}>
                <Text style={[styles.forgotText, {color: COLORS.primary}]}>Forgot Password?</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Controller
                control={otpForm.control}
                name="code"
                render={({field: {onChange, value}}) => (
                  <AppInput
                    label="6-Digit Code"
                    value={value}
                    onChangeText={t => onChange(t.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="numeric"
                    maxLength={6}
                    error={otpForm.formState.errors.code?.message}
                    left={<TextInput.Icon icon="shield-key-outline" color={COLORS.primary} />}
                  />
                )}
              />
              <AppButton
                title="Verify & Sign In"
                onPress={otpForm.handleSubmit(onSubmitOtp)}
                loading={loading}
                style={styles.button}
              />
              <TouchableOpacity style={styles.forgotBtn} onPress={onResendOtp} disabled={resending} activeOpacity={0.7}>
                <Text style={[styles.forgotText, {color: COLORS.primary}]}>
                  {resending ? 'Resending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'email' && (
            <>
              <View style={styles.divider}>
                <View style={[styles.dividerLine, {backgroundColor: borderColor}]} />
                <Text style={[styles.dividerText, {color: COLORS.textSecondary}]}>OR</Text>
                <View style={[styles.dividerLine, {backgroundColor: borderColor}]} />
              </View>

              <TouchableOpacity
                style={[
                  styles.registerBtn,
                  {
                    borderColor: isDark ? COLORS.borderDark : COLORS.border,
                    backgroundColor: isDark ? 'rgba(124,58,237,0.08)' : COLORS.background,
                  },
                ]}
                onPress={() => navigation.navigate('RegisterGym')}
                activeOpacity={0.75}>
                <View style={styles.registerIconBox}>
                  <MaterialCommunityIcons
                    name="store-plus-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={[styles.registerText, {color: textColor}]}>
                  Register a New Gym
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={[styles.footer, {color: COLORS.textSecondary}]}>
          Secure multi-gym SaaS platform
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {flexGrow: 1, paddingBottom: SPACING.xl},
  header: {
    paddingBottom: 56,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    alignItems: 'center',
  },
  headerDecor1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60,
    left: -60,
  },
  headerDecor2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -40,
    right: -30,
  },
  headerContent: {alignItems: 'center'},
  logoGlow: {
    shadowColor: '#D93B3A',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.85,
    shadowRadius: 24,
    marginBottom: 16,
  },
  appName: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taglineDash: {
    width: 20,
    height: 1.5,
    backgroundColor: 'rgba(167,139,250,0.6)',
    borderRadius: 1,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.primaryLight,
    letterSpacing: 3,
  },
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: -SPACING.xl,
    padding: SPACING.lg,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#D93B3A',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  backRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm},
  backText: {fontSize: 13, fontWeight: '600'},
  title: {fontSize: 22, fontWeight: '800', marginBottom: 4},
  subtitle: {fontSize: 13, marginBottom: SPACING.lg},
  button: {marginTop: SPACING.sm},
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dividerLine: {flex: 1, height: 1},
  dividerText: {marginHorizontal: SPACING.sm, fontSize: 12, fontWeight: '600'},
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    gap: 10,
  },
  registerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerText: {flex: 1, fontSize: 14, fontWeight: '600'},
  forgotBtn: {alignSelf: 'flex-end', marginTop: SPACING.xs, marginBottom: SPACING.xs},
  forgotText: {fontSize: 13, fontWeight: '600'},
  footer: {textAlign: 'center', fontSize: 11, marginTop: SPACING.lg},
});

export default LoginScreen;
