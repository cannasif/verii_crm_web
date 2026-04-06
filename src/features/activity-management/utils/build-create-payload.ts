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
  const localDateTimeMatch = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/);
  if (localDateTimeMatch) {
    return `${localDateTimeMatch[1]}T${localDateTimeMatch[2]}:${localDateTimeMatch[3] ?? '00'}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function toCurrentLocalDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
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
    startDateTime: toIsoDateTime(data.startDateTime) || toCurrentLocalDateTime(),
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
