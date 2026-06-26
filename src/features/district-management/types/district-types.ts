import { z } from 'zod';

export interface DistrictDto {
  id: number;
  name: string;
  erpCode?: string;
  postalCode?: string;
  cityId: number;
  cityName?: string;
  createdDate: string;
  updatedDate?: string;
  isDeleted: boolean;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  deletedByFullUser?: string;
}

export interface CreateDistrictDto {
  name: string;
  erpCode?: string;
  postalCode?: string;
  cityId: number;
}

export interface UpdateDistrictDto {
  name: string;
  erpCode?: string;
  postalCode?: string;
  cityId: number;
}

export interface DistrictListFilters {
  name?: string;
  erpCode?: string;
  postalCode?: string;
  cityId?: number;
}

export interface DistrictFormData {
  name: string;
  erpCode?: string;
  postalCode?: string;
  cityId: number;
}

export const districtFormSchema = z.object({
  name: z
    .string()
    .min(1, 'districtManagement.form.nameRequired')
    .max(100, 'districtManagement.form.nameMaxLength'),
  erpCode: z
    .string()
    .max(10, 'districtManagement.form.erpCodeMaxLength')
    .optional()
    .or(z.literal('')),
  postalCode: z
    .string()
    .max(20, 'districtManagement.form.postalCodeMaxLength')
    .optional()
    .or(z.literal('')),
  cityId: z
    .number()
    .min(1, 'districtManagement.form.cityRequired'),
});

export type DistrictFormSchema = z.infer<typeof districtFormSchema>;
