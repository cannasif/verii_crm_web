import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { SystemSettingsDto, UpdateSystemSettingsDto } from '../types/systemSettings';

const SYSTEM_SETTINGS_BASE = '/api/SystemSettings';

function getErrorMessage(response: ApiResponse<unknown>, fallbackKey: string): string {
  if (response.message?.trim()) return response.message;
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
    const response = await api.put<ApiResponse<SystemSettingsDto>>(SYSTEM_SETTINGS_BASE, data);
    if (response.success === true && response.data) return response.data;
    throw new Error(getErrorMessage(response, 'common.UnexpectedError'));
  },
};
