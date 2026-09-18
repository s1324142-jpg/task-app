import { z } from 'zod';

export const statuses = ['not_started', 'in_progress', 'completed', 'submitted'] as const;
export const statusLabels: Record<Status, string> = {
  not_started: '未着手', in_progress: '作業中', completed: '完了・未提出', submitted: '提出済み',
};
export type Status = typeof statuses[number];
export const assignmentTypes = ['query', 'survey', 'report', 'project'] as const;
export const assignmentTypeSchema = z.enum(assignmentTypes);
export type AssignmentType = z.infer<typeof assignmentTypeSchema>;
export const assignmentTypeLabels: Record<AssignmentType, string> = {
  query: '小テスト', survey: 'アンケート', report: 'レポート', project: 'プロジェクト',
};
export const courseSchema = z.object({
  id: z.string().min(1), name: z.string().trim().min(1).max(120),
  color: z.string().optional(), provider: z.enum(['manual', 'manaba']).default('manual'),
  externalId: z.string().optional(),
});
export const assignmentSchema = z.object({
  id: z.string().min(1), provider: z.enum(['manual', 'manaba']), externalId: z.string().optional(),
  courseId: z.string().min(1), courseName: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200), description: z.string().max(10000).optional(),
  assignmentType: assignmentTypeSchema.optional(),
  deadline: z.string().datetime({ offset: true }), status: z.enum(statuses),
  estimatedMinutes: z.number().int().min(1).max(100000).optional(),
  importance: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  doToday: z.boolean(), sourceUrl: z.string().refine(value => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
  }, 'http/httpsのURLを入力してください').optional(),
  memo: z.string().max(10000).optional(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
export const reminderKeys = ['sevenDays', 'threeDays', 'oneDay', 'sameDay', 'threeHours'] as const;
export type ReminderKey = typeof reminderKeys[number];
export const reminderLabels: Record<ReminderKey, string> = {
  sevenDays: '7日前', threeDays: '3日前', oneDay: '前日', sameDay: '当日', threeHours: '締切3時間前',
};
export const settingsSchema = z.object({
  sevenDays: z.boolean(), threeDays: z.boolean(), oneDay: z.boolean(),
  sameDay: z.boolean(), threeHours: z.boolean(), dailyHour: z.number().int().min(0).max(23),
});
export const stateSchema = z.object({
  version: z.literal(1), assignments: z.array(assignmentSchema), courses: z.array(courseSchema), settings: settingsSchema,
}).superRefine((state, ctx) => {
  const ids = new Set(state.courses.map(course => course.id));
  if (ids.size !== state.courses.length || new Set(state.assignments.map(a => a.id)).size !== state.assignments.length || state.assignments.some(a => !ids.has(a.courseId))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'データの関連付けが不正です' });
  }
});
export type Assignment = z.infer<typeof assignmentSchema>;
export type Course = z.infer<typeof courseSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type AppData = z.infer<typeof stateSchema>;
export const emptyData = (): AppData => ({
  version: 1, assignments: [], courses: [],
  settings: { sevenDays: true, threeDays: true, oneDay: true, sameDay: true, threeHours: true, dailyHour: 9 },
});
export type AssignmentInput = Pick<Assignment, 'title' | 'courseName' | 'assignmentType' | 'deadline' | 'status' | 'estimatedMinutes' | 'importance' | 'doToday' | 'sourceUrl' | 'description' | 'memo'>;
