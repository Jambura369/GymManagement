import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import {supabase} from '../supabase/client';
import {Notification, ApiResponse} from '../types';
import messaging from '@react-native-firebase/messaging';
import {getExpiringMemberships} from './studentService';

// ---- Fetch notifications ----
export const fetchNotifications = async (
  gymId: string,
  userId: string,
  userRole: string,
): Promise<ApiResponse<Notification[]>> => {
  try {
    const {data, error} = await supabase
      .from('notifications')
      .select('*')
      .eq('gym_id', gymId)
      .or(
        `target_user_id.eq.${userId},and(target_user_id.is.null,target_role.in.(${userRole},All))`,
      )
      .order('created_at', {ascending: false})
      .limit(50);

    if (error) return {data: null, error: error.message};
    return {data: data as Notification[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Mark as read ----
export const markNotificationRead = async (
  notificationId: string,
): Promise<void> => {
  await supabase
    .from('notifications')
    .update({is_read: true})
    .eq('id', notificationId);
};

// ---- Mark all read ----
export const markAllRead = async (
  gymId: string,
  userId: string,
  userRole: string,
): Promise<void> => {
  await supabase
    .from('notifications')
    .update({is_read: true})
    .eq('gym_id', gymId)
    .or(
      `target_user_id.eq.${userId},and(target_user_id.is.null,target_role.in.(${userRole},All))`,
    );
};

// ---- Delete a notification ----
export const deleteNotification = async (
  notificationId: string,
): Promise<void> => {
  await supabase.from('notifications').delete().eq('id', notificationId);
};

// ---- Get unread count ----
export const getUnreadCount = async (
  gymId: string,
  userId: string,
  userRole: string,
): Promise<number> => {
  const {count} = await supabase
    .from('notifications')
    .select('*', {count: 'exact', head: true})
    .eq('gym_id', gymId)
    .eq('is_read', false)
    .or(
      `target_user_id.eq.${userId},and(target_user_id.is.null,target_role.in.(${userRole},All))`,
    );
  return count || 0;
};

// ---- FCM Setup ----
export const requestFCMPermission = async (): Promise<boolean> => {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
};

export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await messaging().getToken();
    return token;
  } catch {
    return null;
  }
};

export const setupFCMListeners = (
  onMessage: (notification: any) => void,
): (() => void) => {
  return messaging().onMessage(async remoteMessage => {
    onMessage(remoteMessage);
  });
};

// ---- Auto Expiry Notification Check ----
// Runs once per day on dashboard mount. Sends local FCM display notifications
// for members expiring in exactly 7 days and exactly 3 days.
const LAST_CHECK_KEY = 'last_expiry_notification_check';

export const checkAndSendExpiryNotifications = async (
  gymId: string,
): Promise<void> => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
    if (lastCheck === today) return; // already ran today

    const [res7, res3] = await Promise.all([
      getExpiringMemberships(gymId, 7),
      getExpiringMemberships(gymId, 3),
    ]);

    // Members expiring in exactly 7 days (not in 3-day bucket)
    const in7 = (res7.data ?? []).filter(s => {
      const diff = dayjs(s.membership_expiry!).startOf('day').diff(dayjs().startOf('day'), 'day');
      return diff >= 4 && diff <= 7;
    });

    // Members expiring in exactly 1-3 days
    const in3 = (res3.data ?? []).filter(s => {
      const diff = dayjs(s.membership_expiry!).startOf('day').diff(dayjs().startOf('day'), 'day');
      return diff >= 0 && diff <= 3;
    });

    for (const student of in7) {
      const diff = dayjs(student.membership_expiry!).startOf('day').diff(dayjs().startOf('day'), 'day');
      await messaging().sendMessage?.({
        data: {
          title: `⏰ Membership Expiring Soon`,
          body: `${student.name}'s membership expires in ${diff} day${diff === 1 ? '' : 's'}`,
        },
      });
      // Insert in-app notification row
      await supabase.from('notifications').insert({
        gym_id: gymId,
        title: 'Membership Expiring Soon',
        body: `${student.name}'s membership expires in ${diff} day${diff === 1 ? '' : 's'}`,
        target_role: 'All',
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    for (const student of in3) {
      const diff = dayjs(student.membership_expiry!).startOf('day').diff(dayjs().startOf('day'), 'day');
      const label = diff === 0 ? 'today' : `in ${diff} day${diff === 1 ? '' : 's'}`;
      await supabase.from('notifications').insert({
        gym_id: gymId,
        title: '🔴 Urgent: Membership Expiring',
        body: `${student.name}'s membership expires ${label}. Renew now!`,
        target_role: 'All',
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    await AsyncStorage.setItem(LAST_CHECK_KEY, today);
  } catch {
    // Non-critical — swallow errors silently
  }
};
