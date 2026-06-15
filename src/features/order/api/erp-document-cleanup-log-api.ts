import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
  ErpDocumentCleanupLog,
  ErpDocumentCleanupLogPagedRequest,
  ErpDocumentCleanupLogPagedResponse,
} from '../types/erp-document-cleanup-log-types';

function normalizePagedResponse(
  response: ErpDocumentCleanupLogPagedResponse<ErpDocumentCleanupLog>
): Required<ErpDocumentCleanupLogPagedResponse<ErpDocumentCleanupLog>> {
  return {
    ...response,
    data: response.data ?? response.items ?? [],
    items: response.items ?? response.data ?? [],
  };
}

export const erpDocumentCleanupLogApi = {
  getList: async (
    request: ErpDocumentCleanupLogPagedRequest
  ): Promise<Required<ErpDocumentCleanupLogPagedResponse<ErpDocumentCleanupLog>>> => {
    const response = await api.post<ApiResponse<ErpDocumentCleanupLogPagedResponse<ErpDocumentCleanupLog>>>(
      '/api/erp-document-cleanup-logs/query',
      {
        pageNumber: request.pageNumber ?? 1,
        pageSize: request.pageSize ?? 20,
        search: request.search ?? '',
        sortBy: request.sortBy ?? 'createdDate',
        sortDirection: request.sortDirection ?? 'desc',
        filterLogic: request.filterLogic ?? 'and',
        filters: request.filters ?? [],
      }
    );

    if (response.success && response.data) {
      return normalizePagedResponse(response.data);
    }

    throw new Error(response.message || response.exceptionMessage || 'ERP kayıt temizleme logları yüklenemedi.');
  },
};
