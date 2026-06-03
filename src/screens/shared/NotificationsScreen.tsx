import React, {useEffect, useState} from 'react';
import {StyleSheet, View, Text, FlatList, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Card} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';
import {Notification} from '../../types';
import {
  fetchNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
} from '../../services/notificationService';
import AppHeader from '../../components/common/AppHeader';
import EmptyState from '../../components/common/EmptyState';
import {RootStackParamList} from '../../types';

dayjs.extend(relativeTime);

const NOTIF_ICONS: Record<string, string> = {
  salary: 'currency-inr',
  expiry: 'calendar-alert',
  verification: 'account-check',
  general: 'bell',
};

const NOTIF_COLORS: Record<string, string> = {
  salary: COLORS.success,
  expiry: COLORS.warning,
  verification: COLORS.primary,
  general: COLORS.info,
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    if (!gym || !user) return;
    setLoading(true);
    const result = await fetchNotifications(gym.id, user.id, user.role);
    if (result.data) setNotifications(result.data);
    setLoading(false);
  };

  const handleRead = async (notif: Notification) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? {...n, is_read: true} : n),
      );
    }
    // Deep-link to relevant screen
    if (notif.notification_type === 'verification' || notif.notification_type === 'verification_request') {
      navigation.navigate('VerificationList');
    } else if (notif.notification_type === 'expiry' && notif.reference_id) {
      navigation.navigate('StudentDetail', {studentId: notif.reference_id});
    }
  };

  const handleMarkAllRead = async () => {
    if (!gym || !user) return;
    await markAllRead(gym.id, user.id, user.role);
    setNotifications(prev => prev.map(n => ({...n, is_read: true})));
  };

  const handleDelete = async (notifId: string) => {
    await deleteNotification(notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  const renderItem = ({item}: {item: Notification}) => {
    const icon = NOTIF_ICONS[item.notification_type] || 'bell';
    const color = NOTIF_COLORS[item.notification_type] || COLORS.info;

    return (
      <TouchableOpacity onPress={() => handleRead(item)}>
        <Card
          style={[
            styles.card,
            {
              backgroundColor: item.is_read
                ? cardBg
                : isDark
                ? COLORS.primary + '15'
                : COLORS.primary + '08',
            },
          ]}>
          <Card.Content style={styles.cardContent}>
            <View style={[styles.iconContainer, {backgroundColor: color + '20'}]}>
              <MaterialCommunityIcons name={icon} size={22} color={color} />
              {!item.is_read && <View style={styles.unreadDot} />}
            </View>
            <View style={styles.notifBody}>
              <Text style={[styles.title, {color: textColor}]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.message, {color: COLORS.textSecondary}]} numberOfLines={2}>
                {item.message}
              </Text>
              <Text style={[styles.time, {color: COLORS.textSecondary}]}>
                {dayjs(item.created_at).fromNow()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item.id)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <MaterialCommunityIcons name="close" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      <AppHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        onBack={() => navigation.goBack()}
        isDark={isDark}
        rightComponent={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={{color: COLORS.primary, fontSize: 12, fontWeight: '600'}}>
                Mark all read
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, {paddingBottom: SPACING.xxl + insets.bottom}]}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="bell-off-outline"
              title="No notifications"
              subtitle="You're all caught up!"
              isDark={isDark}
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {padding: SPACING.md},
  card: {borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.xs, elevation: 1},
  cardContent: {flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm},
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  notifBody: {flex: 1},
  title: {fontSize: 14, fontWeight: '700', marginBottom: 2},
  message: {fontSize: 13, lineHeight: 18, marginBottom: 4},
  time: {fontSize: 11},
  readDot: {width: 8, height: 8, borderRadius: 4, marginTop: 4},
  deleteBtn: {padding: 4, marginLeft: 4},
});

export default NotificationsScreen;
