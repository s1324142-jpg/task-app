import { z } from 'zod';

export const externalAssignmentSchema = z.object({
  externalId: z.string().optional(),
  courseName: z.string().optional(),
  assignmentTitle: z.string().optional(),
  deadline: z.string().optional(),
  assignmentUrl: z.string().optional(),
  assignmentType: z.string().optional(),
  submissionStatus: z.enum(['submitted', 'not_submitted']).optional(),
});
export type ExternalAssignment = z.infer<typeof externalAssignmentSchema>;
export interface AssignmentProvider {
  readonly provider: 'manaba';
  syncAssignments(): Promise<ExternalAssignment[]>;
}
// 認証済みページの実データ取得アダプターは、大学ごとの調査後に注入する。
// API・HTMLセレクター・認証情報はここでは仮定しない。
export class ManabaProvider implements AssignmentProvider {
  readonly provider = 'manaba' as const;
  constructor(private fetchAuthorizedAssignments?: () => Promise<ExternalAssignment[]>) {}
  async syncAssignments(): Promise<ExternalAssignment[]> {
    if (!this.fetchAuthorizedAssignments) throw new Error('この大学のmanaba取得方法は未設定です。手動登録をご利用ください。');
    return this.fetchAuthorizedAssignments();
  }
}
