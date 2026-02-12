import { z } from 'zod';

export interface ShippingAddressDto {
  id: number;
  name?: string;
  address: string;
  postalCode?: string;
  contactPerson?: string;
  phone?: string;
  notes?: string;
  customerId: number;
  customerName?: string;
  countryId?: number;
  countryName?: string;
  cityId?: number;
  cityName?: string;
  districtId?: number;
  districtName?: string;
  isDefault: boolean;
  isActive: boolean;
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

export interface CreateShippingAddressDto {
  name?: string;
  address: string;
  postalCode?: string;
  contactPerson?: string;
  phone?: string;
  notes?: string;
  customerId: number;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  isDefault?: boolean;
}

export interface UpdateShippingAddressDto {
  name?: string;
  address: string;
  postalCode?: string;
  contactPerson?: string;
  phone?: string;
  notes?: string;
  customerId: number;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  isDefault?: boolean;
}

export interface ShippingAddressListFilters {
  customerId?: number;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  isActive?: boolean;
}

export interface ShippingAddressFormData {
  name?: string;
  address: string;
  postalCode?: string;
  contactPerson?: string;
  phone?: string;
  notes?: string;
  customerId: number;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  isDefault: boolean;
}

export const shippingAddressFormSchema = z.object({
  name: z
    .string()
    .max(150, 'shippingAddressManagement.nameMaxLength')
    .optional()
    .nullable(),
  address: z
    .string()
    .min(1, 'shippingAddressManagement.addressRequired')
    .max(150, 'shippingAddressManagement.addressMaxLength'),
  postalCode: z
    .string()
    .max(20, 'shippingAddressManagement.postalCodeMaxLength')
    .optional()
    .nullable(),
  contactPerson: z
    .string()
    .max(100, 'shippingAddressManagement.contactPersonMaxLength')
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(20, 'shippingAddressManagement.phoneMaxLength')
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(100, 'shippingAddressManagement.notesMaxLength')
    .optional()
    .nullable(),
  customerId: z
    .number()
    .min(1, 'shippingAddressManagement.customerIdRequired'),
  countryId: z
    .number()
    .optional()
    .nullable(),
  cityId: z
    .number()
    .optional()
    .nullable(),
  districtId: z
    .number()
    .optional()
    .nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export type ShippingAddressFormSchema = z.infer<typeof shippingAddressFormSchema>;
