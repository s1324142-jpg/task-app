import { describe, expect, it } from 'vitest';
import { planReminders, Reminder } from '../src/domain/reminders';
import { NotificationPort, reconcileNotifications } from '../src/services/notificationReconciler';
import { DAY } from '../src/domain/dates';
import { assignment, now, state } from './fixtures';

function fakePort() {
  const scheduled = new Map<string, { reminder: Reminder; signature: string }>();
  const cancelled: string[] = []; let calls = 0;
  const port: NotificationPort = {
    list: async () => [...scheduled].map(([id, value]) => ({ id, signature: value.signature })),
    cancel: async id => { cancelled.push(id); scheduled.delete(id); },
    allowed: async () => true,
    schedule: async (reminder, signature) => { calls++; scheduled.set(reminder.id, { reminder, signature }); },
  };
  return { port, scheduled, cancelled, calls: () => calls };
}
describe('通知の計画', () => {
  it('5種類の未来通知を生成し、日単位は日本時間9時にする', () => {
    const data = state([assignment({ deadline: '2026-09-30T23:59:00+09:00' })]);
    const reminders = planReminders(data.assignments, data.settings, now);
    expect(reminders).toHaveLength(5);
    expect(reminders.find(r => r.id.endsWith('sevenDays'))?.at).toBe(+new Date('2026-09-23T09:00:00+09:00'));
    expect(reminders.find(r => r.id.endsWith('threeHours'))?.at).toBe(+new Date('2026-09-30T20:59:00+09:00'));
  });
  it('朝の締切は当日0時、過去時刻は予約しない', () => {
    const data = state([assignment({ deadline: '2026-09-12T06:00:00+09:00' })]);
    expect(planReminders(data.assignments, data.settings, now).find(r => r.id.endsWith('sameDay'))?.at).toBe(+new Date('2026-09-12T00:00:00+09:00'));
    expect(planReminders(data.assignments, data.settings, new Date('2026-09-12T06:00:00+09:00'))).toEqual([]);
  });
  it('提出済みとOFF設定を除外し、完了・未提出を残す', () => {
    const data = state([assignment({ status: 'submitted' })]);
    expect(planReminders(data.assignments, data.settings, now)).toEqual([]);
    data.assignments[0]!.status = 'completed';
    expect(planReminders(data.assignments, data.settings, now).length).toBeGreaterThan(0);
    const settings = { ...data.settings, sevenDays: false, threeDays: false, oneDay: false, sameDay: false, threeHours: false };
    expect(planReminders(data.assignments, settings, now)).toEqual([]);
  });
});
describe('通知予約の整合性', () => {
  it('再起動・再同期で予約を重複させない', async () => {
    const fake = fakePort(); const data = state();
    await reconcileNotifications(fake.port, data, now); const count = fake.calls();
    await reconcileNotifications(fake.port, data, now); expect(fake.calls()).toBe(count);
  });
  it('締切変更時に古い予約を取消し、新しい日時で予約する', async () => {
    const fake = fakePort(); const data = state();
    await reconcileNotifications(fake.port, data, now);
    data.assignments[0]!.deadline = new Date(+new Date(data.assignments[0]!.deadline) + DAY).toISOString();
    await reconcileNotifications(fake.port, data, now);
    expect(fake.cancelled.length).toBeGreaterThan(0);
    expect([...fake.scheduled.values()].map(v => v.reminder)).toEqual(planReminders(data.assignments, data.settings, now));
  });
  it.each(['submitted', 'deleted', 'disabled'])('%sで予約を取消し、未提出に戻すと再予約する', async action => {
    const fake = fakePort(); const data = state();
    await reconcileNotifications(fake.port, data, now);
    if (action === 'submitted') data.assignments[0]!.status = 'submitted';
    if (action === 'deleted') data.assignments = [];
    if (action === 'disabled') data.settings = { ...data.settings, sevenDays: false, threeDays: false, oneDay: false, sameDay: false, threeHours: false };
    fake.port.allowed = async () => false;
    await reconcileNotifications(fake.port, data, now); expect(fake.scheduled.size).toBe(0);
    fake.port.allowed = async () => true;
    await reconcileNotifications(fake.port, state(), now); expect(fake.scheduled.size).toBeGreaterThan(0);
  });
  it('予約上限を超えた場合は直近分に絞り、警告する', async () => {
    const fake = fakePort();
    expect(await reconcileNotifications(fake.port, state(), now, 1)).toContain('直近1件');
    expect(fake.scheduled.size).toBe(1);
  });
});
