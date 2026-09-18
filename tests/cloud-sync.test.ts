import { describe, expect, it } from 'vitest';
import { mergeInitialData } from '../src/cloud/cloudRepository';
import { assignment, state } from './fixtures';

describe('クラウド初回同期', () => {
  it('両方の課題を残し、同じIDは更新日時が新しい方を採用する', () => {
    const remote = state([
      assignment({ title: 'クラウド旧版', updatedAt: '2026-09-10T00:00:00.000Z' }),
      assignment({ id: 'remote', title: 'クラウドだけ', updatedAt: '2026-09-12T00:00:00.000Z' }),
    ]);
    const local = state([
      assignment({ title: '端末最新版', updatedAt: '2026-09-13T00:00:00.000Z' }),
      assignment({ id: 'local', title: '端末だけ', updatedAt: '2026-09-12T00:00:00.000Z' }),
    ]);
    const merged = mergeInitialData(local, remote);
    expect(merged.assignments).toHaveLength(3);
    expect(merged.assignments.find(item => item.id === 'a1')?.title).toBe('端末最新版');
    expect(merged.assignments.map(item => item.id)).toEqual(expect.arrayContaining(['remote', 'local']));
  });
});
