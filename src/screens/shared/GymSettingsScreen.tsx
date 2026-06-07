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
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Card, Switch} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {showImagePicker, PICKER_PRESETS} from '../../utils/imagePicker';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, SUPABASE_BUCKETS} from '../../constants';
import {updateGymSettings} from '../../services/userService';
import {uploadImage} from '../../services/storageService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';
import ImageViewerModal from '../../components/common/ImageViewerModal';

const GymSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {gym, user, updateGym} = useAuthStore();
  const {isDark, toggleTheme} = useThemeStore();

  const insets = useSafeAreaInsets();
  const [gymName, setGymName] = useState(gym?.gym_name || '');
  const [address, setAddress] = useState(gym?.address || '');
  const [phone, setPhone] = useState(gym?.phone || '');
  const [gymLogo, setGymLogo] = useState<string | null>(gym?.gym_logo || null);
  const [paymentQr, setPaymentQr] = useState<string | null>(gym?.payment_qr || null);
  const [loading, setLoading] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const pickImage = (type: 'logo' | 'qr') => {
    showImagePicker(PICKER_PRESETS.LOGO, uri => {
      if (type === 'logo') setGymLogo(uri);
      else setPaymentQr(uri);
    });
  };

  const handleSave = async () => {
    if (!gym) return;

    if (!gymName.trim()) {
      Toast.show({type: 'error', text1: 'Validation Error', text2: 'Gym name cannot be empty'});
      return;
    }
    if (!phone.trim()) {
      Toast.show({type: 'error', text1: 'Validation Error', text2: 'Phone number cannot be empty'});
      return;
    }
    if (!address.trim()) {
      Toast.show({type: 'error', text1: 'Validation Error', text2: 'Address cannot be empty'});
      return;
    }

    setLoading(true);

    const updates: Record<string, any> = {
      gym_name: gymName.trim(),
      address: address.trim(),
      phone: phone.trim(),
    };

    // Upload new logo if changed — show error but continue saving other fields
    if (gymLogo && gymLogo !== gym.gym_logo) {
      const result = await uploadImage(
        gymLogo,
        SUPABASE_BUCKETS.GYM_LOGOS,
        `${gym.id}/logo`,
        gym.gym_logo || undefined,
      );
      if (result.data) {
        updates.gym_logo = result.data;
      } else {
        Toast.show({type: 'error', text1: 'Logo upload failed', text2: result.error || undefined});
      }
    }

    // Upload new QR if changed
    if (paymentQr && paymentQr !== gym.payment_qr) {
      const result = await uploadImage(
        paymentQr,
        SUPABASE_BUCKETS.PAYMENT_QR,
        `${gym.id}/qr`,
        gym.payment_qr || undefined,
      );
      if (result.data) {
        updates.payment_qr = result.data;
      } else {
        Toast.show({type: 'error', text1: 'QR upload failed', text2: result.error || undefined});
      }
    }

    const result = await updateGymSettings(gym.id, updates);
    setLoading(false);

    if (!result.error) {
      updateGym(updates);
      Toast.show({type: 'success', text1: 'Settings Saved!'});
    } else {
      Toast.show({type: 'error', text1: 'Failed to save', text2: result.error});
    }
  };

  const SettingRow = ({
    icon,
    label,
    value,
    onPress,
    rightComponent,
  }: {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && !rightComponent}
      activeOpacity={onPress ? 0.7 : 1}>
      <MaterialCommunityIcons name={icon} size={22} color={COLORS.primary} />
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, {color: textColor}]}>{label}</Text>
        {value && (
          <Text style={[styles.settingValue, {color: COLORS.textSecondary}]}>
            {value}
          </Text>
        )}
      </View>
      {rightComponent || (onPress && (
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.placeholder} />
      ))}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader
        title="Gym Settings"
        onBack={() => navigation.goBack()}
        isDark={isDark}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Gym Branding */}
        <Card style={[styles.card, {backgroundColor: cardBg}]}>
          <Card.Title title="Gym Branding" />
          <Card.Content>
            {/* Logo */}
            <View style={styles.imageRow}>
              <View style={styles.imageSection}>
                <Text style={[styles.imageLabel, {color: COLORS.textSecondary}]}>Gym Logo</Text>
                <View>
                  <TouchableOpacity
                    onPress={() => (gymLogo ? setViewerUri(gymLogo) : pickImage('logo'))}
                    activeOpacity={0.7}>
                    {gymLogo ? (
                      <Image source={{uri: gymLogo}} style={styles.logo} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <MaterialCommunityIcons name="store-outline" size={28} color={COLORS.placeholder} />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editBadge}
                    onPress={() => pickImage('logo')}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <MaterialCommunityIcons name="pencil" size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.imageSection}>
                <Text style={[styles.imageLabel, {color: COLORS.textSecondary}]}>Payment QR</Text>
                <View>
                  <TouchableOpacity
                    onPress={() => (paymentQr ? setViewerUri(paymentQr) : pickImage('qr'))}
                    activeOpacity={0.7}>
                    {paymentQr ? (
                      <Image source={{uri: paymentQr}} style={styles.logo} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <MaterialCommunityIcons name="qrcode" size={28} color={COLORS.placeholder} />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editBadge}
                    onPress={() => pickImage('qr')}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <MaterialCommunityIcons name="pencil" size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <AppInput label="Gym Name" value={gymName} onChangeText={setGymName} />
            <AppInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <AppInput label="Address" value={address} onChangeText={setAddress} multiline numberOfLines={2} />

            <AppButton
              title="Save Changes"
              onPress={handleSave}
              loading={loading}
              icon="content-save"
            />
          </Card.Content>
        </Card>

        {/* App Preferences */}
        <Card style={[styles.card, {backgroundColor: cardBg}]}>
          <Card.Title title="App Preferences" />
          <Card.Content>
            <SettingRow
              icon="theme-light-dark"
              label="Dark Mode"
              value={isDark ? 'Enabled' : 'Disabled'}
              rightComponent={
                <Switch value={isDark} onValueChange={toggleTheme} color={COLORS.primary} />
              }
            />
          </Card.Content>
        </Card>

        {/* Gym Info (Read-only) */}
        <Card style={[styles.card, {backgroundColor: cardBg}]}>
          <Card.Title title="Account Info" />
          <Card.Content>
            <SettingRow icon="email" label="Owner Email" value={gym?.email} />
            <SettingRow icon="calendar" label="Registered" value={gym?.created_at ? new Date(gym.created_at).toLocaleDateString() : ''} />
          </Card.Content>
        </Card>

        {/* Packages */}
        <Card style={[styles.card, {backgroundColor: cardBg}]}>
          <Card.Title title="Membership Packages" />
          <Card.Content>
            <SettingRow
              icon="package-variant"
              label="Manage Packages"
              value="Create, edit, delete packages"
              onPress={() => (navigation as any).navigate('PackageList')}
            />
          </Card.Content>
        </Card>

        {/* Danger Zone */}
        {user?.role === 'Admin' && (
          <Card style={[styles.card, {backgroundColor: cardBg}]}>
            <Card.Title title="Staff Management" titleStyle={{color: COLORS.error}} />
            <Card.Content>
              <SettingRow
                icon="account-group"
                label="Manage Staff"
                value="Add/remove managers and trainers"
                onPress={() => (navigation as any).navigate('UserManagement')}
              />
            </Card.Content>
          </Card>
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
  container: {flex: 1},
  scroll: {padding: SPACING.md},
  card: {borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, elevation: 2},
  imageRow: {flexDirection: 'row', gap: SPACING.xl, justifyContent: 'center', marginBottom: SPACING.md},
  imageSection: {alignItems: 'center'},
  imageLabel: {fontSize: 12, marginBottom: SPACING.xs},
  logo: {width: 80, height: 80, borderRadius: BORDER_RADIUS.md, borderWidth: 2, borderColor: COLORS.primary},
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  settingContent: {flex: 1},
  settingLabel: {fontSize: 14, fontWeight: '600'},
  settingValue: {fontSize: 12, marginTop: 2},
});

export default GymSettingsScreen;
