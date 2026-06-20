import React, {useEffect, useState} from 'react';
import {StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Text} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import {useThemeStore} from '../../store/themeStore';
import {useSupplementStore} from '../../store/supplementStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {RootStackParamList} from '../../types';
import {getSupplement} from '../../services/supplementService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  category: z.string().optional(),
  unit: z.string().optional(),
  cost_price: z.number().optional(),
  selling_price: z.number().min(1, 'Selling price required'),
  low_stock_threshold: z.number().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type Route = RouteProp<RootStackParamList, 'EditSupplement'>;

const EditSupplementScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const {isDark} = useThemeStore();
  const {updateSupplement} = useSupplementStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;

  const {control, handleSubmit, reset, formState: {errors}} = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    loadSupplement();
  }, []);

  const loadSupplement = async () => {
    const result = await getSupplement(route.params.supplementId);
    if (result.data) {
      reset({
        name: result.data.name,
        category: result.data.category || '',
        unit: result.data.unit,
        cost_price: result.data.cost_price ?? undefined,
        selling_price: Number(result.data.selling_price),
        low_stock_threshold: result.data.low_stock_threshold,
        description: result.data.description || '',
      });
      setLoaded(true);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const success = await updateSupplement(route.params.supplementId, data);
    setLoading(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Supplement Updated!'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Update failed'});
    }
  };

  if (!loaded) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="Edit Supplement" onBack={() => navigation.goBack()} isDark={isDark} />
      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Product Details</Text>
          <Controller control={control} name="name" render={({field: {onChange, value, onBlur}}) => (
            <AppInput label="Name *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
          )} />
          <Controller control={control} name="category" render={({field: {onChange, value}}) => (
            <AppInput label="Category" value={value || ''} onChangeText={onChange} />
          )} />
          <Controller control={control} name="unit" render={({field: {onChange, value}}) => (
            <AppInput label="Unit" value={value || ''} onChangeText={onChange} />
          )} />
        </View>

        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Text style={[styles.sectionTitle, {color: COLORS.primary}]}>Pricing</Text>
          <Controller control={control} name="cost_price" render={({field: {onChange, value}}) => (
            <AppInput label="Cost Price (₹)" value={value?.toString() || ''} onChangeText={t => onChange(t ? Number(t) : undefined)} keyboardType="numeric" />
          )} />
          <Controller control={control} name="selling_price" render={({field: {onChange, value}}) => (
            <AppInput label="Selling Price (₹) *" value={value?.toString()} onChangeText={t => onChange(Number(t) || 0)} keyboardType="numeric" error={errors.selling_price?.message} />
          )} />
          <Controller control={control} name="low_stock_threshold" render={({field: {onChange, value}}) => (
            <AppInput label="Low Stock Alert Threshold" value={value?.toString() || ''} onChangeText={t => onChange(t ? Number(t) : undefined)} keyboardType="numeric" />
          )} />
        </View>

        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Controller control={control} name="description" render={({field: {onChange, value}}) => (
            <AppInput label="Description" value={value || ''} onChangeText={onChange} multiline numberOfLines={3} />
          )} />
        </View>

        <AppButton title="Update Supplement" onPress={handleSubmit(onSubmit)} loading={loading} icon="content-save" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md},
  section: {borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1},
  sectionTitle: {fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: SPACING.md},
});

export default EditSupplementScreen;
