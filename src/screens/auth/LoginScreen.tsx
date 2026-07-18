import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {login} from '../../services/authService';
import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList} from '../../types';
import GymblixWordmark from '../../components/common/GymblixWordmark';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;
type Props = {navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>};

// Field — label-above, icon-prefixed dark input matching the brand UI kit.
const Field: React.FC<{
  label: string;
  icon: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder: string;
  error?: string;
  secureTextEntry?: boolean;
  rightIcon?: string;
  onRightIconPress?: () => void;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences';
  maxLength?: number;
}> = ({
  label,
  icon,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  secureTextEntry,
  rightIcon,
  onRightIconPress,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
}) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.inputBox, error ? styles.inputBoxError : null]}>
      <MaterialCommunityIcons name={icon} size={18} color={COLORS.textSecondary} />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        style={styles.input}
      />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} hitSlop={8}>
          <MaterialCommunityIcons name={rightIcon} size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
    {error ? <Text style={styles.fieldError}>{error}</Text> : null}
  </View>
);

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {setAuth} = useAuthStore();
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {email: '', password: ''},
  });

  const onSubmit = async ({email, password}: LoginForm) => {
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

  const onSocialPress = (provider: string) => {
    Toast.show({type: 'info', text1: `${provider} sign-in coming soon`});
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingTop: insets.top + SPACING.xl}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.logoRow}>
          <GymblixWordmark width={140} />
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Access your fitness command center</Text>

        <Controller
          control={control}
          name="email"
          render={({field: {onChange, value, onBlur}}) => (
            <Field
              label="Work Email"
              icon="email-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="name@gym.com"
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
            <Field
              label="Password"
              icon="lock-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(prev => !prev)}
              error={errors.password?.message}
            />
          )}
        />

        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => navigation.navigate('ForgotPassword')}
          activeOpacity={0.7}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
          activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>{loading ? 'Please wait…' : 'Log In'}</Text>
          {!loading && (
            <MaterialCommunityIcons name="arrow-right" size={18} color={COLORS.background} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('RegisterGym')}
          activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Register your gym</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => onSocialPress('Google')}
            activeOpacity={0.8}>
            <MaterialCommunityIcons name="google" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => onSocialPress('Apple')}
            activeOpacity={0.8}>
            <MaterialCommunityIcons name="apple" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  logoRow: {alignItems: 'center', marginBottom: SPACING.xl},
  title: {
    fontSize: FONT_SIZE.xl + 6,
    fontWeight: FONT_WEIGHT.extraBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  fieldGroup: {marginBottom: SPACING.md},
  fieldLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 56,
  },
  inputBoxError: {borderColor: COLORS.error},
  input: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    padding: 0,
  },
  fieldError: {fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: SPACING.xs},
  forgotBtn: {alignSelf: 'flex-end', marginBottom: SPACING.md, marginTop: -SPACING.xs},
  forgotText: {fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.primary},
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 56,
    marginTop: SPACING.sm,
  },
  primaryBtnDisabled: {opacity: 0.6},
  primaryBtnText: {fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.background},
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(245,247,245,0.10)',
    height: 56,
    marginTop: SPACING.sm,
  },
  secondaryBtnText: {fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  dividerLine: {flex: 1, height: 1, backgroundColor: COLORS.border},
  dividerText: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary},
  socialRow: {flexDirection: 'row', justifyContent: 'center', gap: SPACING.md},
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LoginScreen;
