import { Capacitor } from '@capacitor/core';
import type { PermissionState, PluginListenerHandle } from '@capacitor/core';
import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import type { ReminderPreferences } from '../shared/appPreferences';

export type ReminderPermissionState = PermissionState | 'unsupported' | 'unknown';

export const REMINDER_CHANNEL_ID = 'check-in-reminders';
export const REMINDER_NOTIFICATION_ID_START = 730_000;
const REMINDER_NOTIFICATION_ID_END = REMINDER_NOTIFICATION_ID_START + (24 * 60) - 1;
const REMINDER_KIND = 'check-in-reminder';

export const isNativeMobilePlatform = () => Capacitor.isNativePlatform();

export const getReminderNotificationId = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return REMINDER_NOTIFICATION_ID_START + (hours * 60) + minutes;
};

export const buildReminderNotifications = (
  reminders: ReminderPreferences,
  platform: string = Capacitor.getPlatform()
): LocalNotificationSchema[] => reminders.times.map((time) => {
  const [hour, minute] = time.split(':').map(Number);
  return {
    id: getReminderNotificationId(time),
    title: '今天也记录一下吧',
    body: '花一分钟，写下此刻的心情。',
    schedule: {
      on: { hour, minute },
      allowWhileIdle: platform === 'android',
    },
    channelId: platform === 'android' ? REMINDER_CHANNEL_ID : undefined,
    autoCancel: true,
    extra: { kind: REMINDER_KIND, openRecord: true },
  };
});

const loadLocalNotifications = async () => {
  const module = await import('@capacitor/local-notifications');

  // Capacitor plugin proxies expose arbitrary method names, including `then`.
  // Returning the proxy directly from an async function makes Promise treat it
  // as a thenable and invoke a nonexistent native LocalNotifications.then().
  return { notifications: module.LocalNotifications };
};

export const getReminderPermissionState = async (): Promise<ReminderPermissionState> => {
  if (!isNativeMobilePlatform()) return 'unsupported';
  const { notifications } = await loadLocalNotifications();
  return (await notifications.checkPermissions()).display;
};

export const requestReminderPermission = async (): Promise<ReminderPermissionState> => {
  if (!isNativeMobilePlatform()) return 'unsupported';
  const { notifications } = await loadLocalNotifications();
  const current = await notifications.checkPermissions();
  if (current.display === 'granted') return current.display;
  return (await notifications.requestPermissions()).display;
};

export const getReminderExactAlarmPermissionState = async (): Promise<ReminderPermissionState> => {
  if (!isNativeMobilePlatform() || Capacitor.getPlatform() !== 'android') return 'unsupported';
  const { notifications } = await loadLocalNotifications();
  return (await notifications.checkExactNotificationSetting()).exact_alarm;
};

export const requestReminderExactAlarmPermission = async (): Promise<ReminderPermissionState> => {
  if (!isNativeMobilePlatform() || Capacitor.getPlatform() !== 'android') return 'unsupported';
  const { notifications } = await loadLocalNotifications();
  const current = await notifications.checkExactNotificationSetting();
  if (current.exact_alarm === 'granted') return current.exact_alarm;
  return (await notifications.changeExactNotificationSetting()).exact_alarm;
};

const isManagedReminderId = (id: number) =>
  id >= REMINDER_NOTIFICATION_ID_START && id <= REMINDER_NOTIFICATION_ID_END;

export const syncCheckInReminderSchedule = async (reminders: ReminderPreferences) => {
  if (!isNativeMobilePlatform()) {
    return { status: 'unsupported' as const, scheduledCount: 0 };
  }

  const { notifications } = await loadLocalNotifications();
  const pending = await notifications.getPending();
  const managedNotifications = pending.notifications
    .filter((notification) => isManagedReminderId(notification.id))
    .map(({ id }) => ({ id }));

  if (managedNotifications.length > 0) {
    await notifications.cancel({ notifications: managedNotifications });
  }

  if (!reminders.enabled || reminders.times.length === 0) {
    return { status: 'disabled' as const, scheduledCount: 0 };
  }

  const permission = await notifications.checkPermissions();
  if (permission.display !== 'granted') {
    return { status: 'permission-required' as const, scheduledCount: 0 };
  }

  const platform = Capacitor.getPlatform();
  if (platform === 'android') {
    await notifications.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: '打卡提醒',
      description: '提醒记录每天的心情和状态',
      importance: 3,
    });
  }

  const scheduled = buildReminderNotifications(reminders, platform);
  await notifications.schedule({ notifications: scheduled });

  const pendingAfterSchedule = await notifications.getPending();
  const pendingIds = new Set(pendingAfterSchedule.notifications.map(({ id }) => id));
  if (scheduled.some(({ id }) => !pendingIds.has(id))) {
    throw new Error('系统未能登记打卡提醒，请检查精确提醒和后台运行权限。');
  }

  return { status: 'scheduled' as const, scheduledCount: scheduled.length };
};

export const addCheckInReminderActionListener = async (
  onOpenRecord: () => void
): Promise<PluginListenerHandle | null> => {
  if (!isNativeMobilePlatform()) return null;
  const { notifications } = await loadLocalNotifications();
  return notifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    if (notification.extra?.kind === REMINDER_KIND) onOpenRecord();
  });
};
