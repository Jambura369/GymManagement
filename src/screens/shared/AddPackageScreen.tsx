import React, {useState} from 'react';
import {StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Chip} from 'react-native-paper';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, PACKAGE_TYPES} from '../../constants';
import {addPackage} from '../../services/packageService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  type: z.string().min(1, 'Select type'),
  price: z.number().min(1, 'Price required'),
  duration_days: z.number().min(1, 'Duration required'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PACKAGE_DURATIONS: Record<string, number> = {
  Monthly: 30, Quarterly: 90, 'Half Year': 180, Yearly: 365, 'Special Category': 30,
};

const AddPackageScreen: React.FC = () => {
  const navigation = useNavigation();
  const {gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const [loading, setLoading] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;

  const {control, handleSubmit, setValue, watch, formState: {errors}} = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {name: '', type: 'Monthly', price: 0, duration_days: 30, description: ''},
  });

  const selectedType = watch('type');

  const onSubmit = async (data: FormData) => {
    if (!gym) return;
    setLoading(true);
    const result = await addPackage(gym.id, data as any);
    setLoading(false);
    if (result.data) {
      Toast.show({type: 'success', text1: 'Package Created!'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: result.error || 'Failed'});
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, {backgroundColor: bgColor}]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Add Package" onBack={() => navigation.goBack()} isDark={isDark} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Package Type</Text>
          <View style={styles.chipRow}>
            {PACKAGE_TYPES.map(type => (
              <Chip
                key={type}
                selected={selectedType === type}
                onPress={() => {
                  setValue('type', type);
                  setValue('duration_days', PACKAGE_DURATIONS[type] || 30);
                }}
                style={[styles.typeChip, selectedType === type && {backgroundColor: COLORS.primary}]}
                textStyle={{color: selectedType === type ? '#FFF' : textColor, fontSize: 12}}
                compact>
                {type}
              </Chip>
            ))}
          </View>
        </View>

        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Controller control={control} name="name" render={({field: {onChange, value, onBlur}}) => (
            <AppInput label="Package Name *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
          )} />
          <Controller control={control} name="price" render={({field: {onChange, value}}) => (
            <AppInput label="Price (₹) *" value={value?.toString()} onChangeText={t => onChange(Number(t) || 0)} keyboardType="numeric" error={errors.price?.message} />
          )} />
          <Controller control={control} name="duration_days" render={({field: {onChange, value}}) => (
            <AppInput label="Duration (Days) *" value={value?.toString()} onChangeText={t => onChange(Number(t) || 0)} keyboardType="numeric" error={errors.duration_days?.message} />
          )} />
          <Controller control={control} name="description" render={({field: {onChange, value}}) => (
            <AppInput label="Description (Optional)" value={value || ''} onChangeText={onChange} multiline numberOfLines={2} />
          )} />
        </View>

        <AppButton title="Create Package" onPress={handleSubmit(onSubmit)} loading={loading} icon="package-variant-plus" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md, paddingBottom: SPACING.xxl},
  section: {borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1},
  sectionTitle: {fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: SPACING.md},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs},
  typeChip: {},
});

export default AddPackageScreen;
