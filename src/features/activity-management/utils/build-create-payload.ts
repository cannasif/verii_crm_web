import type { CreateActivityDto } from '../types/activity-types';
import i18n from '@/lib/i18n';
import { ActivityPriority, ActivityStatus, ReminderChannel, type ActivityFormSchema, type ReminderChannel as ReminderChannelType } from '../types/activity-types';

const AM_NS = 'activity-management' as const;

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
  const activityTypeId =
    (typeof data.activityTypeId === 'number' && data.activityTypeId > 0 ? data.activityTypeId : undefined) ??
    toActivityTypeId(data.activityType);
  if (activityTypeId === undefined) {
    throw new Error(i18n.t('activityTypeRequired', { ns: AM_NS }));
  }

  const assignedUserId = data.assignedUserId ?? options.assignedUserIdFallback;
  if (!assignedUserId || assignedUserId <= 0) {
    throw new Error(i18n.t('assignedUserRequired', { ns: AM_NS }));
  }

  const endDateTime = toIsoDateTime(data.endDateTime);
  if (!endDateTime) {
    throw new Error(i18n.t('endDateRequired', { ns: AM_NS }));
  }

  return {
    subject: data.subject,
    description: data.description,
    activityTypeId,
    paymentTypeId: data.paymentTypeId ?? undefined,
    activityMeetingTypeId: data.activityMeetingTypeId ?? undefined,
    activityTopicPurposeId: data.activityTopicPurposeId ?? undefined,
    activityShippingId: data.activityShippingId ?? undefined,
    startDateTime: toIsoDateTime(data.startDateTime) || new Date().toISOString(),
    endDateTime,
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
