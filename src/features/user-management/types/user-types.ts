import { z } from 'zod';

export interface UserDto {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: string;
  roleId?: number;
  managerUserId?: number | null;
  managerFullName?: string | null;
  isEmailConfirmed: boolean;
  isActive: boolean;
  lastLoginDate: string | null;
  fullName: string;
  creationTime: string | null;
  lastModificationTime: string | null;
  createdDate?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roleId: number;
  managerUserId?: number | null;
  isActive?: boolean;
  permissionGroupIds?: number[];
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roleId?: number;
  managerUserId?: number | null;
  isActive?: boolean;
  permissionGroupIds?: number[];
}

export interface UserListFilters {
  username?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserFormData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roleId: number;
  managerUserId?: number | null;
  isActive?: boolean;
  permissionGroupIds?: number[];
}

export const userFormSchema = z.object({
  username: z
    .string()
    .min(1, 'form.usernameRequired')
    .max(50, 'form.usernameMaxLength'),
  email: z
    .string()
    .email('form.emailInvalid')
    .min(1, 'form.emailRequired'),
  password: z.union([
    z.literal(''),
    z
      .string()
      .min(8, 'form.passwordMinLength')
      .max(100, 'form.passwordMaxLength'),
  ]),
  firstName: z.string().max(50, 'form.firstNameMaxLength').optional(),
  lastName: z.string().max(50, 'form.lastNameMaxLength').optional(),
  phoneNumber: z.string().max(20, 'form.phoneNumberMaxLength').optional(),
  roleId: z.number().min(1, 'form.roleRequired'),
  managerUserId: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  permissionGroupIds: z.array(z.number()).optional(),
});

export const userUpdateFormSchema = z.object({
  username: z.string().optional(),
  email: z.string().email('form.emailInvalid').optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  phoneNumber: z.string().max(20).optional(),
  roleId: z.number().min(1, 'form.roleRequired').optional().nullable(),
  managerUserId: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  permissionGroupIds: z.array(z.number()).optional(),
});

export type UserFormSchema = z.infer<typeof userFormSchema>;
export type UserUpdateFormSchema = z.infer<typeof userUpdateFormSchema>;

export interface UserAuthorityDto {
  id: number;
  title: string;
}
