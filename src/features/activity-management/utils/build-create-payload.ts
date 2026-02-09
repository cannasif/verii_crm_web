import type { CreateActivityDto } from '../types/activity-types';
import { ActivityPriority, ActivityStatus, ReminderChannel, type ActivityFormSchema, type ReminderChannel as ReminderChannelType } from '../types/activity-types';

function toActivityTypeId(value: string): number | undefined {
  const num = Number(value);
  return Number.isInteger(num) && !Number.isNaN(num) ? num : undefined;
}

function toIsoDateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
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
    startDateTime: toIsoDateTime(data.startDateTime) || new Date().toISOString(),
    endDateTime: toIsoDateTime(data.endDateTime),
    isAllDay: data.isAllDay,
    status: data.status ?? ActivityStatus.Scheduled,
    priority: data.priority ?? ActivityPriority.Medium,
    potentialCustomerId: data.potentialCustomerId || undefined,
    erpCustomerCode: data.erpCustomerCode || undefined,
    contactId: data.contactId || undefined,
    assignedUserId,
    reminders: (data.reminders || []).map((reminder) => ({
      offsetMinutes: reminder.offsetMinutes,
      channel: (reminder.channel ?? ReminderChannel.InApp) as ReminderChannelType,
    })),
  };
}
