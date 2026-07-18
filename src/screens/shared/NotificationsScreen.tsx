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
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';
import {Notification, RootStackParamList} from '../../types';
import {
  fetchNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
} from '../../services/notificationService';
import EmptyState from '../../components/common/EmptyState';

dayjs.extend(relativeTime);

const NOTIF_ICONS: Record<string, string> = {
  salary: 'currency-inr',
  expiry: 'calendar-alert',
  verification: 'account-check',
  general: 'bell',
};

const NOTIF_COLORS: Record<string, string> = {
  salary: '#39FF88',
  expiry: '#FFB020',
  verification: '#C6FF00',
  general: '#3DB8FF',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user, gym} = useAuthStore();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

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
      <TouchableOpacity
        style={[styles.card, !item.is_read && styles.cardUnread]}
        onPress={() => handleRead(item)}
        activeOpacity={0.75}>
        <View style={[styles.iconContainer, {backgroundColor: color + '20'}]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.notifBody}>
          <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.time}>{dayjs(item.created_at).fromNow()}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id)}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <MaterialCommunityIcons name="close" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

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
              isDark={true}
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: '#111413',
  },
  backBtn: {
    width: 24,
    height: 30,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {flex: 1, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary},
  markAllText: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.primary},
  list: {padding: SPACING.md},
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  cardUnread: {backgroundColor: COLORS.primary + '12'},
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
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
    borderColor: COLORS.background,
  },
  notifBody: {flex: 1},
  notifTitle: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 2},
  message: {fontSize: FONT_SIZE.xs, lineHeight: 18, color: COLORS.textSecondary, marginBottom: 4},
  time: {fontSize: FONT_SIZE.xs, color: COLORS.textDisabled},
  deleteBtn: {padding: 4, marginLeft: 4},
});

export default NotificationsScreen;
