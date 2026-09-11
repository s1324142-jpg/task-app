import { z } from 'zod';

export const manabaSessionSchema = z.object({
  version: z.literal(1),
  baseUrl: z.string().url(),
  authenticatedOrigin: z.string().url().optional(),
  status: z.enum(['connected', 'expired']),
  authenticatedAt: z.string().datetime().optional(),
  lastCheckedAt: z.string().datetime().optional(),
  lastSyncAt: z.string().datetime().optional(),
});

export type ManabaSession = z.infer<typeof manabaSessionSchema>;
export type LoginPageObservation = { url: string; title: string; hasPasswordField: boolean };

export interface ManabaSessionStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}

export interface ManabaCookieStore {
  clearAll(): Promise<void>;
  persist(): Promise<void>;
}

export class ManabaAuthError extends Error {
  constructor(readonly code: 'invalid_url' | 'not_configured' | 'authentication_failed' | 'origin_changed' | 'session_expired' | 'storage_failed', message: string) {
    super(message);
    this.name = 'ManabaAuthError';
  }
}

export function normalizeManabaUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('unsafe URL');
    url.hash = '';
    return url.toString();
  } catch {
    throw new ManabaAuthError('invalid_url', '大学が案内しているmanabaのhttps URLを入力してください。');
  }
}

function safeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.origin : null;
  } catch { return null; }
}

export class ManabaAuthService {
  constructor(private storage: ManabaSessionStorage, private cookies: ManabaCookieStore, private now: () => Date = () => new Date()) {}

  async getSession(): Promise<ManabaSession | null> {
    try {
      const value = await this.storage.read();
      return value === null ? null : manabaSessionSchema.parse(JSON.parse(value));
    } catch (error) {
      if (error instanceof ManabaAuthError) throw error;
      throw new ManabaAuthError('storage_failed', 'manaba連携情報を安全なストレージから読み込めませんでした。');
    }
  }

  async configure(value: string): Promise<string> {
    const baseUrl = normalizeManabaUrl(value);
    const current = await this.getSession();
    if (current?.baseUrl === baseUrl) return baseUrl;
    if (current) await this.cookies.clearAll();
    await this.storage.write(JSON.stringify({ version: 1, baseUrl, status: 'expired' } satisfies ManabaSession));
    return baseUrl;
  }

  async completeLogin(observation: LoginPageObservation, allowOriginChange = false): Promise<ManabaSession> {
    const current = await this.getSession();
    if (!current) throw new ManabaAuthError('not_configured', '先にmanaba URLを設定してください。');
    const observedOrigin = safeOrigin(observation.url);
    if (!observedOrigin || observation.hasPasswordField) {
      throw new ManabaAuthError('authentication_failed', 'manabaの画面へ戻り、ログイン後のページが表示されてから完了してください。');
    }
    const expectedOrigin = current.authenticatedOrigin ?? safeOrigin(current.baseUrl);
    if (observedOrigin !== expectedOrigin && !allowOriginChange) {
      throw new ManabaAuthError('origin_changed', `入力したURLとは異なるホスト（${new URL(observedOrigin).host}）が表示されています。`);
    }
    await this.cookies.persist();
    const timestamp = this.now().toISOString();
    const session: ManabaSession = { ...current, authenticatedOrigin: observedOrigin, status: 'connected', authenticatedAt: current.authenticatedAt ?? timestamp, lastCheckedAt: timestamp };
    await this.storage.write(JSON.stringify(session));
    return session;
  }

  async hasValidSession(): Promise<boolean> {
    return (await this.getSession())?.status === 'connected';
  }

  async markExpired(): Promise<void> {
    const current = await this.getSession();
    if (!current || current.status === 'expired') return;
    await this.storage.write(JSON.stringify({ ...current, status: 'expired', lastCheckedAt: this.now().toISOString() }));
  }

  async markSynchronized(): Promise<void> {
    const current = await this.getSession();
    if (!current || current.status !== 'connected') throw new ManabaAuthError('session_expired', 'manabaのログイン期限が切れました。再ログインしてください。');
    await this.storage.write(JSON.stringify({ ...current, lastSyncAt: this.now().toISOString() }));
  }

  async logout(): Promise<void> {
    await this.cookies.clearAll();
    await this.storage.remove();
  }
}
