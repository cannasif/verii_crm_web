import type { TFunction } from 'i18next';
import type { ActivityDto } from '../types/activity-types';

export interface ActivityColumnDef<T> {
  key: keyof T | string;
  label: string;
  className?: string;
}

export function getActivityColumns(t: TFunction): ActivityColumnDef<ActivityDto>[] {
  return [
    { key: 'id', label: t('activityManagement.id'), className: 'font-medium w-[48px] md:w-[60px]' },
    {
      key: 'subject',
      label: t('activityManagement.subject'),
      className: 'font-semibold text-slate-900 dark:text-white min-w-[160px] md:min-w-[200px]',
    },
    { key: 'activityType', label: t('activityManagement.activityType'), className: 'whitespace-nowrap' },
    { key: 'paymentTypeName', label: t('activityManagement.paymentType'), className: 'min-w-[120px] whitespace-nowrap' },
    { key: 'activityMeetingTypeName', label: t('activityManagement.activityMeetingType'), className: 'min-w-[120px] whitespace-nowrap' },
    { key: 'activityTopicPurposeName', label: t('activityManagement.activityTopicPurpose'), className: 'min-w-[150px] whitespace-nowrap' },
    { key: 'activityShippingName', label: t('activityManagement.activityShipping'), className: 'min-w-[120px] whitespace-nowrap' },
    { key: 'status', label: t('activityManagement.status'), className: 'whitespace-nowrap' },
    { key: 'priority', label: t('activityManagement.priority'), className: 'whitespace-nowrap' },
    {
      key: 'potentialCustomer',
      label: t('activityManagement.customer'),
      className: 'min-w-[120px] md:min-w-[150px]',
    },
    { key: 'contact', label: t('activityManagement.contact'), className: 'min-w-[120px] md:min-w-[150px]' },
    { key: 'assignedUser', label: t('activityManagement.assignedUser'), className: 'whitespace-nowrap' },
    { key: 'startDateTime', label: t('activityManagement.activityDate'), className: 'whitespace-nowrap' },
  ];
}
