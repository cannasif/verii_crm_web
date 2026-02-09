import { z } from 'zod';

export const SALUTATION_TYPE = {
  None: 0,
  Mr: 1,
  Ms: 2,
  Mrs: 3,
  Dr: 4,
} as const;

export type SalutationType = (typeof SALUTATION_TYPE)[keyof typeof SALUTATION_TYPE];

export interface ContactDto {
  id: number;
  salutation: SalutationType;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  status?: string;
  notes?: string;
  customerId: number;
  customerName?: string;
  titleId?: number | null;
  titleName?: string;
  createdDate: string;
  updatedDate?: string;
  isDeleted: boolean;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  deletedByFullUser?: string;
}

export interface CreateContactDto {
  salutation: SalutationType;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  notes?: string;
  customerId: number;
  titleId?: number | null;
}

export interface UpdateContactDto {
  salutation: SalutationType;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  notes?: string;
  customerId: number;
  titleId?: number | null;
}

export interface ContactListFilters {
  fullName?: string;
  email?: string;
  phone?: string;
  customerId?: number;
  titleId?: number;
}

export interface ContactFormData {
  salutation: SalutationType;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  notes?: string;
  customerId: number;
  titleId?: number | null;
}

export const contactFormSchema = z.object({
  salutation: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  firstName: z
    .string()
    .min(1, 'contactManagement.form.firstNameRequired')
    .max(100, 'contactManagement.form.fullName.maxLength'),
  middleName: z
    .string()
    .max(100, 'contactManagement.form.middleNameMaxLength')
    .optional()
    .or(z.literal('')),
  lastName: z
    .string()
    .min(1, 'contactManagement.form.lastNameRequired')
    .max(100, 'contactManagement.form.fullName.maxLength'),
  fullName: z
    .string()
    .max(250, 'contactManagement.form.fullName.maxLength')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('contactManagement.form.email.invalid')
    .max(100, 'contactManagement.form.email.maxLength')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, 'contactManagement.form.phone.maxLength')
    .optional()
    .or(z.literal('')),
  mobile: z
    .string()
    .max(20, 'contactManagement.form.mobile.maxLength')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .max(250, 'contactManagement.form.notes.maxLength')
    .optional()
    .or(z.literal('')),
  customerId: z
    .number()
    .min(1, 'contactManagement.form.customerRequired'),
  titleId: z
    .number()
    .optional()
    .nullable(),
});

export type ContactFormSchema = z.infer<typeof contactFormSchema>;
