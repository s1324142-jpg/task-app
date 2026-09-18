import { AppData, Assignment, AssignmentInput, Course, assignmentSchema } from './models';

export function courseNameForAssignment(assignment: Pick<Assignment, 'courseId' | 'courseName'>, courses: readonly Course[]): string {
  return courses.find(course => course.id === assignment.courseId)?.name ?? assignment.courseName;
}

export function upsertAssignment(state: AppData, input: AssignmentInput, id: string, now: string, courseId: string): AppData {
  const existing = state.assignments.find(a => a.id === id);
  const name = input.courseName.trim();
  const course = state.courses.find(c => c.name === name) ?? { id: courseId, name, color: '#377E70', provider: 'manual' as const };
  const assignment = assignmentSchema.parse({ ...existing, ...input, id, courseId: course.id, courseName: name,
    provider: existing?.provider ?? 'manual', createdAt: existing?.createdAt ?? now, updatedAt: now,
  });
  return { ...state, courses: state.courses.some(c => c.id === course.id) ? state.courses : [...state.courses, course],
    assignments: existing ? state.assignments.map(a => a.id === id ? assignment : a) : [...state.assignments, assignment] };
}
