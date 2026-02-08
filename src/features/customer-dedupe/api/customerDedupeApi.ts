import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { CustomerDuplicateCandidateDto, CustomerMergeRequestDto } from '../types/customerDedupe.types';
import type { CustomerDto } from '@/features/customer-management/types/customer-types';

function extractData<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message || response.exceptionMessage || 'Request failed');
  }
  return response.data;
}

export const customerDedupeApi = {
  getDuplicateCandidates: async (): Promise<CustomerDuplicateCandidateDto[]> => {
    const response = await api.get<ApiResponse<CustomerDuplicateCandidateDto[]>>(
      '/api/customer/dedupe/candidates'
    );
    const data = extractData(response as ApiResponse<CustomerDuplicateCandidateDto[]>);
    return Array.isArray(data) ? data : [];
  },

  mergeCustomers: async (payload: CustomerMergeRequestDto): Promise<CustomerDto> => {
    const response = await api.post<ApiResponse<CustomerDto>>(
      '/api/customer/dedupe/merge',
      payload
    );
    return extractData(response as ApiResponse<CustomerDto>);
  },
};
