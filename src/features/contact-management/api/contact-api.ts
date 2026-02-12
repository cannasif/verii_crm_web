import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { SalutationType, ContactDto, CreateContactDto, UpdateContactDto } from '../types/contact-types';

const getString = (value: unknown): string => (typeof value === 'string' ? value : '');
const getOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeContact = (raw: unknown): ContactDto => {
  const item = (raw ?? {}) as Record<string, unknown>;
  const firstName = getString(item.firstName ?? item.FirstName);
  const middleName = getOptionalString(item.middleName ?? item.MiddleName);
  const lastName = getString(item.lastName ?? item.LastName);
  const fullName =
    getString(item.fullName ?? item.FullName) ||
    [firstName, middleName, lastName].filter(Boolean).join(' ').trim();

  return {
    id: toNumber(item.id ?? item.Id),
    salutation: toNumber(item.salutation ?? item.Salutation) as SalutationType,
    firstName,
    middleName,
    lastName,
    fullName,
    email: getOptionalString(item.email ?? item.Email),
    phone: getOptionalString(item.phone ?? item.Phone),
    mobile: getOptionalString(item.mobile ?? item.Mobile),
    status: getOptionalString(item.status ?? item.Status),
    notes: getOptionalString(item.notes ?? item.Notes),
    customerId: toNumber(item.customerId ?? item.CustomerId),
    customerName: getOptionalString(item.customerName ?? item.CustomerName),
    titleId: toNullableNumber(item.titleId ?? item.TitleId),
    titleName: getOptionalString(item.titleName ?? item.TitleName),
    createdDate: getString(item.createdDate ?? item.CreatedDate),
    updatedDate: getOptionalString(item.updatedDate ?? item.UpdatedDate),
    isDeleted: Boolean(item.isDeleted ?? item.IsDeleted),
    createdByFullUser: getOptionalString(item.createdByFullUser ?? item.CreatedByFullUser),
    updatedByFullUser: getOptionalString(item.updatedByFullUser ?? item.UpdatedByFullUser),
    deletedByFullUser: getOptionalString(item.deletedByFullUser ?? item.DeletedByFullUser),
  };
};

export const contactApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ContactDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<ContactDto>>>(
      `/api/Contact?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<ContactDto> & { items?: ContactDto[] };
      
      if (pagedData.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedData.items.map(normalizeContact),
        };
      }

      return {
        ...pagedData,
        data: (pagedData.data ?? []).map(normalizeContact),
      };
    }
    throw new Error(response.message || 'İletişim listesi yüklenemedi');
  },

  getById: async (id: number): Promise<ContactDto> => {
    const response = await api.get<ApiResponse<ContactDto>>(`/api/Contact/${id}`);
    if (response.success && response.data) {
      return normalizeContact(response.data);
    }
    throw new Error(response.message || 'İletişim detayı yüklenemedi');
  },

  create: async (data: CreateContactDto): Promise<ContactDto> => {
    const response = await api.post<ApiResponse<ContactDto>>('/api/Contact', data);
    if (response.success && response.data) {
      return normalizeContact(response.data);
    }
    throw new Error(response.message || 'İletişim oluşturulamadı');
  },

  update: async (id: number, data: UpdateContactDto): Promise<ContactDto> => {
    const response = await api.put<ApiResponse<ContactDto>>(`/api/Contact/${id}`, data);
    if (response.success && response.data) {
      return normalizeContact(response.data);
    }
    throw new Error(response.message || 'İletişim güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/Contact/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'İletişim silinemedi');
    }
  },
};
