import { ActivityPriority, ActivityStatus, ReminderChannel, type ActivityDto, type UpdateActivityDto } from '../types/activity-types';

function toStatus(value: ActivityDto['status']): number {
  if (typeof value === 'number') return value;
  if (value === 'Completed') return ActivityStatus.Completed;
  if (value === 'Cancelled' || value === 'Canceled') return ActivityStatus.Cancelled;
  return ActivityStatus.Scheduled;
}

function toPriority(value: ActivityDto['priority']): number {
  if (typeof value === 'number') return value;
  if (value === 'Low') return ActivityPriority.Low;
  if (value === 'High') return ActivityPriority.High;
  return ActivityPriority.Medium;
}

export function toUpdateActivityDto(activity: ActivityDto, overrides?: Partial<UpdateActivityDto>): UpdateActivityDto {
  const endDateTime = activity.endDateTime ?? activity.startDateTime;

  return {
    subject: activity.subject,
    description: activity.description,
    activityTypeId: activity.activityTypeId,
    startDateTime: activity.startDateTime,
    endDateTime,
    isAllDay: activity.isAllDay,
    status: toStatus(activity.status),
    priority: toPriority(activity.priority),
    contactId: activity.contactId,
    potentialCustomerId: activity.potentialCustomerId,
    erpCustomerCode: activity.erpCustomerCode,
    assignedUserId: activity.assignedUserId,
    reminders: (activity.reminders || []).map((reminder) => ({
      offsetMinutes: reminder.offsetMinutes,
      channel: reminder.channel ?? ReminderChannel.InApp,
    })),
    ...overrides,
  };
}
