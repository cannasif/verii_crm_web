import type { CreateActivityDto } from '../types/activity-types';
import { ActivityPriority, ActivityStatus, ReminderChannel, type ActivityFormSchema } from '../types/activity-types';

function toActivityTypeId(value: string): number | undefined {
  const num = Number(value);
  return Number.isInteger(num) && !Number.isNaN(num) ? num : undefined;
}

export function buildCreateActivityPayload(
  data: ActivityFormSchema,
  options: { assignedUserIdFallback?: number } = {}
): CreateActivityDto {
  const activityTypeId = toActivityTypeId(data.activityType);
  if (activityTypeId === undefined) {
    throw new Error('Aktivite tipi seçilmelidir.');
  }

  const assignedUserId = data.assignedUserId ?? options.assignedUserIdFallback;
  if (assignedUserId === undefined) {
    throw new Error('Atanan kullanıcı zorunludur.');
  }

  return {
    subject: data.subject,
    description: data.description,
    activityTypeId,
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime || undefined,
    isAllDay: data.isAllDay,
    status: data.status ?? ActivityStatus.Scheduled,
    priority: data.priority ?? ActivityPriority.Medium,
    potentialCustomerId: data.potentialCustomerId || undefined,
    erpCustomerCode: data.erpCustomerCode || undefined,
    contactId: data.contactId || undefined,
    assignedUserId,
    reminders: (data.reminders || []).map((offsetMinutes) => ({
      offsetMinutes,
      channel: ReminderChannel.InApp,
    })),
  };
}
