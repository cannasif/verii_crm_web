import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { ErpConnectionTestResultDto, SystemSettingsDto, UpdateSystemSettingsDto } from '../types/systemSettings';

const SYSTEM_SETTINGS_BASE = '/api/SystemSettings';
const NETSIS_AUTH_BASE = '/api/netsis-auth';

function resolveBranchCode(): string {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { branch?: { code?: string | number } } };
      const branchCode = parsed.state?.branch?.code;
      if (branchCode !== undefined && branchCode !== null && String(branchCode).trim()) {
        return String(branchCode).trim();
      }
    }
  } catch {
    // Fallback below keeps the connection test usable even if persisted auth shape changes.
  }

  return '0';
}

function getErrorMessage(response: ApiResponse<unknown>, fallbackKey: string): string {
  if (response.message?.trim()) return response.message;
  if (response.exceptionMessage?.trim()) return response.exceptionMessage;
  if (response.errors?.length) return response.errors.join(' ');
  return fallbackKey;
}

export const systemSettingsApi = {
  get: async (): Promise<SystemSettingsDto> => {
    const response = await api.get<ApiResponse<SystemSettingsDto>>(SYSTEM_SETTINGS_BASE);
    if (response.success === true && response.data) return response.data;
    throw new Error(getErrorMessage(response, 'common.UnexpectedError'));
  },

  update: async (data: UpdateSystemSettingsDto): Promise<SystemSettingsDto> => {
    const response = await api.post<ApiResponse<SystemSettingsDto>>(`${SYSTEM_SETTINGS_BASE}/update`, data, {
      timeout: 30_000,
    });
    if (response.success === true && response.data) return response.data;
    throw new Error(getErrorMessage(response, 'common.UnexpectedError'));
  },

  testErpConnection: async (): Promise<ApiResponse<ErpConnectionTestResultDto>> => {
    const response = await api.get<ApiResponse<ErpConnectionTestResultDto>>(`${NETSIS_AUTH_BASE}/login`, {
      params: {
        branchCode: resolveBranchCode(),
        forceRefresh: true,
      },
    });

    if (response.success === true) return response;
    throw new Error(getErrorMessage(response, 'systemSettings.ErpConnection.TestFailed'));
  },
};
