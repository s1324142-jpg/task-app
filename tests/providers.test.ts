import { describe, expect, it } from 'vitest';
import { emptyData } from '../src/domain/models';
import { mergeExternalAssignments } from '../src/providers/merge';
import { ManabaProvider } from '../src/providers/AssignmentProvider';
import { coursePathFromTaskPath, parseManabaDeadline, parseManabaSyncMessage, toExternalAssignments } from '../src/manaba/manabaSync';
import { now } from './fixtures';

describe('manaba同期', () => {
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
  it('課題URLから授業トップを区別し、課題種別を授業名として扱わない', () => {
    expect(coursePathFromTaskPath('/ct/course_123_report_456')).toBe('/ct/course_123');
    expect(coursePathFromTaskPath('/ct/course_abc_def_survey_789')).toBe('/ct/course_abc_def');
    expect(coursePathFromTaskPath('/ct/home_summary_report')).toBeNull();
  });
  it('再同期で誤取得した授業名を訂正し、参照されないmanaba授業を片付ける', () => {
    const first = mergeExternalAssignments(emptyData(), [{ ...row, courseName: 'レポート', externalId: '/ct/course_1_report_2' }], uuid, now.toISOString());
    const result = mergeExternalAssignments(first.data, [{ ...row, courseName: '情報処理', assignmentType: 'report', externalId: '/ct/course_1_report_2' }], uuid, now.toISOString());
    expect(result.data.assignments[0]).toMatchObject({ courseName: '情報処理', assignmentType: 'report' });
    expect(result.data.courses.map(course => course.name)).toEqual(['情報処理']);
  });
  it('外部データの型が不正でも他の課題の処理を継続する', () => {
    const result = mergeExternalAssignments(emptyData(), [null, { ...row, courseName: 42 }, row], uuid, now.toISOString());
    expect(result.skipped).toBe(2);
    expect(result.data.assignments).toHaveLength(1);
  });
  it('manabaの日本語締切をJSTのISO日時へ変換する', () => {
    expect(parseManabaDeadline('受付終了日時 2026年9月18日(金) 23:59')).toBe('2026-09-18T23:59:00+09:00');
    expect(parseManabaDeadline('受付開始日時 2026年9月1日(火) 09:00 受付終了日時 2026年9月18日(金) 23:59')).toBe('2026-09-18T23:59:00+09:00');
    expect(parseManabaDeadline('受付期間 2026年9月1日(火) 09:00 ～ 2026年9月18日(金) 23:59')).toBe('2026-09-18T23:59:00+09:00');
    expect(parseManabaDeadline('受付日時 2026/09/01 09:00〜2026/09/18 23:59')).toBe('2026-09-18T23:59:00+09:00');
    expect(parseManabaDeadline('期限 2026/02/30 12:00')).toBeNull();
    expect(parseManabaDeadline('締切なし')).toBeNull();
  });
  it('年が省略された締切は現在に最も近い年として扱う', () => {
    expect(parseManabaDeadline('12月31日 23:59', new Date('2027-01-02T00:00:00+09:00'))).toBe('2026-12-31T23:59:00+09:00');
  });
  it('WebViewからは必要な課題項目だけを受け取り、解析不能な締切を除外する', () => {
    const message = parseManabaSyncMessage({ kind: 'manaba-sync', status: 'ok', pages: 4, records: [
      { externalId: '/ct/course_1_report_2', courseName: '情報処理', assignmentTitle: '第1回レポート', deadlineText: '受付終了 2026/09/18 23:59', assignmentUrl: 'https://manaba.example.ac.jp/ct/course_1_report_2', assignmentType: 'report', submissionStatus: 'not_submitted' },
      { externalId: '/ct/course_1_query_3', courseName: '情報処理', assignmentTitle: '締切なし', deadlineText: '受付終了日時なし', assignmentUrl: 'https://manaba.example.ac.jp/ct/course_1_query_3', assignmentType: 'query' },
    ] });
    expect(message).not.toBeNull();
    const converted = toExternalAssignments(message!);
    expect(converted.records).toEqual([expect.objectContaining({ courseName: '情報処理', assignmentType: 'report', deadline: '2026-09-18T23:59:00+09:00' })]);
    expect(converted.skipped).toBe(1);
    expect(parseManabaSyncMessage({ kind: 'manaba-sync', status: 'ok', pages: 4, records: [{ password: 'secret' }] })).toBeNull();
  });
});
