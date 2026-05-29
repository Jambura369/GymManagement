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

import {login} from '../../services/authService';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, APP_NAME} from '../../constants';
import {RootStackParamList} from '../../types';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import GymProLogo from '../../components/common/GymProLogo';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;
type Props = {navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>};

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {setAuth} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {email: '', password: ''},
  });

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.surfaceDark : COLORS.surface;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    const result = await login(data.email, data.password);
    setLoading(false);

    if (result.error) {
      Toast.show({type: 'error', text1: 'Login Failed', text2: result.error});
      return;
    }

    if (result.data) {
      setAuth(result.data.user, result.data.gym);
      Toast.show({
        type: 'success',
        text1: `Welcome back, ${result.data.user.name}!`,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              <GymProLogo size={80} />
            </View>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <View style={styles.taglineRow}>
              <View style={styles.taglineDash} />
              <Text style={styles.tagline}>Power Your Gym</Text>
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
          <Text style={[styles.title, {color: textColor}]}>Welcome Back</Text>
          <Text style={[styles.subtitle, {color: COLORS.textSecondary}]}>
            Sign in to manage your gym
          </Text>

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
                left={
                  <TextInput.Icon
                    icon="email-outline"
                    color={COLORS.primary}
                  />
                }
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
                left={
                  <TextInput.Icon
                    icon="lock-outline"
                    color={COLORS.primary}
                  />
                }
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
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.button}
          />

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
    shadowColor: 'rgba(245,158,11,0.5)',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 20,
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
    backgroundColor: 'rgba(252,211,77,0.6)',
    borderRadius: 1,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.goldLight,
    letterSpacing: 1.5,
  },
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: -SPACING.xl,
    padding: SPACING.lg,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#7C3AED',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
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
  footer: {textAlign: 'center', fontSize: 11, marginTop: SPACING.lg},
});

export default LoginScreen;
