export const HOUR = 3600000;
export const DAY = 24 * HOUR;
export function dayKey(value: Date | string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dayDifference(value: string, now: Date): number {
  const date = new Date(value);
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / DAY);
}
export function deadlineLabel(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function relativeDeadline(value: string, now: Date): string {
  const remaining = new Date(value).getTime() - now.getTime();
  if (remaining <= 0) return '締切超過';
  const minutes = Math.ceil(remaining / 60000);
  if (minutes < 60) return `あと${minutes}分`;
  if (remaining < DAY) return `あと${Math.floor(minutes / 60)}時間${minutes % 60}分`;
  return `あと${Math.ceil(remaining / DAY)}日`;
}
export function isThisWeek(value: string, now: Date): boolean {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const date = new Date(value);
  return date >= start && date < end;
}
export function monthDays(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}
