import React, {useState, useEffect} from 'react';
import {StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Text} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Chip} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, PACKAGE_TYPES} from '../../constants';
import {RootStackParamList} from '../../types';
import {updatePackage} from '../../services/packageService';
import {supabase} from '../../supabase/client';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';

const schema = z.object({
  name: z.string().min(2),
  type: z.string(),
  price: z.number().min(1),
  duration_days: z.number().min(1),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type Route = RouteProp<RootStackParamList, 'EditPackage'>;

const EditPackageScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;

  const {control, handleSubmit, setValue, watch, reset, formState: {errors}} = useForm<FormData>({resolver: zodResolver(schema)});
  const selectedType = watch('type') || 'Monthly';

  useEffect(() => {
    loadPackage();
  }, []);

  const loadPackage = async () => {
    const {data} = await supabase.from('packages').select('*').eq('id', route.params.packageId).single();
    if (data) {
      reset({name: data.name, type: data.type, price: Number(data.price), duration_days: data.duration_days, description: data.description || ''});
      setLoaded(true);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const result = await updatePackage(route.params.packageId, data as any);
    setLoading(false);
    if (result.data) {
      Toast.show({type: 'success', text1: 'Package Updated!'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Update failed'});
    }
  };

  if (!loaded) return null;

  return (
    <KeyboardAvoidingView style={[styles.container, {backgroundColor: bgColor}]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="Edit Package" onBack={() => navigation.goBack()} isDark={isDark} />
      <ScrollView contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]} keyboardShouldPersistTaps="handled">
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Type</Text>
          <View style={styles.chipRow}>
            {PACKAGE_TYPES.map(type => (
              <Chip key={type} selected={selectedType === type} onPress={() => setValue('type', type)} style={[selectedType === type && {backgroundColor: COLORS.primary}]} textStyle={{color: selectedType === type ? '#FFF' : textColor, fontSize: 12}} compact>{type}</Chip>
            ))}
          </View>
        </View>
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Controller control={control} name="name" render={({field: {onChange, value, onBlur}}) => (<AppInput label="Name *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />)} />
          <Controller control={control} name="price" render={({field: {onChange, value}}) => (<AppInput label="Price (₹) *" value={value?.toString()} onChangeText={t => onChange(Number(t) || 0)} keyboardType="numeric" />)} />
          <Controller control={control} name="duration_days" render={({field: {onChange, value}}) => (<AppInput label="Duration (Days) *" value={value?.toString()} onChangeText={t => onChange(Number(t) || 0)} keyboardType="numeric" />)} />
          <Controller control={control} name="description" render={({field: {onChange, value}}) => (<AppInput label="Description" value={value || ''} onChangeText={onChange} multiline />)} />
        </View>
        <AppButton title="Update Package" onPress={handleSubmit(onSubmit)} loading={loading} icon="content-save" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md},
  section: {borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1},
  sectionTitle: {fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.md},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs},
});

export default EditPackageScreen;
