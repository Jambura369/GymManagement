import {supabase} from '../supabase/client';
import {Notification, ApiResponse} from '../types';
import messaging from '@react-native-firebase/messaging';

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
