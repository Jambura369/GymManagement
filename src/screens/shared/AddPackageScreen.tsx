import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {PACKAGE_TYPES} from '../../constants';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {addPackage} from '../../services/packageService';
import {showImagePicker, PICKER_PRESETS} from '../../utils/imagePicker';

type Nav = any;

const DURATION_UNITS = ['Days', 'Weeks', 'Months', 'Years'];
const DURATION_UNIT_DAYS: Record<string, number> = {
  Days: 1,
  Weeks: 7,
  Months: 30,
  Years: 365,
};

const AddPackageScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {gym} = useAuthStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [durationValue, setDurationValue] = useState('1');
  const [durationUnit, setDurationUnit] = useState('Months');
  const [features, setFeatures] = useState<string[]>(['Unlimited Gym Access']);
  const [newFeature, setNewFeature] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.length < 2) e.name = 'Package name required';
    if (!price || Number(price) <= 0) e.price = 'Enter a valid price';
    if (!durationValue || Number(durationValue) <= 0) e.duration = 'Enter duration';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getDurationDays = () => {
    return Math.round(Number(durationValue) * DURATION_UNIT_DAYS[durationUnit]);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures(prev => [...prev, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (idx: number) => {
    setFeatures(prev => prev.filter((_, i) => i !== idx));
  };

  const pickCover = () => {
    showImagePicker(PICKER_PRESETS.RECEIPT, uri => setCoverImage(uri));
  };

  const onSubmit = async () => {
    if (!validate() || !gym) return;
    setLoading(true);
    const description = features.join('\n');
    const result = await addPackage(gym.id, {
      name: name.trim(),
      type: 'Monthly',
      price: Number(price),
      duration_days: getDurationDays(),
      description,
    } as any);
    setLoading(false);
    if (result.data) {
      Toast.show({type: 'success', text1: 'Package Created!'});
      navigation.goBack();
    } else {
      Toast.show({type: 'error', text1: result.error || 'Failed'});
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {paddingTop: insets.top}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Package</Text>
        <TouchableOpacity hitSlop={8}>
          <MaterialCommunityIcons name="dots-vertical" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: 100 + insets.bottom}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* PACKAGE DETAILS section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PACKAGE DETAILS</Text>
          <MaterialCommunityIcons name="content-save-outline" size={18} color={COLORS.primary} />
        </View>

        <View style={styles.card}>
          {/* Package Name */}
          <Text style={styles.fieldLabel}>Package Name</Text>
          <TextInput
            style={[styles.textField, errors.name ? styles.fieldError : null]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Gold Membership"
            placeholderTextColor={COLORS.textSecondary}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

          {/* Price */}
          <Text style={[styles.fieldLabel, {marginTop: SPACING.md}]}>Price</Text>
          <View style={styles.priceRow}>
            <View style={[styles.priceInput, errors.price ? styles.fieldError : null]}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.priceTextInput}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
          {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}

          {/* Duration */}
          <Text style={[styles.fieldLabel, {marginTop: SPACING.md}]}>Duration</Text>
          <View style={styles.durationRow}>
            <View style={[styles.durationNumber, errors.duration ? styles.fieldError : null]}>
              <TextInput
                style={styles.durationInput}
                value={durationValue}
                onChangeText={setDurationValue}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.durationUnitPicker}>
              <TouchableOpacity
                style={styles.durationUnitBtn}
                onPress={() => {
                  const idx = DURATION_UNITS.indexOf(durationUnit);
                  setDurationUnit(DURATION_UNITS[(idx + 1) % DURATION_UNITS.length]);
                }}>
                <Text style={styles.durationUnitText}>{durationUnit}</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <MaterialCommunityIcons name="calendar-outline" size={20} color={COLORS.textSecondary} />
          </View>
          {errors.duration ? <Text style={styles.errorText}>{errors.duration}</Text> : null}
        </View>

        {/* Features & Inclusions */}
        <View style={styles.card}>
          <View style={styles.featuresHeader}>
            <Text style={styles.fieldLabel}>Features & Inclusions</Text>
            <TouchableOpacity onPress={addFeature} style={styles.addFeatureBtn} hitSlop={8}>
              <MaterialCommunityIcons name="plus-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.addFeatureText}>Add Feature</Text>
            </TouchableOpacity>
          </View>

          {features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.primary} />
              <Text style={styles.featureText}>{feature}</Text>
              <TouchableOpacity onPress={() => removeFeature(idx)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}

          {/* New feature input */}
          <View style={styles.newFeatureRow}>
            <MaterialCommunityIcons name="plus" size={16} color={COLORS.textSecondary} />
            <TextInput
              style={styles.newFeatureInput}
              value={newFeature}
              onChangeText={setNewFeature}
              placeholder="Add custom feature..."
              placeholderTextColor={COLORS.textSecondary}
              onSubmitEditing={addFeature}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Package Cover */}
        <Text style={styles.sectionTitle}>PACKAGE COVER</Text>
        <TouchableOpacity style={styles.coverArea} onPress={pickCover} activeOpacity={0.8}>
          {coverImage ? (
            <Image source={{uri: coverImage}} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <MaterialCommunityIcons name="camera-outline" size={36} color={COLORS.textSecondary} />
            </View>
          )}
          {coverImage && (
            <View style={styles.previewLabel}>
              <Text style={styles.previewLabelText}>PREVIEW IMAGE</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Save button */}
      <View style={[styles.saveBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
        <TouchableOpacity
          style={[styles.saveBtn, loading && {opacity: 0.6}]}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.85}>
          <MaterialCommunityIcons name="content-save" size={20} color="#0B0F0E" />
          <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Package'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},

  scroll: {paddingHorizontal: SPACING.md, paddingTop: SPACING.xs},

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },

  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  textField: {
    backgroundColor: '#1e2420',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: '#2a2f2d',
  },
  fieldError: {borderColor: COLORS.error},
  errorText: {fontSize: 12, color: COLORS.error, marginTop: 4},

  // Price
  priceRow: {flexDirection: 'row', gap: SPACING.sm},
  priceInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e2420',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: '#2a2f2d',
    gap: SPACING.xs,
  },
  currencySymbol: {fontSize: 18, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary},
  priceTextInput: {flex: 1, fontSize: 18, color: COLORS.primary, paddingVertical: 13, padding: 0},

  // Duration
  durationRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  durationNumber: {
    width: 80,
    backgroundColor: '#1e2420',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: '#2a2f2d',
  },
  durationInput: {fontSize: 16, color: COLORS.textPrimary, paddingVertical: 13, padding: 0},
  durationUnitPicker: {flex: 1},
  durationUnitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e2420',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#2a2f2d',
  },
  durationUnitText: {fontSize: 15, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium},

  // Features
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  addFeatureBtn: {flexDirection: 'row', alignItems: 'center', gap: 4},
  addFeatureText: {fontSize: 13, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.primary},

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2f2d',
  },
  featureText: {flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary},

  newFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: 8,
  },
  newFeatureInput: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    padding: 0,
  },

  // Cover
  coverArea: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    height: 160,
    marginBottom: SPACING.md,
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {width: '100%', height: '100%'},
  previewLabel: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
  },
  previewLabelText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },

  // Save bar
  saveBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2f2d',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
  },
  saveBtnText: {fontSize: 16, fontWeight: FONT_WEIGHT.bold, color: '#0B0F0E'},
});

export default AddPackageScreen;
