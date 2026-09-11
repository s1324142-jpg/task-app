import { Assignment } from './models';
import { DAY, HOUR } from './dates';

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
  return assignments.filter(a => a.status !== 'submitted' && (a.doToday || new Date(a.deadline).getTime() - now.getTime() <= 3 * DAY || priorityScore(a, now) >= 70))
    .sort((a, b) => priorityScore(b, now) - priorityScore(a, now) || Date.parse(a.deadline) - Date.parse(b.deadline) || a.id.localeCompare(b.id));
}
export function priorityReason(a: Assignment, now: Date): string {
  if (a.doToday) return '自分で今日やるに追加';
  if (a.status === 'completed') return '完成しています。提出を忘れずに';
  const remaining = new Date(a.deadline).getTime() - now.getTime();
  if (remaining <= 0) return '締切を過ぎています。提出状況を確認';
  if (remaining <= DAY) return '24時間以内に締切';
  if ((a.estimatedMinutes ?? 0) >= 120) return '時間がかかる課題を早めに';
  return '締切と重要度からおすすめ';
}
