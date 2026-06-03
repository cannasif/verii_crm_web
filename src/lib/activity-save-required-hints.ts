import type { ActivityFormSchema } from '@/features/activity-management/types/activity-types';

export function buildActivitySaveRequiredHintLines(
  values: Pick<
    ActivityFormSchema,
    'subject' | 'activityType' | 'assignedUserId' | 'startDateTime' | 'endDateTime'
  >,
  t: (key: string) => string,
): string[] {
  const lines: string[] = [];

  if (!values.subject?.trim()) {
    lines.push(t('subject'));
  }
  if (!values.activityType?.trim()) {
    lines.push(t('activityType'));
  }
  if (values.assignedUserId == null || values.assignedUserId < 1) {
    lines.push(t('assignedUser'));
  }
  if (!values.startDateTime?.trim()) {
    lines.push(t('activityDate'));
  }
  if (!values.endDateTime?.trim()) {
    lines.push(t('endDate'));
  }

  return lines;
}
