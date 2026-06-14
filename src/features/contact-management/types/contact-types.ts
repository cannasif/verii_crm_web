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

function normalizeEmailInput(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizePhoneInput(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  let result = '';
  const cleaned = value.replace(/[^\d+]/g, '');

  for (const char of cleaned) {
    if (char === '+') {
      if (result.length === 0) {
        result += char;
      }
      continue;
    }
    result += char;
  }

  return result;
}

export const contactFormSchema = z.object({
  salutation: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  firstName: z
    .string()
    .min(1, 'form.firstNameRequired')
    .max(100, 'form.fullNameMaxLength'),
  middleName: z
    .string()
    .max(100, 'form.middleNameMaxLength')
    .optional()
    .or(z.literal('')),
  lastName: z
    .string()
    .min(1, 'form.lastNameRequired')
    .max(100, 'form.fullNameMaxLength'),
  fullName: z
    .string()
    .max(250, 'form.fullNameMaxLength')
    .optional()
    .or(z.literal('')),
  email: z.preprocess(
    normalizeEmailInput,
    z.union([
      z.literal(''),
      z
        .string()
        .max(100, 'form.emailMaxLength')
        .superRefine((value, context) => {
          if (value.length < 3) {
            return;
          }
          const isValidEmail = z.string().email().safeParse(value).success;
          if (!isValidEmail) {
            context.addIssue({
              code: 'custom',
              message: 'form.emailInvalid',
            });
          }
        }),
    ])
  ),
  phone: z.preprocess(
    normalizePhoneInput,
    z.union([
      z.literal(''),
      z.string().max(20, 'form.phoneMaxLength'),
    ])
  ),
  mobile: z.preprocess(
    normalizePhoneInput,
    z.union([
      z.literal(''),
      z.string().max(20, 'form.mobileMaxLength'),
    ])
  ),
  notes: z
    .string()
    .max(250, 'form.notesMaxLength')
    .optional()
    .or(z.literal('')),
  customerId: z
    .number()
    .min(1, 'form.customerRequired'),
  titleId: z
    .number()
    .optional()
    .nullable(),
});

export type ContactFormSchema = z.output<typeof contactFormSchema>;
