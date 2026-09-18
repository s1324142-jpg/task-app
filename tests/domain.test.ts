import { describe, expect, it } from 'vitest';
import { priorityScore, todoAssignments, todayAssignments } from '../src/domain/priority';
import { DAY, HOUR, dayDifference, dayKey, isThisWeek, monthDays, relativeDeadline } from '../src/domain/dates';
import { courseNameForAssignment, upsertAssignment } from '../src/domain/assignments';
import { assignmentSchema, emptyData, stateSchema } from '../src/domain/models';
import { assignment, now, state } from './fixtures';

describe('優先順位', () => {
  it.each([[12, 130], [24, 110], [72, 80], [168, 50], [169, 30]])('%i時間後の締切スコアは%i', (hours, score) => {
    expect(priorityScore(assignment({ deadline: new Date(+now + hours * HOUR).toISOString() }), now)).toBe(score);
  });
  it('提出済みは手動指定が残っていても除外する', () => {
    const a = assignment({ status: 'submitted', doToday: true });
    expect(priorityScore(a, now)).toBe(-Infinity); expect(todoAssignments([a], now)).toEqual({ shouldDoToday: [], flexible: [] });
  });
  it('期限超過と完了・未提出を今日やるに残す', () => {
    const a = assignment({ status: 'completed', deadline: new Date(+now - HOUR).toISOString() });
    expect(todayAssignments([a], now)).toHaveLength(1);
  });
  it('余裕がある課題も優先度順に並べる', () => {
    const urgent = assignment({ id: 'urgent', importance: 1, deadline: new Date(+now + 48 * HOUR).toISOString() });
    const hard = assignment({ id: 'hard', importance: 5, estimatedMinutes: 180, deadline: new Date(+now + 5 * DAY).toISOString() });
    expect(todoAssignments([urgent, hard], now).flexible.map(a => a.id)).toEqual(['hard', 'urgent']);
  });
  it('遠い課題は余裕ありに置き、手動指定すると今日やるべきことへ移す', () => {
    const a = assignment({ deadline: new Date(+now + 30 * DAY).toISOString() });
    expect(todoAssignments([a], now)).toMatchObject({ shouldDoToday: [], flexible: [a] });
    expect(todoAssignments([{ ...a, doToday: true }], now)).toMatchObject({ shouldDoToday: [{ ...a, doToday: true }], flexible: [] });
  });
  it('24時間以上先でも提出日が翌日なら今日やるべきことへ自動追加する', () => {
    const tomorrow = assignment({ id: 'tomorrow', deadline: '2026-09-12T23:59:00+09:00' });
    const dayAfterTomorrow = assignment({ id: 'later', deadline: '2026-09-13T00:00:00+09:00' });
    const groups = todoAssignments([dayAfterTomorrow, tomorrow], now);
    expect(groups.shouldDoToday.map(a => a.id)).toEqual(['tomorrow']);
    expect(groups.flexible.map(a => a.id)).toEqual(['later']);
  });
});
describe('端末の日付とカレンダー', () => {
  it('UTCでは前日でも日本時間で今日に分類する', () => {
    expect(dayKey('2026-09-10T16:00:00Z')).toBe('2026-09-11');
    expect(dayDifference('2026-09-10T16:00:00Z', now)).toBe(0);
  });
  it('月曜〜日曜を今週とする', () => {
    expect(isThisWeek('2026-09-07T00:00:00+09:00', now)).toBe(true);
    expect(isThisWeek('2026-09-13T23:59:00+09:00', now)).toBe(true);
    expect(isThisWeek('2026-09-14T00:00:00+09:00', now)).toBe(false);
  });
  it('年をまたぐ月とうるう年でも42マスを生成する', () => {
    expect(monthDays(new Date(2027, 0, 1))).toHaveLength(42);
    expect(monthDays(new Date(2028, 1, 1)).some(d => dayKey(d) === '2028-02-29')).toBe(true);
    expect(monthDays(new Date(2026, 8, 1), true)[0]?.getDay()).toBe(1);
  });
  it('残り1分と締切超過を正しく表示する', () => {
    expect(relativeDeadline(new Date(+now + 1).toISOString(), now)).toBe('あと1分');
    expect(relativeDeadline(now.toISOString(), now)).toBe('締切超過');
  });
});
describe('課題の登録と編集', () => {
  it('課題表示では関連するコースの最新の授業名を使う', () => {
    const a = assignment({ courseName: '保存時の授業名' });
    expect(courseNameForAssignment(a, [{ id: a.courseId, name: 'コースに書かれた授業名', provider: 'manual' }])).toBe('コースに書かれた授業名');
    expect(courseNameForAssignment(a, [])).toBe('保存時の授業名');
  });
  it('同じ授業を再利用し、編集でもIDと作成日を維持する', () => {
    const a = assignment();
    const next = upsertAssignment(state(), { ...a, title: '更新した課題', status: 'submitted' }, a.id, new Date(+now + DAY).toISOString(), 'unused');
    expect(next.courses).toHaveLength(1); expect(next.assignments).toHaveLength(1);
    expect(next.assignments[0]).toMatchObject({ id: a.id, createdAt: a.createdAt, status: 'submitted', title: '更新した課題' });
  });
  it('新しい授業と課題を関連付けて保存する', () => {
    const next = upsertAssignment(emptyData(), assignment(), 'new', now.toISOString(), 'course');
    expect(next.assignments[0]?.courseId).toBe(next.courses[0]?.id); expect(stateSchema.safeParse(next).success).toBe(true);
  });
  it('不正な締切・URL・空タイトル・未関連付けを拒否する', () => {
    for (const patch of [{ deadline: 'invalid' }, { title: ' ' }, { sourceUrl: 'javascript:alert(1)' }, { estimatedMinutes: -1 }]) expect(assignmentSchema.safeParse(assignment(patch)).success).toBe(false);
    expect(stateSchema.safeParse({ ...state(), courses: [] }).success).toBe(false);
  });
});
