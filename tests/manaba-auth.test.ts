import { describe, expect, it, vi } from 'vitest';
import { ManabaAuthError, ManabaAuthService, normalizeManabaUrl } from '../src/manaba/ManabaAuthService';

function fixture() {
  let value: string | null = null;
  const storage = {
    read: vi.fn(async () => value),
    write: vi.fn(async (next: string) => { value = next; }),
    remove: vi.fn(async () => { value = null; }),
  };
  const cookies = { clearAll: vi.fn(async () => undefined), persist: vi.fn(async () => undefined) };
  const service = new ManabaAuthService(storage, cookies, () => new Date('2026-09-11T00:00:00.000Z'));
  return { service, storage, cookies };
}

describe('manaba認証セッション', () => {
  it('https URLだけを受け付け、認証情報を含むURLを拒否する', () => {
    expect(normalizeManabaUrl('https://manaba.example.ac.jp/')).toBe('https://manaba.example.ac.jp/');
    expect(() => normalizeManabaUrl('http://manaba.example.ac.jp')).toThrow(ManabaAuthError);
    expect(() => normalizeManabaUrl('https://id:password@manaba.example.ac.jp')).toThrow(ManabaAuthError);
  });

  it('同一オリジンのログイン後画面だけを連携済みにする', async () => {
    const { service, cookies } = fixture();
    await service.configure('https://manaba.example.ac.jp/');
    await expect(service.completeLogin({ url: 'https://login.microsoftonline.com/', title: 'Sign in', hasPasswordField: false })).rejects.toMatchObject({ code: 'origin_changed' });
    await expect(service.completeLogin({ url: 'https://manaba.example.ac.jp/', title: 'Login', hasPasswordField: true })).rejects.toMatchObject({ code: 'authentication_failed' });
    await service.completeLogin({ url: 'https://manaba.example.ac.jp/home', title: 'manaba', hasPasswordField: false });
    expect(await service.hasValidSession()).toBe(true);
    expect(cookies.persist).toHaveBeenCalledOnce();
  });

  it('リダイレクト先が別ホストなら明示確認後にそのoriginを記録する', async () => {
    const { service } = fixture();
    await service.configure('https://portal.example.ac.jp/manaba');
    const page = { url: 'https://lms.example.net/home?temporary=value', title: 'manaba', hasPasswordField: false };
    await expect(service.completeLogin(page)).rejects.toMatchObject({ code: 'origin_changed' });
    const session = await service.completeLogin(page, true);
    expect(session.authenticatedOrigin).toBe('https://lms.example.net');
    expect(JSON.stringify(session)).not.toContain('temporary=value');
  });

  it('期限切れを記録し、無限に再認証しない', async () => {
    const { service } = fixture();
    await service.configure('https://manaba.example.ac.jp/');
    await service.completeLogin({ url: 'https://manaba.example.ac.jp/home', title: 'manaba', hasPasswordField: false });
    await service.markExpired(); await service.markExpired();
    expect(await service.hasValidSession()).toBe(false);
  });

  it('セッション切れでも前回の最終同期日時を保持する', async () => {
    const { service } = fixture();
    await service.configure('https://manaba.example.ac.jp/');
    await service.completeLogin({ url: 'https://manaba.example.ac.jp/home', title: 'manaba', hasPasswordField: false });
    await service.markSynchronized();
    await service.markExpired();
    expect(await service.getSession()).toMatchObject({ status: 'expired', lastSyncAt: '2026-09-11T00:00:00.000Z' });
  });

  it('連携解除はCookie削除後にSecureStore上の情報を削除する', async () => {
    const { service, storage, cookies } = fixture();
    await service.configure('https://manaba.example.ac.jp/');
    await service.logout();
    expect(cookies.clearAll).toHaveBeenCalledOnce();
    expect(storage.remove).toHaveBeenCalledOnce();
    expect(cookies.clearAll.mock.invocationCallOrder[0]).toBeLessThan(storage.remove.mock.invocationCallOrder[0]!);
  });
});
