import { z } from 'zod';
import type { ApiResponse } from '@/types/api';

export const loginRequestSchema = z.object({
  email: z.string().email('auth.validation.emailInvalid'),
  password: z.string().min(1, 'auth.validation.passwordRequired'),
  branchId: z.string().min(1, 'auth.validation.branchRequired'),
  rememberMe: z.boolean(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z.object({
  email: z.string().email('auth.validation.emailInvalid'),
  password: z.string().min(8, 'auth.validation.passwordMinLength'),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export interface LoginWithSessionResponseDto {
  token: string;
  refreshToken: string;
  refreshTokenExpiresAt?: string | null;
  userId: number;
  sessionId: string;
  rememberMe: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export type LoginResponse = ApiResponse<LoginWithSessionResponseDto>;

export interface Branch {
  id: string;
  name: string;
  code?: string;
}

export interface UserDto {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: string;
  isEmailConfirmed: boolean;
  isActive: boolean;
  lastLoginDate: string | null;
  fullName: string;
  creationTime: string | null;
  lastModificationTime: string | null;
}

export type ActiveUsersResponse = ApiResponse<UserDto[]>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'auth.validation.tokenRequired'),
  newPassword: z.string().min(6, 'auth.validation.newPasswordMinLength'),
  confirmPassword: z.string().min(6, 'auth.validation.confirmPasswordRequired'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'auth.validation.passwordsMismatch',
  path: ['confirmPassword'],
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('auth.validation.emailInvalid'),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'auth.validation.currentPasswordRequired'),
  newPassword: z.string().min(6, 'auth.validation.newPasswordMinLength').max(100, 'auth.validation.newPasswordMaxLength'),
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'auth.validation.newPasswordSameAsCurrent',
  path: ['newPassword'],
});

export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
