import { useQuery } from '@tanstack/react-query';
import { erpDocumentCleanupLogApi } from '../api/erp-document-cleanup-log-api';
import type { ErpDocumentCleanupLogPagedRequest } from '../types/erp-document-cleanup-log-types';

export const ERP_DOCUMENT_CLEANUP_LOG_QUERY_KEYS = {
  all: ['erp-document-cleanup-logs'] as const,
  list: (request: ErpDocumentCleanupLogPagedRequest) => ['erp-document-cleanup-logs', 'list', request] as const,
};

export function useErpDocumentCleanupLogs(request: ErpDocumentCleanupLogPagedRequest) {
  return useQuery({
    queryKey: ERP_DOCUMENT_CLEANUP_LOG_QUERY_KEYS.list(request),
    queryFn: () => erpDocumentCleanupLogApi.getList(request),
    staleTime: 60 * 1000,
  });
}
