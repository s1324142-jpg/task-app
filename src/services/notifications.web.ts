import { AppData } from '../domain/models';
export async function requestNotificationPermission(): Promise<boolean> { return false; }
export async function syncNotifications(_data: AppData): Promise<string | null> {
  return 'PCプレビューでは締切通知は配信されません。通知はAndroidアプリで利用できます。';
}
