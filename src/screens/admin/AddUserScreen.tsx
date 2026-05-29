import React, {useState} from 'react';
import {StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Chip, TextInput} from 'react-native-paper';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {addUser} from '../../services/userService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Phone required'),
  role: z.enum(['Manager', 'Trainer']),
  password: z.string().min(6, 'Password min 6 chars'),
});

type FormData = z.infer<typeof schema>;

const AddUserScreen: React.FC = () => {
  const navigation = useNavigation();
  const {gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;

  const {control, handleSubmit, setValue, watch, formState: {errors}} = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {name: '', email: '', phone: '', role: 'Trainer', password: ''},
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: FormData) => {
    if (!gym) return;
    setLoading(true);
    const result = await addUser(gym.id, data);
    setLoading(false);
    if (result.data) {
      Toast.show({type: 'success', text1: 'Staff Added!', text2: `${data.name} can now login`});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: result.error || 'Failed'});
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, {backgroundColor: bgColor}]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Add Staff Member" onBack={() => navigation.goBack()} isDark={isDark} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Role</Text>
          <View style={styles.chipRow}>
            {(['Manager', 'Trainer'] as const).map(role => (
              <Chip
                key={role}
                selected={selectedRole === role}
                onPress={() => setValue('role', role)}
                style={[styles.roleChip, selectedRole === role && {backgroundColor: COLORS.primary}]}
                textStyle={{color: selectedRole === role ? '#FFF' : textColor, fontSize: 13}}
                icon={role === 'Manager' ? 'account-supervisor' : 'account-tie'}>
                {role}
              </Chip>
            ))}
          </View>
        </View>

        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Controller control={control} name="name" render={({field: {onChange, value, onBlur}}) => (
            <AppInput label="Full Name *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
          )} />
          <Controller control={control} name="phone" render={({field: {onChange, value, onBlur}}) => (
            <AppInput label="Phone *" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone?.message} />
          )} />
          <Controller control={control} name="email" render={({field: {onChange, value, onBlur}}) => (
            <AppInput label="Email *" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
          )} />
          <Controller control={control} name="password" render={({field: {onChange, value, onBlur}}) => (
            <AppInput
              label="Password *"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={!showPassword}
              error={errors.password?.message}
              right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(p => !p)} />}
            />
          )} />
        </View>

        <AppButton title="Add Staff Member" onPress={handleSubmit(onSubmit)} loading={loading} icon="account-plus" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md, paddingBottom: SPACING.xxl},
  section: {borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1},
  sectionTitle: {fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.md},
  chipRow: {flexDirection: 'row', gap: SPACING.sm},
  roleChip: {flex: 1},
});

export default AddUserScreen;
