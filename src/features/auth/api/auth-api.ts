import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { LoginRequest, LoginResponse, ActiveUsersResponse, RefreshTokenRequest } from '../types/auth';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', {
      email: data.email,
      password: data.password,
      rememberMe: data.rememberMe,
    });
    return response;
  },
  register: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/register', {
      email: data.email,
      password: data.password,
    });
    return response;
  },
  getActiveUsers: async (): Promise<ActiveUsersResponse> => {
    const response = await api.get<ActiveUsersResponse>('/api/auth/users/active');
    return response;
  },
  resetPassword: async (data: { token: string; newPassword: string }): Promise<ApiResponse<boolean>> => {
    const response = await api.post<ApiResponse<boolean>>('/api/auth/reset-password', {
      token: data.token,
      newPassword: data.newPassword,
    });
    return response;
  },
  requestPasswordReset: async (email: string): Promise<ApiResponse<string>> => {
    const response = await api.post<ApiResponse<string>>('/api/auth/request-password-reset', {
      email,
    });
    return response;
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<string>> => {
    const response = await api.post<ApiResponse<string>>('/api/Auth/change-password', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    return response;
  },
  refreshToken: async (data: RefreshTokenRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/refresh-token', data);
    return response;
  },
};
