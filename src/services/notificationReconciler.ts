import { AppData } from '../domain/models';
import { Reminder, planReminders } from '../domain/reminders';

export interface NotificationPort {
  list(): Promise<{ id: string; signature?: string }[]>;
  cancel(id: string): Promise<void>;
  allowed(): Promise<boolean>;
  schedule(reminder: Reminder, signature: string): Promise<void>;
}
export const signatureOf = (r: Reminder): string => JSON.stringify([r.at, r.title, r.body]);
export async function reconcileNotifications(port: NotificationPort, state: AppData, now: Date, limit = 500): Promise<string | null> {
  const reminders = planReminders(state.assignments, state.settings, now);
  const desired = reminders.slice(0, limit);
  const existing = await port.list();
  const desiredById = new Map(desired.map(r => [r.id, r]));
  const unchanged = new Set<string>();
  // 先に古い予約を取り消す。権限が取り消されていても提出済み予約を残さない。
  for (const old of existing) {
    if (!old.id.startsWith('suke:')) continue;
    const next = desiredById.get(old.id);
    if (next && old.signature === signatureOf(next)) unchanged.add(old.id);
    else await port.cancel(old.id);
  }
  if (desired.length && !await port.allowed()) return '通知が許可されていません。設定から通知を許可してください。';
  for (const reminder of desired) {
    if (!unchanged.has(reminder.id)) await port.schedule(reminder, signatureOf(reminder));
  }
  return reminders.length > limit ? `端末の予約上限に合わせ、直近${limit}件の通知を予約しました。アプリを開くと予約を補充します。` : null;
}
