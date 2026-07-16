import { z } from 'zod';

export type ErpCariType = 'A' | 'S';

function normalizeOptionalEntityIdInput(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }

  return numeric;
}

function normalizeEmailInput(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizeDigitsInput(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\D/g, '');
}

function normalizeDefaultShippingAddressIdInput(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || value === 0) {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

const optionalEntityIdSchema = (messageKey: string) =>
  z.preprocess(
    normalizeOptionalEntityIdInput,
    z.number().min(1, messageKey).optional()
  );

export interface CustomerDto {
  id: number;
  customerCode?: string | null;
  isIntegrated?: boolean;
  isERPIntegrated?: boolean;
  erpIntegrationNumber?: string | null;
  name: string;
  taxNumber?: string;
  taxOffice?: string;
  tcknNumber?: string;
  address?: string;
  postalCode?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  notes?: string;
  countryId?: number;
  countryName?: string;
  cityId?: number;
  cityName?: string;
  districtId?: number;
  districtName?: string;
  customerTypeId?: number;
  customerTypeName?: string;
  erpCariType?: ErpCariType;
  salesRepCode?: string;
  groupCode?: string;
  accountingCode?: string;
  creditLimit?: number | null;
  erpCurrencyType?: number | null;
  paymentTermDays?: number | null;
  defaultShippingAddressId?: number | null;
  branchCode: number;
  businessUnitCode: number;
  createdDate: string;
  updatedDate?: string;
  isDeleted: boolean;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  deletedByFullUser?: string;
}

export interface CreateCustomerDto {
  customerCode?: string;
  name: string;
  taxNumber?: string;
  taxOffice?: string;
  tcknNumber?: string;
  address?: string;
  postalCode?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  notes?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  customerTypeId?: number;
  erpCariType: ErpCariType;
  salesRepCode?: string;
  groupCode?: string;
  accountingCode?: string;
  creditLimit?: number | null;
  erpCurrencyType?: number | null;
  paymentTermDays?: number | null;
  defaultShippingAddressId?: number | null;
  branchCode: number;
  businessUnitCode: number;
  isCompleted?: boolean;
}

export interface UpdateCustomerDto {
  customerCode?: string;
  name: string;
  taxNumber?: string;
  taxOffice?: string;
  tcknNumber?: string;
  address?: string;
  postalCode?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  notes?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  customerTypeId?: number;
  erpCariType: ErpCariType;
  salesRepCode?: string;
  groupCode?: string;
  accountingCode?: string;
  creditLimit?: number | null;
  erpCurrencyType?: number | null;
  paymentTermDays?: number | null;
  defaultShippingAddressId?: number | null;
  branchCode: number;
  businessUnitCode: number;
  completedDate?: string;
  isCompleted?: boolean;
}

export interface CustomerListFilters {
  name?: string;
  customerCode?: string;
  taxNumber?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  customerTypeId?: number;
}

export interface CustomerFormData {
  customerCode?: string;
  name: string;
  taxNumber?: string;
  taxOffice?: string;
  tcknNumber?: string;
  address?: string;
  postalCode?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  notes?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  customerTypeId?: number;
  erpCariType: ErpCariType;
  salesRepCode?: string;
  groupCode?: string;
  accountingCode?: string;
  creditLimit?: number | null;
  erpCurrencyType?: number | null;
  paymentTermDays?: number | null;
  defaultShippingAddressId?: number | null;
  branchCode: number;
  businessUnitCode: number;
  isCompleted?: boolean;
}

export const customerFormSchema = z.object({
  customerCode: z
    .string()
    .max(100, 'form.customerCodeMaxLength')
    .optional()
    .or(z.literal('')),
  name: z
    .string()
    .min(1, 'form.nameRequired')
    .max(250, 'form.nameMaxLength'),
  taxNumber: z.preprocess(
    normalizeDigitsInput,
    z.union([
      z.literal(''),
      z.string().length(10, 'form.taxNumberExactLength'),
    ])
  ),
  taxOffice: z
    .string()
    .max(100, 'form.taxOfficeMaxLength')
    .optional()
    .or(z.literal('')),
  tcknNumber: z.preprocess(
    normalizeDigitsInput,
    z.union([
      z.literal(''),
      z.string().length(11, 'form.tcknNumberExactLength'),
    ])
  ),
  address: z
    .string()
    .max(500, 'form.addressMaxLength')
    .optional()
    .or(z.literal('')),
  postalCode: z
    .string()
    .max(20, 'form.postalCodeMaxLength')
    .optional()
    .or(z.literal('')),
  phone: z.preprocess(
    normalizeDigitsInput,
    z.union([
      z.literal(''),
      z.string().max(20, 'form.phoneMaxLength'),
    ])
  ),
  phone2: z.preprocess(
    normalizeDigitsInput,
    z.union([
      z.literal(''),
      z.string().max(20, 'form.phone2MaxLength'),
    ])
  ),
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
  website: z
    .string()
    .max(100, 'form.websiteMaxLength')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .max(250, 'form.notesMaxLength')
    .optional()
    .or(z.literal('')),
  countryId: optionalEntityIdSchema('form.countryRequired'),
  cityId: optionalEntityIdSchema('form.cityRequired'),
  districtId: optionalEntityIdSchema('form.districtRequired'),
  customerTypeId: optionalEntityIdSchema('form.customerTypeRequired'),
  erpCariType: z.enum(['A', 'S']),
  salesRepCode: z
    .string()
    .max(50, 'form.salesRepCodeMaxLength')
    .optional()
    .or(z.literal('')),
  groupCode: z
    .string()
    .max(50, 'form.groupCodeMaxLength')
    .optional()
    .or(z.literal('')),
  accountingCode: z
    .string()
    .max(50, 'form.accountingCodeMaxLength')
    .optional()
    .or(z.literal('')),
  creditLimit: z
    .number()
    .min(0, 'form.creditLimit.min')
    .optional()
    .nullable(),
  erpCurrencyType: z.number().int().min(0).max(255).optional().nullable(),
  paymentTermDays: z
    .number()
    .int('form.paymentTermDaysInteger')
    .min(0, 'form.paymentTermDaysMin')
    .max(3650, 'form.paymentTermDaysMax')
    .optional()
    .nullable(),
  defaultShippingAddressId: z.preprocess(
    normalizeDefaultShippingAddressIdInput,
    z.number().optional().nullable()
  ),
  branchCode: z
    .number()
    .int('form.branchCode.invalid')
    .min(0, 'form.branchCode.required'),
  businessUnitCode: z
    .number()
    .int('form.businessUnitCode.invalid')
    .min(0, 'form.businessUnitCode.required'),
  isCompleted: z.boolean().optional(),
});

export type CustomerFormSchema = z.infer<typeof customerFormSchema>;
