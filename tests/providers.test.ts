import { describe, expect, it } from 'vitest';
import { emptyData } from '../src/domain/models';
import { mergeExternalAssignments } from '../src/providers/merge';
import { ManabaProvider } from '../src/providers/AssignmentProvider';
import { now } from './fixtures';

describe('同期境界（実際の取得は未実装）', () => {
  let count = 0; const uuid = () => `id-${++count}`;
  const row = { courseName: '授業', assignmentTitle: '課題', deadline: '2026-09-14T23:59:00+09:00', assignmentUrl: 'https://example.com/task/1' };
  it('架空の取得処理を実行しない', async () => { await expect(new ManabaProvider().syncAssignments()).rejects.toThrow('未設定'); });
  it('同じ課題を重複させず、締切変更でもメモ・重要度を保持する', () => {
    const first = mergeExternalAssignments(emptyData(), [row], uuid, now.toISOString());
    first.data.assignments[0]!.memo = '自分のメモ'; first.data.assignments[0]!.importance = 5;
    const result = mergeExternalAssignments(first.data, [{ ...row, deadline: '2026-09-20T23:59:00+09:00' }, { ...row, deadline: '2026-09-20T23:59:00+09:00' }], uuid, now.toISOString());
    expect(result.data.assignments).toHaveLength(1); expect(result.data.courses).toHaveLength(1);
    expect(result.data.assignments[0]).toMatchObject({ id: first.data.assignments[0]!.id, memo: '自分のメモ', importance: 5, deadline: '2026-09-20T23:59:00+09:00' });
  });
  it('必須情報・識別子が欠ける課題はスキップしクラッシュしない', () => {
    const result = mergeExternalAssignments(emptyData(), [{}, { ...row, deadline: 'bad' }, { ...row, assignmentUrl: undefined }, { ...row, assignmentUrl: 'javascript:alert(1)' }, row], uuid, now.toISOString());
    expect(result.skipped).toBe(4); expect(result.data.assignments).toHaveLength(1);
  });
  it('取得できない提出状況はローカル状態を保持する', () => {
    const first = mergeExternalAssignments(emptyData(), [{ ...row, submissionStatus: 'submitted' }], uuid, now.toISOString());
    expect(mergeExternalAssignments(first.data, [row], uuid, now.toISOString()).data.assignments[0]?.status).toBe('submitted');
  });
  it('外部データの型が不正でも他の課題の処理を継続する', () => {
    const result = mergeExternalAssignments(emptyData(), [null, { ...row, courseName: 42 }, row], uuid, now.toISOString());
    expect(result.skipped).toBe(2);
    expect(result.data.assignments).toHaveLength(1);
  });
});
