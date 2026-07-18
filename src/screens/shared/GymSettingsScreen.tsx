import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {useSubscriptionStore} from '../../store/subscriptionStore';
import {SUPABASE_BUCKETS} from '../../constants';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {updateGymSettings} from '../../services/userService';
import {AuthMethod} from '../../types';
import {uploadImage} from '../../services/storageService';
import {showImagePicker, PICKER_PRESETS} from '../../utils/imagePicker';
import ImageViewerModal from '../../components/common/ImageViewerModal';

const GymSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {gym, user, updateGym} = useAuthStore();
  const {plan} = useSubscriptionStore();
  const insets = useSafeAreaInsets();

  const [gymName, setGymName] = useState(gym?.gym_name || '');
  const [address, setAddress] = useState(gym?.address || '');
  const [phone, setPhone] = useState(gym?.phone || '');
  const [gymLogo, setGymLogo] = useState<string | null>(gym?.gym_logo || null);
  const [paymentQr, setPaymentQr] = useState<string | null>(gym?.payment_qr || null);
  const [loading, setLoading] = useState(false);
  const [savingAuth, setSavingAuth] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(gym?.auth_method || 'password');

  const pickImage = (type: 'logo' | 'qr') => {
    showImagePicker(PICKER_PRESETS.LOGO, uri => {
      if (type === 'logo') setGymLogo(uri);
      else setPaymentQr(uri);
    });
  };

  const handleSave = async () => {
    if (!gym) return;
    if (!gymName.trim()) {
      Toast.show({type: 'error', text1: 'Gym name cannot be empty'});
      return;
    }
    if (!phone.trim()) {
      Toast.show({type: 'error', text1: 'Phone number cannot be empty'});
      return;
    }
    if (!address.trim()) {
      Toast.show({type: 'error', text1: 'Address cannot be empty'});
      return;
    }
    setLoading(true);
    const updates: Record<string, any> = {
      gym_name: gymName.trim(),
      address: address.trim(),
      phone: phone.trim(),
    };
    if (gymLogo && gymLogo !== gym.gym_logo) {
      const res = await uploadImage(gymLogo, SUPABASE_BUCKETS.GYM_LOGOS, `${gym.id}/logo`, gym.gym_logo || undefined);
      if (res.data) updates.gym_logo = res.data;
      else Toast.show({type: 'error', text1: 'Logo upload failed', text2: res.error || undefined});
    }
    if (paymentQr && paymentQr !== gym.payment_qr) {
      const res = await uploadImage(paymentQr, SUPABASE_BUCKETS.PAYMENT_QR, `${gym.id}/qr`, gym.payment_qr || undefined);
      if (res.data) updates.payment_qr = res.data;
      else Toast.show({type: 'error', text1: 'QR upload failed', text2: res.error || undefined});
    }
    const result = await updateGymSettings(gym.id, updates);
    setLoading(false);
    if (!result.error) {
      updateGym(updates);
      Toast.show({type: 'success', text1: 'Settings saved!'});
    } else {
      Toast.show({type: 'error', text1: 'Failed to save', text2: result.error});
    }
  };

  const handleAuthMethodChange = async (method: AuthMethod) => {
    if (!gym || method === authMethod) return;
    setSavingAuth(true);
    const result = await updateGymSettings(gym.id, {auth_method: method});
    setSavingAuth(false);
    if (!result.error) {
      setAuthMethod(method);
      updateGym({auth_method: method});
      Toast.show({
        type: 'success',
        text1: 'Login method updated',
        text2: method === 'email_otp' ? 'Staff sign in with email OTP' : 'Staff sign in with password',
      });
    } else {
      Toast.show({type: 'error', text1: 'Failed to update', text2: result.error});
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: {multiline?: boolean; keyboardType?: any; numberOfLines?: number},
  ) => (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, opts?.multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor={COLORS.textDisabled}
        keyboardType={opts?.keyboardType || 'default'}
        multiline={opts?.multiline}
        numberOfLines={opts?.numberOfLines}
        autoCorrect={false}
        textAlignVertical={opts?.multiline ? 'top' : 'center'}
      />
    </View>
  );

  const renderLink = (icon: string, label: string, sub: string, onPress: () => void) => (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.linkIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
      </View>
      <View style={styles.linkInfo}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkSub}>{sub}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Gym Settings</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + SPACING.xxl}]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Gym Branding ─────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>GYM BRANDING</Text>
        <View style={styles.section}>
          {/* Logo + QR side by side */}
          <View style={styles.mediaRow}>
            {/* Logo */}
            <View style={styles.mediaItem}>
              <Text style={styles.mediaLabel}>Gym Logo</Text>
              <View style={styles.mediaWrap}>
                <TouchableOpacity
                  onPress={() => (gymLogo ? setViewerUri(gymLogo) : pickImage('logo'))}
                  activeOpacity={0.8}>
                  {gymLogo ? (
                    <Image source={{uri: gymLogo}} style={styles.mediaImg} />
                  ) : (
                    <View style={styles.mediaPlaceholder}>
                      <MaterialCommunityIcons name="store-outline" size={28} color={COLORS.textSecondary} />
                      <Text style={styles.mediaPlaceholderText}>Add Logo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaBadge} onPress={() => pickImage('logo')} hitSlop={8}>
                  <MaterialCommunityIcons name="pencil" size={12} color="#0B0F0E" />
                </TouchableOpacity>
              </View>
            </View>

            {/* QR */}
            <View style={styles.mediaItem}>
              <Text style={styles.mediaLabel}>Payment QR</Text>
              <View style={styles.mediaWrap}>
                <TouchableOpacity
                  onPress={() => (paymentQr ? setViewerUri(paymentQr) : pickImage('qr'))}
                  activeOpacity={0.8}>
                  {paymentQr ? (
                    <Image source={{uri: paymentQr}} style={styles.mediaImg} />
                  ) : (
                    <View style={styles.mediaPlaceholder}>
                      <MaterialCommunityIcons name="qrcode" size={28} color={COLORS.textSecondary} />
                      <Text style={styles.mediaPlaceholderText}>Add QR</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaBadge} onPress={() => pickImage('qr')} hitSlop={8}>
                  <MaterialCommunityIcons name="pencil" size={12} color="#0B0F0E" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {renderInput('Gym Name', gymName, setGymName)}
          {renderInput('Phone Number', phone, setPhone, {keyboardType: 'phone-pad'})}
          {renderInput('Address', address, setAddress, {multiline: true, numberOfLines: 3})}

          <TouchableOpacity
            style={[styles.saveBtn, loading && {opacity: 0.7}]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator size="small" color="#0B0F0E" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save" size={18} color="#0B0F0E" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Account Info ─────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ACCOUNT INFO</Text>
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email-outline" size={18} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Owner Email</Text>
              <Text style={styles.infoValue}>{gym?.email}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar-check" size={18} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Registered</Text>
              <Text style={styles.infoValue}>
                {gym?.created_at ? new Date(gym.created_at).toLocaleDateString('en-IN', {year: 'numeric', month: 'long', day: 'numeric'}) : '—'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="crown-outline" size={18} color="#FFD700" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Current Plan</Text>
              <Text style={[styles.infoValue, {color: '#FFD700'}]}>{plan?.name || 'Free Trial'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Subscription')}
              style={styles.managePlanBtn}>
              <Text style={styles.managePlanText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Quick Links ─────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>QUICK LINKS</Text>
        <View style={styles.section}>
          {renderLink('package-variant', 'Membership Packages', 'Create, edit, delete packages', () => navigation.navigate('PackageList'))}
          <View style={styles.divider} />
          {renderLink('account-group', 'Staff Management', 'Add & manage trainers and managers', () => navigation.navigate('UserManagement'))}
          <View style={styles.divider} />
          {renderLink('bell-outline', 'Notifications', 'Manage notification preferences', () => navigation.navigate('Notifications'))}
        </View>

        {/* ── Staff Login Method ────────────────────────────── */}
        {user?.role === 'Admin' && (
          <>
            <Text style={styles.sectionLabel}>STAFF LOGIN METHOD</Text>
            <View style={styles.section}>
              <Text style={styles.authHint}>
                Choose how Admin, Manager and Trainer accounts sign in to this gym.
              </Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, authMethod === 'password' && styles.toggleBtnActive]}
                  onPress={() => handleAuthMethodChange('password')}
                  disabled={savingAuth}
                  activeOpacity={0.8}>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={16}
                    color={authMethod === 'password' ? '#0B0F0E' : COLORS.textSecondary}
                  />
                  <Text style={[styles.toggleText, authMethod === 'password' && styles.toggleTextActive]}>
                    Password
                  </Text>
                  {authMethod === 'password' && (
                    <MaterialCommunityIcons name="check-circle" size={14} color="#0B0F0E" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, authMethod === 'email_otp' && styles.toggleBtnActive]}
                  onPress={() => handleAuthMethodChange('email_otp')}
                  disabled={savingAuth}
                  activeOpacity={0.8}>
                  <MaterialCommunityIcons
                    name="email-check-outline"
                    size={16}
                    color={authMethod === 'email_otp' ? '#0B0F0E' : COLORS.textSecondary}
                  />
                  <Text style={[styles.toggleText, authMethod === 'email_otp' && styles.toggleTextActive]}>
                    Email OTP
                  </Text>
                  {authMethod === 'email_otp' && (
                    <MaterialCommunityIcons name="check-circle" size={14} color="#0B0F0E" />
                  )}
                </TouchableOpacity>
              </View>
              {savingAuth && (
                <View style={styles.savingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.savingText}>Updating…</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ImageViewerModal
        visible={!!viewerUri}
        uri={viewerUri}
        onClose={() => setViewerUri(null)}
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

  scroll: {paddingHorizontal: SPACING.md, paddingTop: SPACING.xs},

  sectionLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },

  // Media (logo + qr)
  mediaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  mediaItem: {alignItems: 'center', gap: SPACING.xs},
  mediaLabel: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary},
  mediaWrap: {position: 'relative'},
  mediaImg: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  mediaPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mediaPlaceholderText: {fontSize: 10, color: COLORS.textSecondary},
  mediaBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Inputs
  inputWrap: {marginBottom: SPACING.sm},
  inputLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
  },
  inputMulti: {height: 80, paddingTop: SPACING.sm},

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 14,
    marginTop: SPACING.xs,
  },
  saveBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#0B0F0E',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  infoContent: {flex: 1},
  infoLabel: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 2},
  infoValue: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  divider: {height: 1, backgroundColor: COLORS.border},
  managePlanBtn: {
    backgroundColor: COLORS.primary + '18',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  managePlanText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },

  // Link rows
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInfo: {flex: 1},
  linkLabel: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  linkSub: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 1},

  // Auth method
  authHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
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
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  toggleBtnActive: {backgroundColor: COLORS.primary},
  toggleText: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textSecondary},
  toggleTextActive: {color: '#0B0F0E', fontWeight: FONT_WEIGHT.bold},
  savingRow: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm},
  savingText: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary},
});

export default GymSettingsScreen;
