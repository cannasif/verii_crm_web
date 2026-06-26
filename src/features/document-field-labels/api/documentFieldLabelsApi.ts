import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
  DocumentFieldLabelDocumentType,
  DocumentFieldLabelDto,
  DocumentFieldLabelScope,
  UpdateDocumentFieldLabelsRequest,
} from '../types/documentFieldLabels';

const BASE_URL = '/api/DocumentFieldLabels';

function getErrorMessage(response: ApiResponse<unknown>, fallbackKey: string): string {
  if (response.message?.trim()) return response.message;
  if (response.exceptionMessage?.trim()) return response.exceptionMessage;
  if (response.errors?.length) return response.errors.join(' ');
  return fallbackKey;
}

export const documentFieldLabelsApi = {
  get: async (params?: {
    documentType?: DocumentFieldLabelDocumentType;
    scope?: DocumentFieldLabelScope;
  }): Promise<DocumentFieldLabelDto[]> => {
    const response = await api.get<ApiResponse<DocumentFieldLabelDto[]>>(BASE_URL, { params });
    if (response.success === true && response.data) return response.data;
    throw new Error(getErrorMessage(response, 'common.UnexpectedError'));
  },

  update: async (data: UpdateDocumentFieldLabelsRequest): Promise<DocumentFieldLabelDto[]> => {
    const response = await api.post<ApiResponse<DocumentFieldLabelDto[]>>(`${BASE_URL}/update`, data, {
      timeout: 30_000,
    });
    if (response.success === true && response.data) return response.data;
    throw new Error(getErrorMessage(response, 'common.UnexpectedError'));
  },
};
