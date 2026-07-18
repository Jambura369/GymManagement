import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {updateUser} from '../../services/userService';

const PHONE_REGEX = /^[6-9]\d{9}$|^\+?[1-9]\d{7,14}$/;

const ROLE_BG: Record<string, string> = {
  Admin: COLORS.primary,
  Manager: COLORS.info,
  Trainer: COLORS.success,
};
const ROLE_TEXT: Record<string, string> = {
  Admin: '#0B0F0E',
  Manager: COLORS.textPrimary,
  Trainer: '#0B0F0E',
};

const MENU_ITEMS = [
  {icon: 'shield-account-outline', label: 'Privacy & Security', key: 'privacy'},
  {icon: 'clock-outline', label: 'Billing History', key: 'billing'},
  {icon: 'help-circle-outline', label: 'Support Center', key: 'support'},
];

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user, gym, updateUser: updateUserStore, logout} = useAuthStore();
  const insets = useSafeAreaInsets();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const validate = (): boolean => {
    let valid = true;
    setNameError('');
    setPhoneError('');
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      valid = false;
    }
    if (phone && !PHONE_REGEX.test(phone.trim())) {
      setPhoneError('Enter a valid phone number');
      valid = false;
    }
    return valid;
  };

  const handleSave = async () => {
    if (!user || !validate()) return;
    setLoading(true);
    const result = await updateUser(user.id, {
      name: name.trim(),
      phone: phone.trim() || null,
    });
    setLoading(false);
    if (result.data) {
      updateUserStore({name: name.trim(), phone: phone.trim() || null});
      Toast.show({type: 'success', text1: 'Profile updated!'});
      setIsEditing(false);
    } else {
      Toast.show({type: 'error', text1: 'Update failed', text2: result.error || undefined});
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
          setLoggingOut(false);
        },
      },
    ]);
  };

  const initials = (user?.name || 'U').slice(0, 2).toUpperCase();
  const roleColor = ROLE_BG[user?.role || 'Trainer'] || COLORS.primary;
  const roleTextColor = ROLE_TEXT[user?.role || 'Trainer'] || '#0B0F0E';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + SPACING.sm}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity hitSlop={8} style={styles.iconBtn}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.md}]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, {borderColor: roleColor}]}>
              {user?.avatar ? (
                <Image source={{uri: user.avatar}} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarInitials, {color: roleColor}]}>{initials}</Text>
              )}
            </View>
            <View style={[styles.cameraBadge, {backgroundColor: roleColor}]}>
              <MaterialCommunityIcons name="pencil" size={12} color="#0B0F0E" />
            </View>
          </View>

          <Text style={styles.heroName}>{user?.name}</Text>

          <View style={[styles.roleBadge, {backgroundColor: roleColor}]}>
            <Text style={[styles.roleBadgeText, {color: roleTextColor}]}>
              {(user?.role || 'STAFF').toUpperCase()}
            </Text>
          </View>

          <Text style={styles.heroEmail}>{user?.email}</Text>

          <TouchableOpacity
            style={styles.editProfileRow}
            onPress={() => setIsEditing(e => !e)}
            activeOpacity={0.75}>
            <MaterialCommunityIcons
              name={isEditing ? 'close-circle-outline' : 'cog-outline'}
              size={16}
              color={COLORS.textSecondary}
            />
            <Text style={styles.editProfileText}>
              {isEditing ? 'Cancel Editing' : 'Edit Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CLIENTS</Text>
            <Text style={[styles.statValue, {color: COLORS.primary}]}>—</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>WORKOUTS</Text>
            <Text style={[styles.statValue, {color: COLORS.primary}]}>—</Text>
          </View>
        </View>

        {/* Edit form (shown only when isEditing) */}
        {isEditing && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EDIT PROFILE</Text>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={[styles.inputRow, nameError ? styles.inputError : null]}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={18}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={v => {
                    setName(v);
                    setNameError('');
                  }}
                  placeholder="Full Name"
                  placeholderTextColor={COLORS.textDisabled}
                  autoCorrect={false}
                />
              </View>
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={[styles.inputRow, phoneError ? styles.inputError : null]}>
                <MaterialCommunityIcons
                  name="phone-outline"
                  size={18}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={v => {
                    setPhone(v);
                    setPhoneError('');
                  }}
                  placeholder="Phone Number"
                  placeholderTextColor={COLORS.textDisabled}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />
              </View>
              {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputRow, styles.inputReadOnly]}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={18}
                  color={COLORS.textDisabled}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, {color: COLORS.textSecondary}]}
                  value={user?.email || ''}
                  editable={false}
                />
                <MaterialCommunityIcons name="lock-outline" size={14} color={COLORS.textDisabled} />
              </View>
              <Text style={styles.readOnlyHint}>Email cannot be changed</Text>
            </View>

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
        )}

        {/* Menu items */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, idx) => (
            <React.Fragment key={item.key}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() =>
                  Alert.alert('Coming Soon', 'This feature will be available in an upcoming update.')
                }
                activeOpacity={0.7}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={COLORS.textSecondary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textDisabled} />
              </TouchableOpacity>
              {idx < MENU_ITEMS.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Gym pill */}
        {gym?.gym_name ? (
          <View style={styles.gymPill}>
            {gym.gym_logo ? (
              <Image source={{uri: gym.gym_logo}} style={styles.gymLogo} />
            ) : (
              <MaterialCommunityIcons name="dumbbell" size={13} color={COLORS.primary} />
            )}
            <Text style={styles.gymName}>{gym.gym_name}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sign out — fixed at screen bottom */}
      <View style={[styles.bottomBar, {paddingBottom: insets.bottom + SPACING.sm}]}>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.8}>
          {loggingOut ? (
            <ActivityIndicator size="small" color="#5C1C18" />
          ) : (
            <MaterialCommunityIcons name="logout" size={18} color="#5C1C18" />
          )}
          <Text style={styles.signOutText}>
            {loggingOut ? 'Signing Out…' : 'SIGN OUT'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.version}>Gymblix v1.0.0</Text>
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
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  iconBtn: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},

  scroll: {paddingHorizontal: SPACING.md},

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: 8,
  },
  avatarWrap: {position: 'relative', marginBottom: SPACING.sm},
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1e2420',
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {width: 100, height: 100, borderRadius: 50},
  avatarInitials: {fontSize: 32, fontWeight: FONT_WEIGHT.bold},
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  heroName: {
    fontSize: 22,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.5,
  },
  heroEmail: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  editProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
  },
  editProfileText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semiBold,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 36,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.primary,
  },

  // Section (edit form)
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },

  // Inputs
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 48,
  },
  inputReadOnly: {borderColor: '#1e2420', backgroundColor: '#111413'},
  inputError: {borderColor: COLORS.error},
  inputIcon: {marginRight: 8},
  input: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    padding: 0,
  },
  errorText: {fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: 4},
  readOnlyHint: {fontSize: 11, color: COLORS.textDisabled, marginTop: 4},

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 50,
    marginTop: SPACING.xs,
  },
  saveBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#0B0F0E',
  },

  // Menu items
  menuSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  menuDivider: {height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginHorizontal: SPACING.md},

  // Gym pill
  gymPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    marginBottom: SPACING.lg,
  },
  gymLogo: {width: 16, height: 16, borderRadius: 8},
  gymName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.primary,
  },

  bottomBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.background,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: '#FFB4AB',
  },
  signOutText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: '#5C1C18',
    letterSpacing: 0.8,
  },

  version: {
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDisabled,
    marginTop: SPACING.sm,
  },
});

export default ProfileScreen;
