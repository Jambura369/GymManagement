import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {TextInput} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import LinearGradient from 'react-native-linear-gradient';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {resetPassword} from '../../services/authService';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList} from '../../types';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;
type Props = {navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>};

const ForgotPasswordScreen: React.FC<Props> = ({navigation}) => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.surfaceDark : COLORS.surface;

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
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[styles.header, {paddingTop: insets.top + SPACING.xl}]}>
          <View style={styles.headerDecor} />
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="lock-reset" size={52} color="#FFF" />
          </View>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <Text style={styles.headerSub}>
            Enter your email and we'll send you a reset link
          </Text>
        </LinearGradient>

        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor: isDark ? COLORS.borderDark : 'transparent',
              borderWidth: isDark ? 1 : 0,
            },
          ]}>

          {sent ? (
            <View style={styles.successBox}>
              <MaterialCommunityIcons
                name="email-check-outline"
                size={52}
                color={COLORS.success}
              />
              <Text style={[styles.successTitle, {color: textColor}]}>
                Check your inbox
              </Text>
              <Text style={[styles.successMsg, {color: COLORS.textSecondary}]}>
                A password reset link was sent to{'\n'}
                <Text style={{fontWeight: '700', color: textColor}}>
                  {getValues('email')}
                </Text>
              </Text>
              <AppButton
                title="Back to Login"
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                icon="arrow-left"
              />
            </View>
          ) : (
            <>
              <Text style={[styles.title, {color: textColor}]}>Forgot Password?</Text>
              <Text style={[styles.subtitle, {color: COLORS.textSecondary}]}>
                We'll email you a secure link to reset your password.
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
                      <TextInput.Icon icon="email-outline" color={COLORS.primary} />
                    }
                  />
                )}
              />

              <AppButton
                title="Send Reset Link"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                style={styles.button}
                icon="send"
              />

              <AppButton
                title="Back to Login"
                onPress={() => navigation.goBack()}
                mode="outlined"
                style={styles.backBtn}
                icon="arrow-left"
              />
            </>
          )}
        </View>
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
    gap: SPACING.sm,
  },
  headerDecor: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60,
    right: -40,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    lineHeight: 20,
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
  title: {fontSize: 20, fontWeight: '800', marginBottom: 4},
  subtitle: {fontSize: 13, marginBottom: SPACING.lg, lineHeight: 20},
  button: {marginTop: SPACING.sm},
  backBtn: {marginTop: SPACING.sm},
  successBox: {alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md},
  successTitle: {fontSize: 20, fontWeight: '800'},
  successMsg: {fontSize: 14, textAlign: 'center', lineHeight: 22},
});

export default ForgotPasswordScreen;
