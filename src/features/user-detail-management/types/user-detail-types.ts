import { z } from 'zod';

export const Gender = {
  NotSpecified: 0,
  Male: 1,
  Female: 2,
  Other: 3,
} as const;

export type Gender = typeof Gender[keyof typeof Gender];

export interface UserDetailDto {
  id: number;
  userId: number;
  profilePictureUrl?: string;
  height?: number;
  weight?: number;
  description?: string;
  gender?: Gender;
  linkedinUrl?: string;
  phoneNumber?: string;
  email?: string;
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

export interface CreateUserDetailDto {
  userId: number;
  profilePictureUrl?: string;
  height?: number;
  weight?: number;
  description?: string;
  gender?: Gender;
  linkedinUrl?: string;
  phoneNumber?: string;
  email?: string;
}

export interface UpdateUserDetailDto {
  profilePictureUrl?: string;
  height?: number;
  weight?: number;
  description?: string;
  gender?: Gender;
  linkedinUrl?: string;
  phoneNumber?: string;
  email?: string;
}

export interface UserDetailFormData {
  profilePictureUrl?: string;
  height?: number;
  weight?: number;
  description?: string;
  gender?: Gender;
  linkedinUrl?: string;
  phoneNumber?: string;
  email?: string;
}

export const userDetailFormSchema = z.object({
  profilePictureUrl: z
    .string()
    .max(500, 'userDetailManagement.profilePictureUrlMaxLength')
    .optional()
    .nullable(),
  height: z
    .number()
    .min(0, 'userDetailManagement.heightMin')
    .max(300, 'userDetailManagement.heightMax')
    .optional()
    .nullable(),
  weight: z
    .number()
    .min(0, 'userDetailManagement.weightMin')
    .max(500, 'userDetailManagement.weightMax')
    .optional()
    .nullable(),
  description: z
    .string()
    .max(2000, 'userDetailManagement.descriptionMaxLength')
    .optional()
    .nullable(),
  gender: z
    .nativeEnum(Gender)
    .optional()
    .nullable(),
  linkedinUrl: z
    .string()
    .url('userDetailManagement.invalidUrl')
    .optional()
    .or(z.literal(''))
    .nullable(),
  phoneNumber: z
    .string()
    .max(20, 'userDetailManagement.phoneNumberMaxLength')
    .optional()
    .nullable(),
  email: z
    .string()
    .email('userDetailManagement.invalidEmail')
    .optional()
    .or(z.literal(''))
    .nullable(),
});

export type UserDetailFormSchema = z.infer<typeof userDetailFormSchema>;

export const GENDER_OPTIONS = [
  { value: Gender.NotSpecified, label: 'NotSpecified' },
  { value: Gender.Male, label: 'Male' },
  { value: Gender.Female, label: 'Female' },
  { value: Gender.Other, label: 'Other' },
] as const;
