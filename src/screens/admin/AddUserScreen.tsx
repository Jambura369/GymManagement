import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Chip, TextInput} from 'react-native-paper';
import {showImagePicker} from '../../utils/imagePicker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {addUser} from '../../services/userService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';

const PHONE_REGEX = /^[6-9]\d{9}$|^\+?[1-9]\d{7,14}$/;

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    phone: z
      .string()
      .min(10, 'Phone must be at least 10 digits')
      .regex(PHONE_REGEX, 'Enter a valid phone number'),
    role: z.enum(['Manager', 'Trainer']),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/\d/, 'Password must contain at least one number'),
    confirm_password: z.string(),
  })
  .refine(data => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type FormData = z.infer<typeof schema>;

const AddUserScreen: React.FC = () => {
  const navigation = useNavigation();
  const {gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      email: '',
      phone: '',
      role: 'Trainer',
      password: '',
      confirm_password: '',
    },
  });

  const selectedRole = watch('role');

  const pickImage = () => {
    showImagePicker({quality: 0.8, maxWidth: 600, maxHeight: 600}, uri =>
      setImage(uri),
    );
  };

  const onSubmit = async (data: FormData) => {
    if (!gym) return;
    setLoading(true);
    const result = await addUser(gym.id, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      password: data.password,
      avatar: image || undefined,
    });
    setLoading(false);
    if (result.data) {
      Toast.show({
        type: 'success',
        text1: 'Staff Added!',
        text2: `${data.name} can now log in`,
      });
      navigation.goBack();
    } else {
      Toast.show({
        type: 'error',
        text1: 'Failed to add staff',
        text2: result.error || undefined,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader
        title="Add Staff Member"
        onBack={() => navigation.goBack()}
        isDark={isDark}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {paddingBottom: SPACING.xxl + insets.bottom},
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Photo */}
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          {image ? (
            <Image source={{uri: image}} style={styles.photo} />
          ) : (
            <View
              style={[
                styles.photoPlaceholder,
                {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface},
              ]}>
              <MaterialCommunityIcons
                name="camera-plus-outline"
                size={32}
                color={COLORS.placeholder}
              />
              <Text style={styles.photoText}>Add Photo</Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <MaterialCommunityIcons name="pencil" size={14} color="#FFF" />
          </View>
        </TouchableOpacity>

        {/* Role */}
        <View
          style={[
            styles.section,
            {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface},
          ]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>
            Role
          </Text>
          <View style={styles.chipRow}>
            {(['Manager', 'Trainer'] as const).map(role => (
              <Chip
                key={role}
                selected={selectedRole === role}
                onPress={() => setValue('role', role)}
                style={[
                  styles.roleChip,
                  selectedRole === role && {backgroundColor: COLORS.primary},
                ]}
                textStyle={{
                  color: selectedRole === role ? '#FFF' : textColor,
                  fontSize: 13,
                }}
                icon={
                  role === 'Manager' ? 'account-supervisor' : 'account-tie'
                }>
                {role}
              </Chip>
            ))}
          </View>
        </View>

        {/* Details */}
        <View
          style={[
            styles.section,
            {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface},
          ]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>
            Details
          </Text>

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
                label="Phone *"
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
                label="Email *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />
        </View>

        {/* Credentials */}
        <View
          style={[
            styles.section,
            {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface},
          ]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>
            Login Credentials
          </Text>

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
                    icon={showPassword ? 'eye-off' : 'eye'}
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
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(p => !p)}
                  />
                }
              />
            )}
          />
        </View>

        <AppButton
          title="Add Staff Member"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          icon="account-plus"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md},
  photoContainer: {
    alignSelf: 'center',
    marginBottom: SPACING.md,
    position: 'relative',
  },
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
  },
  photoText: {fontSize: 11, color: COLORS.placeholder, marginTop: 4},
  photoEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
  },
  chipRow: {flexDirection: 'row', gap: SPACING.sm},
  roleChip: {flex: 1},
});

export default AddUserScreen;
