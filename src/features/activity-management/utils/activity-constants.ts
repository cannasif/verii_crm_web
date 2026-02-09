import { ActivityPriority, ActivityStatus } from '../types/activity-types';

export const ACTIVITY_STATUSES = [
  { value: ActivityStatus.Scheduled, label: 'Scheduled', labelKey: 'activityManagement.statusScheduled' },
  { value: ActivityStatus.Completed, label: 'Completed', labelKey: 'activityManagement.statusCompleted' },
  { value: ActivityStatus.Cancelled, label: 'Cancelled', labelKey: 'activityManagement.statusCanceled' },
] as const;

export const ACTIVITY_PRIORITIES = [
  { value: ActivityPriority.Low, label: 'Low', labelKey: 'activityManagement.priorityLow' },
  { value: ActivityPriority.Medium, label: 'Medium', labelKey: 'activityManagement.priorityMedium' },
  { value: ActivityPriority.High, label: 'High', labelKey: 'activityManagement.priorityHigh' },
] as const;

export const REMINDER_MINUTE_PRESETS = [
  15,
  30,
  60,
  1440,
] as const;
