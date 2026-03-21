export type Window = '7d' | '30d' | '90d';

export function classInsightsKey(classId: string, window: Window) {
  return `insights:class:${classId}:${window}`;
}

export function studentInsightsKey(classId: string, studentId: string, window: Window) {
  return `insights:student:${classId}:${studentId}:${window}`;
}

export const WINDOWS: Window[] = ['7d', '30d', '90d'];
