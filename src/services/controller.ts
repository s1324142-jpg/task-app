import { AppData } from '../domain/models';
import { Repository } from '../data/repository';

export class AppController {
  private queue: Promise<unknown> = Promise.resolve();
  private data: AppData | null = null;
  constructor(private repository: Repository, private notifications: (data: AppData) => Promise<string | null>,
    private publish: (data: AppData) => void, private warn: (message: string | null) => void) {}
  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const pending = this.queue.then(job);
    this.queue = pending.catch(() => undefined);
    return pending;
  }
  private async reconcile(): Promise<void> {
    if (!this.data) return;
    try { this.warn(await this.notifications(this.data)); }
    catch { this.warn('データは保存済みですが、通知予約の更新に失敗しました。設定の「通知を再設定」で再試行してください。'); }
  }
  load(): Promise<void> {
    return this.enqueue(async () => {
      this.data = await this.repository.load();
      this.publish(this.data);
      await this.reconcile();
    });
  }
  mutate(change: (data: AppData) => AppData): Promise<void> {
    return this.enqueue(async () => {
      if (!this.data) throw new Error('データの読み込みが完了していません');
      const next = change(this.data);
      await this.repository.save(next);
      this.data = next;
      this.publish(next);
      await this.reconcile();
    });
  }
  refresh(): Promise<void> { return this.enqueue(() => this.reconcile()); }
}
