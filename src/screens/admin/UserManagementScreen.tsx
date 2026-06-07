import React, {useEffect, useState} from 'react';
import {StyleSheet, View, Text, FlatList, TouchableOpacity, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {FAB, Card, Switch} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, ROLE_COLORS} from '../../constants';
import {RootStackParamList, User} from '../../types';
import {fetchUsers, toggleUserActive} from '../../services/userService';
import AppHeader from '../../components/common/AppHeader';
import EmptyState from '../../components/common/EmptyState';
import RoleBadge from '../../components/common/RoleBadge';
import AvatarWithFallback from '../../components/common/AvatarWithFallback';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const UserManagementScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {gym, user: currentUser} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    if (!gym) return;
    setLoading(true);
    const result = await fetchUsers(gym.id);
    if (result.data) setUsers(result.data);
    setLoading(false);
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Not Allowed', 'You cannot deactivate your own account.');
      return;
    }
    const action = user.is_active ? 'deactivate' : 'activate';
    Alert.alert('Confirm', `Are you sure you want to ${action} ${user.name}?`, [
      {text: 'Cancel'},
      {
        text: 'Confirm',
        onPress: async () => {
          const result = await toggleUserActive(user.id, !user.is_active);
          if (!result.error) {
            setUsers(prev => prev.map(u => u.id === user.id ? {...u, is_active: !u.is_active} : u));
            Toast.show({type: 'success', text1: `User ${action}d`});
          }
        },
      },
    ]);
  };

  const renderUser = ({item}: {item: User}) => (
    <Card style={[styles.card, {backgroundColor: cardBg}]}>
      <Card.Content style={styles.cardContent}>
        <AvatarWithFallback
          uri={item.avatar}
          name={item.name}
          size={44}
          color={ROLE_COLORS[item.role] || COLORS.primary}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.name, {color: textColor}]}>{item.name}</Text>
          <Text style={[styles.email, {color: COLORS.textSecondary}]}>{item.email}</Text>
          {item.phone && <Text style={[styles.phone, {color: COLORS.textSecondary}]}>{item.phone}</Text>}
          <RoleBadge role={item.role} size="sm" />
        </View>
        <View style={styles.actions}>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggleActive(item)}
            color={COLORS.success}
            disabled={item.id === currentUser?.id}
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      <AppHeader title="Staff Management" subtitle={`${users.length} members`} onBack={() => navigation.goBack()} isDark={isDark} />

      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        contentContainerStyle={[styles.list, {paddingBottom: 80 + insets.bottom}]}
        ListEmptyComponent={
          <EmptyState icon="account-group-outline" title="No staff members" subtitle="Add managers and trainers" isDark={isDark} />
        }
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="account-plus"
        style={[styles.fab, {backgroundColor: COLORS.primary, bottom: insets.bottom + SPACING.lg}]}
        color="#FFF"
        onPress={() => navigation.navigate('AddUser')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {padding: SPACING.md},
  card: {borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.sm, elevation: 2},
  cardContent: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  userInfo: {flex: 1, gap: 2},
  name: {fontSize: 15, fontWeight: '700'},
  email: {fontSize: 12},
  phone: {fontSize: 12},
  actions: {alignItems: 'center'},
  fab: {position: 'absolute', bottom: SPACING.lg, right: SPACING.lg},
});

export default UserManagementScreen;
