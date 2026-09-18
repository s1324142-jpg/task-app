import { AppData, assignmentSchema } from '../domain/models';
import { externalAssignmentSchema } from './AssignmentProvider';

export function mergeExternalAssignments(state: AppData, records: unknown[], uuid: () => string, now: string): { data: AppData; skipped: number } {
  const data: AppData = { ...state, assignments: [...state.assignments], courses: [...state.courses] };
  let skipped = 0;
  for (const record of records) {
    const parsed = externalAssignmentSchema.safeParse(record);
    if (!parsed.success) { skipped++; continue; }
    const row = parsed.data;
    const courseName = row.courseName?.trim();
    let sourceUrl: string | undefined;
    try {
      if (row.assignmentUrl) {
        const url = new URL(row.assignmentUrl);
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('URL');
        url.hash = ''; sourceUrl = url.toString();
      }
    } catch { skipped++; continue; }
    // 締切やタイトルを識別子に含めない。変更時に同じ課題として更新する。
    const externalId = row.externalId?.trim() || (courseName && sourceUrl ? JSON.stringify([courseName, sourceUrl]) : undefined);
    if (!courseName || !row.assignmentTitle?.trim() || !row.deadline || !externalId) { skipped++; continue; }
    const index = data.assignments.findIndex(a => a.provider === 'manaba' && a.externalId === externalId);
    const old = data.assignments[index];
    const course = data.courses.find(c => c.name === courseName) ?? { id: uuid(), name: courseName, provider: 'manaba' as const, color: '#377E70' };
    const result = assignmentSchema.safeParse({
      ...old, id: old?.id ?? uuid(), provider: 'manaba', externalId,
      courseId: course.id, courseName, title: row.assignmentTitle, assignmentType: row.assignmentType, deadline: row.deadline,
      sourceUrl: sourceUrl ?? old?.sourceUrl,
      status: row.submissionStatus === 'submitted' ? 'submitted' : row.submissionStatus === 'not_submitted' && old?.status === 'submitted' ? 'not_started' : old?.status ?? 'not_started',
      importance: old?.importance ?? 3, doToday: old?.doToday ?? false,
      createdAt: old?.createdAt ?? now, updatedAt: now,
    });
    if (!result.success) { skipped++; continue; }
    if (!data.courses.some(c => c.id === course.id)) data.courses.push(course);
    if (index < 0) data.assignments.push(result.data); else data.assignments[index] = result.data;
  }
  // 再同期で誤った授業名が訂正された場合、参照されなくなったmanaba授業を残さない。
  const usedCourseIds = new Set(data.assignments.map(assignment => assignment.courseId));
  data.courses = data.courses.filter(course => course.provider !== 'manaba' || usedCourseIds.has(course.id));
  return { data, skipped };
}
