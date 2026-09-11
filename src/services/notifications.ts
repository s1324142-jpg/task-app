import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppData } from '../domain/models';
import { NotificationPort, reconcileNotifications } from './notificationReconciler';

Notifications.setNotificationHandler({
  handleNotification: async notification => {
    const id = notification.request.content.data?.assignmentId;
    const show = typeof id !== 'string' || !suppressed.has(id);
    return { shouldPlaySound: show, shouldSetBadge: false, shouldShowBanner: show, shouldShowList: show };
  },
});
let suppressed = new Set<string>();
async function channel(): Promise<void> {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('deadlines', {
    name: '課題の締切', importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200], lightColor: '#377E70',
  });
}
export async function requestNotificationPermission(): Promise<boolean> {
  await channel();
  const result = await Notifications.requestPermissionsAsync();
  return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}
const port: NotificationPort = {
  list: async () => (await Notifications.getAllScheduledNotificationsAsync()).map(n => ({
    id: n.identifier, signature: typeof n.content.data?.signature === 'string' ? n.content.data.signature : undefined,
  })),
  cancel: id => Notifications.cancelScheduledNotificationAsync(id),
  allowed: async () => {
    await channel();
    const result = await Notifications.getPermissionsAsync();
    return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  },
  schedule: async (r, signature) => {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, sound: 'default', data: { assignmentId: r.assignmentId, signature } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.at), channelId: 'deadlines' },
    });
  },
};
export async function syncNotifications(data: AppData): Promise<string | null> {
  suppressed = new Set(data.assignments.filter(a => a.status === 'submitted').map(a => a.id));
  return reconcileNotifications(port, data, new Date(), Platform.OS === 'ios' ? 60 : 500);
}
