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
import {launchImageLibrary} from 'react-native-image-picker';
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

const GymSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {gym, user, updateGym} = useAuthStore();
  const {isDark, toggleTheme} = useThemeStore();

  const [gymName, setGymName] = useState(gym?.gym_name || '');
  const [address, setAddress] = useState(gym?.address || '');
  const [phone, setPhone] = useState(gym?.phone || '');
  const [gymLogo, setGymLogo] = useState<string | null>(gym?.gym_logo || null);
  const [paymentQr, setPaymentQr] = useState<string | null>(gym?.payment_qr || null);
  const [loading, setLoading] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const pickImage = async (type: 'logo' | 'qr') => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (!result.didCancel && result.assets?.[0]?.uri) {
      if (type === 'logo') setGymLogo(result.assets[0].uri);
      else setPaymentQr(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!gym) return;
    setLoading(true);

    const updates: Record<string, any> = {
      gym_name: gymName,
      address,
      phone,
    };

    // Upload new logo if changed
    if (gymLogo && gymLogo !== gym.gym_logo) {
      const result = await uploadImage(gymLogo, SUPABASE_BUCKETS.GYM_LOGOS, `${gym.id}/logo`);
      if (result.data) updates.gym_logo = result.data;
    }

    // Upload new QR if changed
    if (paymentQr && paymentQr !== gym.payment_qr) {
      const result = await uploadImage(paymentQr, SUPABASE_BUCKETS.PAYMENT_QR, `${gym.id}/qr`);
      if (result.data) updates.payment_qr = result.data;
    }

    const result = await updateGymSettings(gym.id, updates);
    setLoading(false);

    if (!result.error) {
      updateGym(updates);
      Toast.show({type: 'success', text1: 'Settings Saved!'});
    } else {
      Toast.show({type: 'error', text1: 'Failed', text2: result.error});
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader
        title="Gym Settings"
        onBack={() => navigation.goBack()}
        isDark={isDark}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Gym Branding */}
        <Card style={[styles.card, {backgroundColor: cardBg}]}>
          <Card.Title title="Gym Branding" />
          <Card.Content>
            {/* Logo */}
            <View style={styles.imageRow}>
              <View style={styles.imageSection}>
                <Text style={[styles.imageLabel, {color: COLORS.textSecondary}]}>Gym Logo</Text>
                <TouchableOpacity onPress={() => pickImage('logo')}>
                  {gymLogo ? (
                    <Image source={{uri: gymLogo}} style={styles.logo} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MaterialCommunityIcons name="store-outline" size={28} color={COLORS.placeholder} />
                    </View>
                  )}
                  <View style={styles.editBadge}>
                    <MaterialCommunityIcons name="pencil" size={12} color="#FFF" />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.imageSection}>
                <Text style={[styles.imageLabel, {color: COLORS.textSecondary}]}>Payment QR</Text>
                <TouchableOpacity onPress={() => pickImage('qr')}>
                  {paymentQr ? (
                    <Image source={{uri: paymentQr}} style={styles.logo} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MaterialCommunityIcons name="qrcode" size={28} color={COLORS.placeholder} />
                    </View>
                  )}
                  <View style={styles.editBadge}>
                    <MaterialCommunityIcons name="pencil" size={12} color="#FFF" />
                  </View>
                </TouchableOpacity>
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
            <SettingRow icon="identifier" label="Gym ID" value={gym?.id?.slice(0, 8) + '...'} />
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: SPACING.md, paddingBottom: SPACING.xxl},
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
