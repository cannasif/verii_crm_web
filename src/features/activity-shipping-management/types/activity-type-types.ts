import { z } from 'zod';

export interface ActivityTypeDto {
  id: number;
  name: string;
  description?: string;
  createdDate: string;
  updatedDate?: string;
  createdBy?: string;
  createdByFullName?: string;
  createdByFullUser?: string;
}

export interface CreateActivityTypeDto {
  name: string;
  description?: string;
}

export interface UpdateActivityTypeDto {
  name: string;
  description?: string;
}

export interface ActivityTypeListFilters {
  name?: string;
  description?: string;
}

export interface ActivityTypeFormData {
  name: string;
  description?: string;
}

export const activityTypeFormSchema = z.object({
  name: z
    .string()
    .min(1, 'activityType.form.name.required')
    .max(100, 'activityType.form.name.maxLength'),
  description: z
    .string()
    .max(500, 'activityType.form.description.maxLength')
    .optional()
    .nullable(),
});

export type ActivityTypeFormSchema = z.infer<typeof activityTypeFormSchema>;
