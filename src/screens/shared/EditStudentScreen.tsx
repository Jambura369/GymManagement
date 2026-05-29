import React, {useState, useEffect} from 'react';
import {StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Text, TouchableOpacity, Image} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {launchImageLibrary} from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useStudentStore} from '../../store/studentStore';
import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, SUPABASE_BUCKETS} from '../../constants';
import {RootStackParamList, Package, Student} from '../../types';
import {getStudent} from '../../services/studentService';
import {fetchPackages} from '../../services/packageService';
import {fetchUsers} from '../../services/userService';
import {uploadImage} from '../../services/storageService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';
import SelectPicker from '../../components/common/SelectPicker';

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type Route = RouteProp<RootStackParamList, 'EditStudent'>;

const EditStudentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const {isDark} = useThemeStore();
  const {gym} = useAuthStore();
  const {updateStudent} = useStudentStore();
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState('');

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;

  const {control, handleSubmit, reset, formState: {errors}} = useForm<FormData>({resolver: zodResolver(schema)});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!gym) return;
    const [studentRes, pkgRes] = await Promise.all([
      getStudent(route.params.studentId),
      fetchPackages(gym.id),
    ]);
    if (studentRes.data) {
      setStudent(studentRes.data);
      setImage(studentRes.data.image);
      setSelectedPackage(studentRes.data.package_id || '');
      reset({
        name: studentRes.data.name,
        phone: studentRes.data.phone,
        email: studentRes.data.email || '',
        notes: studentRes.data.notes || '',
      });
    }
    if (pkgRes.data) setPackages(pkgRes.data);
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (!result.didCancel && result.assets?.[0]?.uri) setImage(result.assets[0].uri);
  };

  const onSubmit = async (data: FormData) => {
    if (!student) return;
    setLoading(true);
    let imageUrl = student.image;
    if (image && image !== student.image) {
      const res = await uploadImage(image, SUPABASE_BUCKETS.STUDENT_IMAGES, `${student.gym_id}/${Date.now()}`);
      if (res.data) imageUrl = res.data;
    }
    const success = await updateStudent(student.id, {...data, image: imageUrl, package_id: selectedPackage || null});
    setLoading(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Student Updated!'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Update failed'});
    }
  };

  if (!student) return null;

  return (
    <KeyboardAvoidingView style={[styles.container, {backgroundColor: bgColor}]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Edit Student" onBack={() => navigation.goBack()} isDark={isDark} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          {image ? (
            <Image source={{uri: image}} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialCommunityIcons name="camera-plus-outline" size={32} color={COLORS.placeholder} />
            </View>
          )}
        </TouchableOpacity>

        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Controller control={control} name="name" render={({field: {onChange, value, onBlur}}) => (
            <AppInput label="Full Name *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
          )} />
          <Controller control={control} name="phone" render={({field: {onChange, value, onBlur}}) => (
            <AppInput label="Phone *" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone?.message} />
          )} />
          <Controller control={control} name="email" render={({field: {onChange, value, onBlur}}) => (
            <AppInput label="Email (Optional)" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" />
          )} />
          <SelectPicker
            label="Package"
            value={selectedPackage}
            options={packages.map(p => ({label: `${p.name} — ₹${p.price}`, value: p.id}))}
            onSelect={setSelectedPackage}
            isDark={isDark}
          />
          <Controller control={control} name="notes" render={({field: {onChange, value}}) => (
            <AppInput label="Notes" value={value || ''} onChangeText={onChange} multiline numberOfLines={3} />
          )} />
        </View>

        <AppButton title="Update Student" onPress={handleSubmit(onSubmit)} loading={loading} style={styles.submitBtn} icon="content-save" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md, paddingBottom: SPACING.xxl},
  photoContainer: {alignSelf: 'center', marginBottom: SPACING.md},
  photo: {width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary},
  photoPlaceholder: {width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center'},
  section: {borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1},
  submitBtn: {marginTop: SPACING.sm},
});

export default EditStudentScreen;
