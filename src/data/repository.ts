import { AppData, emptyData, stateSchema } from '../domain/models';

export interface KeyValueStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
const KEY = 'suke:data:v1';
export class Repository {
  constructor(private storage: KeyValueStorage) {}
  async load(): Promise<AppData> {
    const value = await this.storage.getItem(KEY);
    if (value === null) return emptyData();
    // 壊れたデータを空データで上書きしない。
    return stateSchema.parse(JSON.parse(value));
  }
  async save(data: AppData): Promise<void> {
    await this.storage.setItem(KEY, JSON.stringify(stateSchema.parse(data)));
  }
}
