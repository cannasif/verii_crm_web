import { addDays, startOfDay } from 'date-fns';

interface ActivityCalendarRange {
  startDateTime: string;
  endDateTime?: string | null;
}

/**
 * Calendar days are half-open ranges: [dayStart, nextDayStart).
 * Zero-duration activities are treated as point events at their start time.
 */
export function occursOnCalendarDay(activity: ActivityCalendarRange, day: Date): boolean {
  const dayStart = startOfDay(day);
  const nextDay = addDays(dayStart, 1);
  const activityStart = new Date(activity.startDateTime);
  const activityEnd = new Date(activity.endDateTime || activity.startDateTime);

  if (Number.isNaN(activityStart.getTime()) || Number.isNaN(activityEnd.getTime())) {
    return false;
  }

  if (activityEnd.getTime() <= activityStart.getTime()) {
    return activityStart >= dayStart && activityStart < nextDay;
  }

  return activityStart < nextDay && activityEnd > dayStart;
}
