import React, {useState} from 'react';
import {StyleSheet, View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Avatar, Card} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {updateUser} from '../../services/userService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';
import RoleBadge from '../../components/common/RoleBadge';

const PHONE_REGEX = /^[6-9]\d{9}$|^\+?[1-9]\d{7,14}$/;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user, updateUser: updateUserStore, logout} = useAuthStore();
  const {isDark} = useThemeStore();

  const insets = useSafeAreaInsets();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

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
    const result = await updateUser(user.id, {name: name.trim(), phone: phone.trim()});
    setLoading(false);
    if (result.data) {
      updateUserStore({name: name.trim(), phone: phone.trim()});
      Toast.show({type: 'success', text1: 'Profile Updated!'});
    } else {
      Toast.show({type: 'error', text1: 'Update failed', text2: result.error || undefined});
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
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
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: bgColor}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="My Profile" onBack={() => navigation.goBack()} isDark={isDark} />
      <ScrollView contentContainerStyle={[styles.scroll, {paddingBottom: SPACING.xxl + insets.bottom}]} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileHeader, {backgroundColor: COLORS.primary}]}>
          <Avatar.Text
            size={80}
            label={(user?.name || 'U').slice(0, 2).toUpperCase()}
            style={{backgroundColor: 'rgba(255,255,255,0.3)'}}
            labelStyle={{fontSize: 24}}
          />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <RoleBadge role={user?.role || 'Trainer'} />
        </View>

        <Card style={[styles.card, {backgroundColor: cardBg}]}>
          <Card.Title title="Edit Profile" />
          <Card.Content>
            <AppInput
              label="Full Name"
              value={name}
              onChangeText={text => {setName(text); setNameError('');}}
              error={nameError || undefined}
            />
            <AppInput
              label="Phone"
              value={phone}
              onChangeText={text => {setPhone(text); setPhoneError('');}}
              keyboardType="phone-pad"
              error={phoneError || undefined}
            />
            <AppInput
              label="Email"
              value={user?.email || ''}
              onChangeText={() => {}}
              editable={false}
              disabled
            />
            <AppButton
              title="Save Changes"
              onPress={handleSave}
              loading={loading}
              icon="content-save"
            />
          </Card.Content>
        </Card>

        <AppButton
          title={loggingOut ? 'Signing Out…' : 'Sign Out'}
          onPress={handleLogout}
          mode="outlined"
          color={COLORS.error}
          style={styles.logoutBtn}
          icon="logout"
          disabled={loggingOut}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {},
  profileHeader: {
    alignItems: 'center',
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
    gap: SPACING.sm,
  },
  name: {color: '#FFF', fontSize: 22, fontWeight: '700'},
  email: {color: 'rgba(255,255,255,0.8)', fontSize: 13},
  card: {margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, elevation: 2},
  logoutBtn: {marginHorizontal: SPACING.md},
});

export default ProfileScreen;
