import { Assignment, ReminderKey, Settings, reminderKeys, reminderLabels } from './models';
import { HOUR, deadlineLabel } from './dates';

export type Reminder = { id: string; assignmentId: string; at: number; title: string; body: string };
export function planReminders(assignments: Assignment[], settings: Settings, now: Date): Reminder[] {
  const result: Reminder[] = [];
  for (const a of assignments) {
    if (a.status === 'submitted') continue;
    for (const key of reminderKeys) {
      if (!settings[key]) continue;
      const deadline = new Date(a.deadline);
      const date = new Date(deadline);
      if (key === 'threeHours') date.setTime(deadline.getTime() - 3 * HOUR);
      else {
        const days: Partial<Record<ReminderKey, number>> = { sevenDays: 7, threeDays: 3, oneDay: 1, sameDay: 0 };
        date.setDate(date.getDate() - (days[key] ?? 0));
        date.setHours(settings.dailyHour, 0, 0, 0);
        // 朝9時より早い締切は当日0時に通知する。
        if (key === 'sameDay' && date >= deadline) date.setHours(0, 0, 0, 0);
      }
      if (date <= now || date >= deadline) continue;
      result.push({ id: `suke:${a.id}:${key}`, assignmentId: a.id, at: date.getTime(),
        title: `${key === 'sameDay' ? '今日締切 · ' : ''}${a.courseName} ${a.title}`,
        body: `${reminderLabels[key]}のお知らせ。${deadlineLabel(a.deadline)}まで`,
      });
    }
  }
  return result.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}
