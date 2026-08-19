import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { SmtpSettingsDto, UpdateSmtpSettingsDto } from '../types/smtpSettings';

const SMTP_SETTINGS_BASE = '/api/SmtpSettings';

function getErrorMessage(response: ApiResponse<unknown>, fallbackKey: string): string {
  if (response.message?.trim()) return response.message;
  if (response.exceptionMessage?.trim()) return response.exceptionMessage;
  if (response.errors?.length) return response.errors.join(' ');
  return fallbackKey;
}

export const smtpSettingsApi = {
  get: async (): Promise<SmtpSettingsDto> => {
    const response = await api.get<ApiResponse<SmtpSettingsDto>>(SMTP_SETTINGS_BASE);
    if (response.success === true && response.data) {
      return response.data;
    }
    throw new Error(getErrorMessage(response, 'common.UnexpectedError'));
  },

  update: async (data: UpdateSmtpSettingsDto): Promise<SmtpSettingsDto> => {
    const response = await api.post<ApiResponse<SmtpSettingsDto>>(`${SMTP_SETTINGS_BASE}/update`, data, {
      timeout: 30_000,
    });
    if (response.success === true && response.data) {
      return response.data;
    }
    throw new Error(getErrorMessage(response, 'common.UnexpectedError'));
  },

  sendTest: async (to?: string): Promise<boolean> => {
    const response = await api.post<ApiResponse<boolean>>('/api/Mail/send-test', {
      ...(to ? { to } : {}),
    });
    if (response.success === true && response.data != null) {
      return response.data;
    }
    throw new Error(getErrorMessage(response, 'common.UnexpectedError'));
  },
};
