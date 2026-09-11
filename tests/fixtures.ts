import { Assignment, AppData, emptyData } from '../src/domain/models';
export const now = new Date('2026-09-11T09:00:00+09:00');
export function assignment(patch: Partial<Assignment> = {}): Assignment {
  return { id: 'a1', courseId: 'c1', courseName: 'アルゴリズム論', title: 'AL12-4',
    provider: 'manual', deadline: '2026-09-14T14:59:00.000Z', status: 'not_started', importance: 3,
    doToday: false, createdAt: now.toISOString(), updatedAt: now.toISOString(), ...patch };
}
export function state(assignments = [assignment()]): AppData {
  return { ...emptyData(), assignments, courses: [{ id: 'c1', name: 'アルゴリズム論', provider: 'manual' }] };
}
