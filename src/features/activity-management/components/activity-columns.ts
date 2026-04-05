import type { TFunction } from 'i18next';
import type { ActivityDto } from '../types/activity-types';

const AM_NS = 'activity-management' as const;

/** activity-management.json kök anahtarları; ns açık verilmeli (i18n defaultNS = common). */
function ta(t: TFunction, key: string): string {
  return t(key, { ns: AM_NS });
}

export interface ActivityColumnDef<T> {
  key: keyof T | string;
  label: string;
  className?: string;
}

export function getActivityColumns(t: TFunction): ActivityColumnDef<ActivityDto>[] {
  return [
    { key: 'id', label: ta(t, 'id'), className: 'font-medium w-[48px] md:w-[60px]' },
    {
      key: 'subject',
      label: ta(t, 'subject'),
      className: 'font-semibold text-slate-900 dark:text-white min-w-[160px] md:min-w-[200px]',
    },
    { key: 'activityType', label: ta(t, 'activityType'), className: 'whitespace-nowrap' },
    { key: 'paymentTypeName', label: ta(t, 'paymentType'), className: 'min-w-[120px] whitespace-nowrap' },
    { key: 'activityMeetingTypeName', label: ta(t, 'activityMeetingType'), className: 'min-w-[120px] whitespace-nowrap' },
    { key: 'activityTopicPurposeName', label: ta(t, 'activityTopicPurpose'), className: 'min-w-[150px] whitespace-nowrap' },
    { key: 'activityShippingName', label: ta(t, 'activityShipping'), className: 'min-w-[120px] whitespace-nowrap' },
    { key: 'status', label: ta(t, 'status'), className: 'whitespace-nowrap' },
    { key: 'priority', label: ta(t, 'priority'), className: 'whitespace-nowrap' },
    {
      key: 'potentialCustomer',
      label: ta(t, 'customer'),
      className: 'min-w-[120px] md:min-w-[150px]',
    },
    { key: 'contact', label: ta(t, 'contact'), className: 'min-w-[120px] md:min-w-[150px]' },
    { key: 'assignedUser', label: ta(t, 'assignedUser'), className: 'whitespace-nowrap' },
    { key: 'startDateTime', label: ta(t, 'activityDate'), className: 'whitespace-nowrap' },
  ];
}
