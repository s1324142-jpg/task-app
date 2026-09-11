import { Assignment } from './models';
import { DAY, HOUR, dayDifference } from './dates';

export function priorityScore(assignment: Assignment, now: Date): number {
  if (assignment.status === 'submitted') return -Infinity;
  const remaining = new Date(assignment.deadline).getTime() - now.getTime();
  const urgency = remaining <= 12 * HOUR ? 100 : remaining <= DAY ? 80 : remaining <= 3 * DAY ? 50 : remaining <= 7 * DAY ? 20 : 0;
  const minutes = assignment.estimatedMinutes ?? 0;
  // 完成した課題は作業時間を加算せず、提出の緊急度を維持する。
  const effort = assignment.status === 'completed' ? 0 : minutes >= 180 ? 30 : minutes >= 60 ? 15 : 0;
  return urgency + effort + assignment.importance * 10 + (assignment.doToday ? 100 : 0);
}
export function todayAssignments(assignments: Assignment[], now: Date): Assignment[] {
  return todoAssignments(assignments, now).shouldDoToday;
}
export function todoAssignments(assignments: Assignment[], now: Date): { shouldDoToday: Assignment[]; flexible: Assignment[] } {
  const active = assignments.filter(a => a.status !== 'submitted')
    .sort((a, b) => priorityScore(b, now) - priorityScore(a, now) || Date.parse(a.deadline) - Date.parse(b.deadline) || a.id.localeCompare(b.id));
  const shouldDoToday = active.filter(a => a.doToday || dayDifference(a.deadline, now) <= 1);
  const ids = new Set(shouldDoToday.map(a => a.id));
  return { shouldDoToday, flexible: active.filter(a => !ids.has(a.id)) };
}
export function priorityReason(a: Assignment, now: Date): string {
  if (a.doToday) return '自分で今日やるべきことに追加';
  if (a.status === 'completed') return '完成しています。提出を忘れずに';
  const remaining = new Date(a.deadline).getTime() - now.getTime();
  const days = dayDifference(a.deadline, now);
  if (remaining <= 0) return '締切を過ぎています。提出状況を確認';
  if (days === 0) return '今日が提出期限';
  if (days === 1) return '明日が提出期限のため自動追加';
  if ((a.estimatedMinutes ?? 0) >= 120) return '時間がかかる課題を早めに';
  return '提出期限まで余裕あり';
}
