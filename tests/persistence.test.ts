import { describe, expect, it, vi } from 'vitest';
import { Repository } from '../src/data/repository';
import { AppController } from '../src/services/controller';
import { AppData } from '../src/domain/models';
import { state } from './fixtures';

describe('端末内保存', () => {
  it('保存後にアプリを再作成しても課題と授業が復元される', async () => {
    const values = new Map<string, string>();
    const storage = { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); } };
    await new Repository(storage).save(state()); expect(await new Repository(storage).load()).toEqual(state());
  });
  it('破損データを勝手に初期化・上書きしない', async () => {
    const storage = { getItem: async () => '{broken', setItem: vi.fn() };
    await expect(new Repository(storage).load()).rejects.toThrow(); expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('連続編集を直列化して変更を取りこぼさない', async () => {
    let saved = JSON.stringify(state()); let latest: AppData | undefined;
    const repository = new Repository({ getItem: async () => saved, setItem: async (_key, value) => { saved = value; } });
    const controller = new AppController(repository, async () => null, value => { latest = value; }, () => undefined);
    await controller.load();
    await Promise.all([
      controller.mutate(s => ({ ...s, assignments: s.assignments.map(a => ({ ...a, memo: 'メモ' })) })),
      controller.mutate(s => ({ ...s, assignments: s.assignments.map(a => ({ ...a, status: 'submitted' as const })) })),
    ]);
    expect(latest?.assignments[0]).toMatchObject({ memo: 'メモ', status: 'submitted' });
    expect(await repository.load()).toEqual(latest);
  });
  it('保存失敗時は画面と通知を更新せず、再試行可能にする', async () => {
    const storage = { getItem: async () => JSON.stringify(state()), setItem: vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined) };
    const publish = vi.fn(); const notifications = vi.fn().mockResolvedValue(null);
    const controller = new AppController(new Repository(storage), notifications, publish, vi.fn());
    await controller.load(); publish.mockClear(); notifications.mockClear();
    await expect(controller.mutate(s => ({ ...s, assignments: [] }))).rejects.toThrow('disk full');
    expect(publish).not.toHaveBeenCalled(); expect(notifications).not.toHaveBeenCalled();
    await controller.mutate(s => ({ ...s, assignments: [] })); expect(publish).toHaveBeenCalled();
  });
  it('通知失敗時もデータは保存し、警告と再予約で回復する', async () => {
    const notifications = vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('OS')).mockResolvedValue(null);
    const warning = vi.fn(); const publish = vi.fn();
    const controller = new AppController(new Repository({ getItem: async () => JSON.stringify(state()), setItem: async () => undefined }), notifications, publish, warning);
    await controller.load(); await controller.mutate(s => ({ ...s, assignments: [] }));
    expect(publish).toHaveBeenLastCalledWith({ ...state(), assignments: [] });
    expect(warning).toHaveBeenLastCalledWith(expect.stringContaining('通知予約の更新に失敗'));
    await controller.refresh(); expect(warning).toHaveBeenLastCalledWith(null);
  });
});
