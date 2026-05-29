import React, {useState} from 'react';
import {StyleSheet, View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Avatar, Card} from 'react-native-paper';
import Toast from 'react-native-toast-message';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {updateUser} from '../../services/userService';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppHeader from '../../components/common/AppHeader';
import RoleBadge from '../../components/common/RoleBadge';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user, updateUser: updateUserStore, logout} = useAuthStore();
  const {isDark} = useThemeStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const result = await updateUser(user.id, {name, phone});
    setLoading(false);
    if (result.data) {
      updateUserStore({name, phone});
      Toast.show({type: 'success', text1: 'Profile Updated!'});
    } else {
      Toast.show({type: 'error', text1: 'Update failed'});
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, {backgroundColor: bgColor}]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="My Profile" onBack={() => navigation.goBack()} isDark={isDark} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileHeader, {backgroundColor: COLORS.primary}]}>
          <Avatar.Text size={80} label={(user?.name || 'U').slice(0, 2).toUpperCase()} style={{backgroundColor: 'rgba(255,255,255,0.3)'}} labelStyle={{fontSize: 24}} />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <RoleBadge role={user?.role || 'Trainer'} />
        </View>

        <Card style={[styles.card, {backgroundColor: cardBg}]}>
          <Card.Title title="Edit Profile" />
          <Card.Content>
            <AppInput label="Full Name" value={name} onChangeText={setName} />
            <AppInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <AppInput label="Email" value={user?.email || ''} onChangeText={() => {}} editable={false} disabled />
            <AppButton title="Save Changes" onPress={handleSave} loading={loading} icon="content-save" />
          </Card.Content>
        </Card>

        <AppButton
          title="Sign Out"
          onPress={() => Alert.alert('Sign Out', 'Are you sure?', [{text: 'Cancel'}, {text: 'Sign Out', onPress: logout, style: 'destructive'}])}
          mode="outlined"
          color={COLORS.error}
          style={styles.logoutBtn}
          icon="logout"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {paddingBottom: SPACING.xxl},
  profileHeader: {alignItems: 'center', padding: SPACING.xl, paddingTop: SPACING.lg, gap: SPACING.sm},
  name: {color: '#FFF', fontSize: 22, fontWeight: '700'},
  email: {color: 'rgba(255,255,255,0.8)', fontSize: 13},
  card: {margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, elevation: 2},
  logoutBtn: {marginHorizontal: SPACING.md},
});

export default ProfileScreen;
