import { z } from 'zod';

export interface CustomerDto {
  id: number;
  customerCode?: string | null;
  isIntegrated?: boolean;
  name: string;
  taxNumber?: string;
  taxOffice?: string;
  tcknNumber?: string;
  address?: string;
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
  salesRepCode?: string;
  groupCode?: string;
  creditLimit?: number | null;
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
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  notes?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  customerTypeId?: number;
  salesRepCode?: string;
  groupCode?: string;
  creditLimit?: number | null;
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
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  notes?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  customerTypeId?: number;
  salesRepCode?: string;
  groupCode?: string;
  creditLimit?: number | null;
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
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  notes?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  customerTypeId?: number;
  salesRepCode?: string;
  groupCode?: string;
  creditLimit?: number | null;
  defaultShippingAddressId?: number | null;
  branchCode: number;
  businessUnitCode: number;
  isCompleted?: boolean;
}

export const customerFormSchema = z.object({
  customerCode: z
    .string()
    .max(100, 'customerManagement.form.customerCodeMaxLength')
    .optional()
    .or(z.literal('')),
  name: z
    .string()
    .min(1, 'customerManagement.form.nameRequired')
    .max(250, 'customerManagement.form.nameMaxLength'),
  taxNumber: z
    .string()
    .max(15, 'customerManagement.form.taxNumberMaxLength')
    .optional()
    .or(z.literal('')),
  taxOffice: z
    .string()
    .max(100, 'customerManagement.form.taxOfficeMaxLength')
    .optional()
    .or(z.literal('')),
  tcknNumber: z
    .string()
    .max(11, 'customerManagement.form.tcknNumberMaxLength')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(500, 'customerManagement.form.addressMaxLength')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(100, 'customerManagement.form.phoneMaxLength')
    .optional()
    .or(z.literal('')),
  phone2: z
    .string()
    .max(100, 'customerManagement.form.phone2MaxLength')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('customerManagement.form.emailInvalid')
    .max(100, 'customerManagement.form.emailMaxLength')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .max(100, 'customerManagement.form.websiteMaxLength')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .max(250, 'customerManagement.form.notesMaxLength')
    .optional()
    .or(z.literal('')),
  countryId: z
    .number()
    .min(1, 'customerManagement.form.countryRequired')
    .optional(),
  cityId: z
    .number()
    .min(1, 'customerManagement.form.cityRequired')
    .optional(),
  districtId: z
    .number()
    .min(1, 'customerManagement.form.districtRequired')
    .optional(),
  customerTypeId: z
    .number()
    .min(1, 'customerManagement.form.customerTypeRequired')
    .optional(),
  salesRepCode: z
    .string()
    .max(50, 'customerManagement.form.salesRepCodeMaxLength')
    .optional()
    .or(z.literal('')),
  groupCode: z
    .string()
    .max(50, 'customerManagement.form.groupCodeMaxLength')
    .optional()
    .or(z.literal('')),
  creditLimit: z
    .number()
    .min(0, 'customerManagement.form.creditLimit.min')
    .optional()
    .nullable(),
  defaultShippingAddressId: z
    .number()
    .optional()
    .nullable(),
  branchCode: z
    .number()
    .int('customerManagement.form.branchCode.invalid')
    .min(0, 'customerManagement.form.branchCode.required'),
  businessUnitCode: z
    .number()
    .int('customerManagement.form.businessUnitCode.invalid')
    .min(0, 'customerManagement.form.businessUnitCode.required'),
  isCompleted: z.boolean().optional(),
});

export type CustomerFormSchema = z.infer<typeof customerFormSchema>;
