import type { ActivityDto } from '@/features/activity-management/types/activity-types';

export function resolveActivityCustomerDisplayName(activity?: ActivityDto | null): string | null {
  if (!activity) return null;

  const fromNav = activity.potentialCustomer?.name?.trim();
  if (fromNav) return fromNav;

  const fromFlat = activity.potentialCustomerName?.trim();
  if (fromFlat) return fromFlat;

  return null;
}
