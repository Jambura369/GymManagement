import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import Toast from 'react-native-toast-message';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {resetPassword} from '../../services/authService';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {RootStackParamList} from '../../types';
import AppInput from '../../components/common/AppInput';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;
type Props = {navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>};

const ForgotPasswordScreen: React.FC<Props> = ({navigation}) => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    getValues,
    formState: {errors},
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {email: ''},
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const result = await resetPassword(data.email);
    setLoading(false);

    if (result.error) {
      Toast.show({type: 'error', text1: 'Failed', text2: result.error});
      return;
    }

    setSent(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Ambient glow */}
      <View style={styles.ambientGlow} />

      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {sent ? (
          <View style={styles.successContent}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="email-check-outline" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.heading}>Check your inbox</Text>
            <Text style={styles.subText}>
              A password reset link was sent to{'\n'}
              <Text style={styles.emailHighlight}>{getValues('email')}</Text>
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.primaryBtnText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="lock-reset" size={36} color={COLORS.primary} />
            </View>

            {/* Heading */}
            <Text style={styles.heading}>Forgot Password?</Text>
            <Text style={styles.subText}>
              Enter your email address to receive a{'\n'}password reset link.
            </Text>

            {/* Form */}
            <View style={styles.form}>
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

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={loading}>
                <Text style={styles.primaryBtnText}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.linkBtnText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  ambientGlow: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: COLORS.primary,
    opacity: 0.04,
    top: -100,
    left: -100,
  },
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
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    gap: SPACING.md,
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    gap: SPACING.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.pill,
    backgroundColor: '#1D201F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  heading: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: {
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  form: {
    width: '100%',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  primaryBtn: {
    height: 48,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semiBold,
    color: '#151f00',
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  linkBtnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default ForgotPasswordScreen;
