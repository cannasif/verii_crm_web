import { z } from 'zod';

export interface ActivityTypeRef {
  id: number;
  name: string;
  description?: string;
  createdDate?: string;
  updatedDate?: string;
  deletedDate?: string;
  isDeleted?: boolean;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  deletedByFullUser?: string;
}

export const ActivityStatus = {
  Scheduled: 0,
  Completed: 1,
  Cancelled: 2,
} as const;

export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus];

export const ActivityPriority = {
  Low: 0,
  Medium: 1,
  High: 2,
} as const;

export type ActivityPriority = (typeof ActivityPriority)[keyof typeof ActivityPriority];

export const ReminderChannel = {
  InApp: 0,
  Email: 1,
  Sms: 2,
  Push: 3,
} as const;

export type ReminderChannel = (typeof ReminderChannel)[keyof typeof ReminderChannel];

export const ReminderStatus = {
  Pending: 0,
  Sent: 1,
  Failed: 2,
  Cancelled: 3,
} as const;

export type ReminderStatus = (typeof ReminderStatus)[keyof typeof ReminderStatus];

export interface ActivityReminderDto {
  id: number;
  activityId: number;
  offsetMinutes: number;
  channel: ReminderChannel;
  sentAt?: string;
  status: ReminderStatus;
  createdDate: string;
  updatedDate?: string;
  deletedDate?: string;
  isDeleted: boolean;
}

export interface CreateActivityReminderDto {
  offsetMinutes: number;
  channel: ReminderChannel;
}

export interface ActivityDto {
  id: number;
  subject: string;
  description?: string;
  activityTypeId: number;
  activityType: ActivityTypeRef;
  startDateTime: string;
  endDateTime?: string;
  isAllDay: boolean;
  status: ActivityStatus | number | string;
  priority: ActivityPriority | number | string;
  assignedUserId: number;
  assignedUser?: {
    id: number;
    fullName?: string;
    userName?: string;
  };
  contactId?: number;
  contact?: {
    id: number;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };
  potentialCustomerId?: number;
  potentialCustomer?: {
    id: number;
    name: string;
    customerCode?: string;
  };
  erpCustomerCode?: string;
  reminders: ActivityReminderDto[];
  activityDate?: string;
  isCompleted?: boolean;
  productCode?: string;
  productName?: string;
  createdDate: string;
  updatedDate?: string;
  deletedDate?: string;
  isDeleted: boolean;
  createdBy?: number;
  updatedBy?: number;
  deletedBy?: number;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  deletedByFullUser?: string;
}

export interface CreateActivityDto {
  subject: string;
  description?: string;
  activityTypeId: number;
  startDateTime: string;
  endDateTime?: string;
  isAllDay: boolean;
  status: ActivityStatus | number;
  priority: ActivityPriority | number;
  assignedUserId: number;
  contactId?: number;
  potentialCustomerId?: number;
  erpCustomerCode?: string;
  reminders: CreateActivityReminderDto[];
}

export interface UpdateActivityDto {
  subject: string;
  description?: string;
  activityTypeId: number;
  startDateTime: string;
  endDateTime?: string;
  isAllDay: boolean;
  status: ActivityStatus | number;
  priority: ActivityPriority | number;
  assignedUserId: number;
  contactId?: number;
  potentialCustomerId?: number;
  erpCustomerCode?: string;
  reminders: CreateActivityReminderDto[];
}

export interface ActivityListFilters {
  activityTypeId?: number;
  status?: ActivityStatus | number;
  priority?: ActivityPriority | number;
  potentialCustomerId?: number;
  contactId?: number;
  assignedUserId?: number;
  startDateTimeFrom?: string;
  startDateTimeTo?: string;
}

export interface ActivityFormData {
  subject: string;
  description?: string;
  activityType: string;
  potentialCustomerId?: number;
  erpCustomerCode?: string;
  status: number;
  priority?: number;
  contactId?: number;
  assignedUserId?: number;
  startDateTime: string;
  endDateTime?: string;
  isAllDay: boolean;
  reminders: CreateActivityReminderDto[];
}

export const activityFormSchema = z.object({
  subject: z
    .string()
    .min(1, 'activityManagement.subjectRequired')
    .max(100, 'activityManagement.subjectMaxLength'),
  description: z
    .string()
    .max(500, 'activityManagement.descriptionMaxLength')
    .optional(),
  activityType: z
    .string()
    .min(1, 'activityManagement.activityTypeRequired'),
  potentialCustomerId: z
    .number()
    .optional()
    .nullable(),
  erpCustomerCode: z
    .string()
    .optional()
    .nullable(),
  status: z.number(),
  priority: z.number().optional().nullable(),
  contactId: z
    .number()
    .optional()
    .nullable(),
  assignedUserId: z
    .number()
    .optional()
    .nullable(),
  startDateTime: z
    .string()
    .min(1, 'activityManagement.activityDateRequired'),
  endDateTime: z
    .string()
    .optional()
    .nullable(),
  isAllDay: z.boolean(),
  reminders: z.array(
    z.object({
      offsetMinutes: z.number().min(0).max(525600),
      channel: z.number(),
    })
  ),
});

export type ActivityFormSchema = z.infer<typeof activityFormSchema>;
