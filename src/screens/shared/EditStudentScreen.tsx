import React, {useState, useEffect, useCallback} from 'react';
import {StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Text, TouchableOpacity, Image, ActivityIndicator} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {showImagePicker, PICKER_PRESETS} from '../../utils/imagePicker';
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
import ImageViewerModal from '../../components/common/ImageViewerModal';

const PHONE_REGEX = /^[6-9]\d{9}$|^\+?[1-9]\d{7,14}$/;

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .regex(PHONE_REGEX, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
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
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState('');

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;

  const {control, handleSubmit, reset, formState: {errors, isDirty}} = useForm<FormData>({resolver: zodResolver(schema)});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      const imageChanged = image !== (student?.image ?? null);
      if (!isDirty && !imageChanged) return;
      e.preventDefault();
      const {Alert} = require('react-native');
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          {text: 'Keep Editing', style: 'cancel'},
          {text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action)},
        ],
      );
    });
    return unsubscribe;
  }, [navigation, isDirty, image, student]);

  const loadData = async () => {
    if (!gym) return;
    setFetching(true);
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
    setFetching(false);
  };

  const pickImage = () => {
    showImagePicker(PICKER_PRESETS.AVATAR, uri => setImage(uri));
  };

  const onSubmit = async (data: FormData) => {
    if (!student) return;
    setLoading(true);
    let imageUrl = student.image;
    if (image && image !== student.image) {
      const res = await uploadImage(
        image,
        SUPABASE_BUCKETS.STUDENT_IMAGES,
        `${student.gym_id}`,
        student.image || undefined,
      );
      if (res.data) imageUrl = res.data;
    }

    // Recalculate expiry when package changed
    let membershipExpiry = student.membership_expiry;
    if (selectedPackage && selectedPackage !== student.package_id) {
      const pkg = packages.find(p => p.id === selectedPackage);
      if (pkg && student.joining_date) {
        membershipExpiry = dayjs(student.joining_date)
          .add(pkg.duration_days, 'day')
          .format('YYYY-MM-DD');
      }
    }

    const success = await updateStudent(student.id, {
      ...data,
      image: imageUrl,
      package_id: selectedPackage || null,
      membership_expiry: membershipExpiry,
    });
    setLoading(false);
    if (success) {
      Toast.show({type: 'success', text1: 'Student Updated!'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: 'Update failed'});
    }
  };

  if (fetching) {
    return (
      <KeyboardAvoidingView style={[styles.container, {backgroundColor: bgColor}]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <AppHeader title="Edit Student" onBack={() => navigation.goBack()} isDark={isDark} />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (!student) return null;

  return (
    <KeyboardAvoidingView style={[styles.container, {backgroundColor: bgColor}]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="Edit Student" onBack={() => navigation.goBack()} isDark={isDark} />
      <ScrollView contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={() => (image ? setViewerVisible(true) : pickImage())}>
          {image ? (
            <Image source={{uri: image}} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialCommunityIcons name="camera-plus-outline" size={32} color={COLORS.placeholder} />
            </View>
          )}
        </TouchableOpacity>
        {image && (
          <View style={styles.photoActions}>
            <TouchableOpacity onPress={pickImage} style={styles.photoActionBtn}>
              <MaterialCommunityIcons name="image-edit" size={16} color={COLORS.primary} />
              <Text style={[styles.photoActionText, {color: COLORS.primary}]}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setImage(null)} style={styles.photoActionBtn}>
              <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.error} />
              <Text style={[styles.photoActionText, {color: COLORS.error}]}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.section, {backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface}]}>
          <Controller control={control} name="name" render={({field: {onChange, value, onBlur}}) => (
            <AppInput label="Full Name *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
          )} />
          <Controller control={control} name="phone" render={({field: {onChange, value, onBlur}}) => (
            <AppInput label="Phone *" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone?.message} />
          )} />
          <Controller control={control} name="email" render={({field: {onChange, value, onBlur}}) => (
            <AppInput label="Email (Optional)" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
          )} />
          <SelectPicker
            label="Package"
            value={selectedPackage}
            options={packages.map(p => ({label: `${p.name} — ₹${p.price}`, value: p.id}))}
            onSelect={setSelectedPackage}
            isDark={isDark}
          />
          {selectedPackage && selectedPackage !== student.package_id && (
            <View style={styles.expiryNote}>
              <MaterialCommunityIcons name="information-outline" size={14} color={COLORS.info} />
              <Text style={[styles.expiryNoteText, {color: COLORS.info}]}>
                Expiry will be recalculated from joining date ({dayjs(student.joining_date).format('DD MMM YYYY')}).
              </Text>
            </View>
          )}
          <Controller control={control} name="notes" render={({field: {onChange, value}}) => (
            <AppInput label="Notes" value={value || ''} onChangeText={onChange} multiline numberOfLines={3} />
          )} />
        </View>

        <AppButton title="Update Student" onPress={handleSubmit(onSubmit)} loading={loading} style={styles.submitBtn} icon="content-save" />
      </ScrollView>

      <ImageViewerModal
        visible={viewerVisible}
        uri={image}
        onClose={() => setViewerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md},
  loadingCenter: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  photoContainer: {alignSelf: 'center', marginBottom: SPACING.md},
  photo: {width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary},
  photoPlaceholder: {width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center'},
  photoActions: {flexDirection: 'row', justifyContent: 'center', gap: SPACING.lg, marginTop: -SPACING.sm, marginBottom: SPACING.md},
  photoActionBtn: {flexDirection: 'row', alignItems: 'center', gap: 4},
  photoActionText: {fontSize: 12, fontWeight: '600'},
  section: {borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1},
  expiryNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.info + '15',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  expiryNoteText: {flex: 1, fontSize: 12, lineHeight: 17},
  submitBtn: {marginTop: SPACING.sm},
});

export default EditStudentScreen;
