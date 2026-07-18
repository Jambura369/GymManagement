import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {addUser} from '../../services/userService';
import {showImagePicker, PICKER_PRESETS} from '../../utils/imagePicker';
import ImageViewerModal from '../../components/common/ImageViewerModal';

type Role = 'Manager' | 'Trainer';

const PHONE_REGEX = /^[6-9]\d{9}$|^\+?[1-9]\d{7,14}$/;

interface Errors {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const AddUserScreen: React.FC = () => {
  const navigation = useNavigation();
  const {gym} = useAuthStore();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Trainer');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const pickImage = () => {
    showImagePicker(PICKER_PRESETS.AVATAR, uri => setImage(uri));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!phone.trim() || !PHONE_REGEX.test(phone.trim())) e.phone = 'Enter a valid phone number';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = 'Enter a valid email address';
    if (!password || password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(password)) e.password = 'Password must contain at least one letter';
    else if (!/\d/.test(password)) e.password = 'Password must contain at least one number';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !gym) return;
    setLoading(true);
    const result = await addUser(gym.id, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      password,
      avatar: image || undefined,
    });
    setLoading(false);
    if (result.data) {
      Toast.show({type: 'success', text1: 'Staff Added!', text2: `${name} can now log in`});
      navigation.goBack();
    } else {
      Alert.alert('Failed', result.error || 'Could not add staff member');
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: {
      error?: string;
      secure?: boolean;
      showToggle?: boolean;
      onToggle?: () => void;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      autoCapitalize?: 'none' | 'sentences' | 'words';
      icon?: string;
    },
  ) => (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputRow, opts?.error ? styles.inputError : null]}>
        {opts?.icon && (
          <MaterialCommunityIcons name={opts.icon} size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
        )}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={v => {
            onChange(v);
            if (errors) setErrors(prev => ({...prev}));
          }}
          placeholder={label}
          placeholderTextColor={COLORS.textDisabled}
          secureTextEntry={opts?.secure}
          keyboardType={opts?.keyboardType || 'default'}
          autoCapitalize={opts?.autoCapitalize ?? 'sentences'}
          autoCorrect={false}
        />
        {opts?.showToggle && (
          <TouchableOpacity onPress={opts.onToggle} hitSlop={8} style={styles.eyeBtn}>
            <MaterialCommunityIcons
              name={opts.secure ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {opts?.error ? <Text style={styles.errorText}>{opts.error}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + SPACING.sm}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Staff Member</Text>
        <MaterialCommunityIcons name="account-plus" size={22} color={COLORS.primary} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + SPACING.xxl}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="account-group" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Expand Your Team</Text>
          <Text style={styles.heroSub}>
            Add a new professional to your facility management workspace.
          </Text>
        </View>

        {/* Avatar picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={() => (image ? setViewerVisible(true) : pickImage())}
            activeOpacity={0.8}>
            {image ? (
              <Image source={{uri: image}} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialCommunityIcons
                  name="camera-plus-outline"
                  size={32}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.avatarText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarEditBadge} onPress={pickImage} hitSlop={8}>
            <MaterialCommunityIcons name="pencil" size={14} color="#0B0F0E" />
          </TouchableOpacity>
        </View>

        {/* Role selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ASSIGN ROLE</Text>
          <View style={styles.toggleRow}>
            {(['Manager', 'Trainer'] as Role[]).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.toggleBtn, role === r && styles.toggleBtnActive]}
                onPress={() => setRole(r)}
                activeOpacity={0.8}>
                <MaterialCommunityIcons
                  name={r === 'Manager' ? 'account-supervisor' : 'dumbbell'}
                  size={16}
                  color={role === r ? '#0B0F0E' : COLORS.textSecondary}
                />
                <Text style={[styles.toggleText, role === r && styles.toggleTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.roleDescRow}>
            <MaterialCommunityIcons name="information-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.roleDescText}>
              {role === 'Manager'
                ? 'Managers have full access to client lists, schedules, and financial reports.'
                : 'Trainers can manage their assigned clients, sessions, and track performance logs.'}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DETAILS</Text>
          {renderInput('Full Name', name, setName, {error: errors.name, icon: 'account-outline'})}
          {renderInput('Email Address', email, setEmail, {
            error: errors.email,
            keyboardType: 'email-address',
            autoCapitalize: 'none',
            icon: 'email-outline',
          })}
          {renderInput('Phone Number', phone, setPhone, {
            error: errors.phone,
            keyboardType: 'phone-pad',
            autoCapitalize: 'none',
            icon: 'phone-outline',
          })}
        </View>

        {/* Credentials */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LOGIN CREDENTIALS</Text>
          {renderInput('Password', password, setPassword, {
            error: errors.password,
            secure: !showPassword,
            showToggle: true,
            onToggle: () => setShowPassword(p => !p),
            autoCapitalize: 'none',
            icon: 'lock-outline',
          })}
          {renderInput('Confirm Password', confirmPassword, setConfirmPassword, {
            error: errors.confirmPassword,
            secure: !showConfirmPassword,
            showToggle: true,
            onToggle: () => setShowConfirmPassword(p => !p),
            autoCapitalize: 'none',
            icon: 'lock-check-outline',
          })}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && {opacity: 0.7}]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator size="small" color="#0B0F0E" />
          ) : (
            <>
              <MaterialCommunityIcons name="account-plus" size={20} color="#0B0F0E" />
              <Text style={styles.saveBtnText}>Add Staff Member</Text>
            </>
          )}
        </TouchableOpacity>
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
  container: {flex: 1, backgroundColor: COLORS.background},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },

  scroll: {paddingHorizontal: SPACING.md, paddingTop: SPACING.sm},

  heroSection: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.lg,
  },

  avatarSection: {
    alignSelf: 'center',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  toggleBtnActive: {backgroundColor: COLORS.primary},
  toggleText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
  },
  toggleTextActive: {color: '#0B0F0E', fontWeight: FONT_WEIGHT.bold},

  roleDescRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: SPACING.sm,
    paddingHorizontal: 2,
  },
  roleDescText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  inputWrap: {marginBottom: SPACING.sm},
  inputLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  inputError: {borderColor: COLORS.error},
  inputIcon: {marginRight: SPACING.xs},
  input: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    padding: 0,
  },
  eyeBtn: {paddingLeft: SPACING.xs},
  errorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.error,
    marginTop: 4,
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  saveBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#0B0F0E',
  },
});

export default AddUserScreen;
