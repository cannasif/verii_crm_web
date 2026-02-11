import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type {
  DemandBulkCreateDto,
  DemandGetDto,
  CreateDemandLineDto,
  PriceOfProductDto,
  PriceOfProductRequestDto,
  PricingRuleLineGetDto,
  UserDiscountLimitDto,
  ApprovalActionGetDto,
  ApproveActionDto,
  RejectActionDto,
  DemandExchangeRateGetDto,
  DemandLineGetDto,
  DemandNotesGetDto,
  UpdateDemandNotesListDto,
  ApprovalStatus,
  ApprovalScopeUserDto,
  DemandApprovalFlowReportDto,
} from '../types/demand-types';

export const demandApi = {
  createBulk: async (data: DemandBulkCreateDto): Promise<ApiResponse<DemandGetDto>> => {
    try {
      const response = await api.post<ApiResponse<DemandGetDto>>(
        '/api/demand/bulk-demand',
        data
      );
      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number } };
        if (axiosError.response?.data) {
          throw new Error(JSON.stringify(axiosError.response.data));
        }
      }
      throw error;
    }
  },

  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<DemandGetDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
    }

    const response = await api.get<ApiResponse<PagedResponse<DemandGetDto>>>(
      `/api/Demand/related?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const pagedDataWithItems = pagedData as PagedResponse<DemandGetDto> & { items?: DemandGetDto[] };
      if (pagedDataWithItems.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedDataWithItems.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Teklif listesi yüklenemedi');
  },

  getById: async (id: number): Promise<DemandGetDto> => {
    const response = await api.get<ApiResponse<DemandGetDto>>(`/api/demand/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Teklif detayı yüklenemedi');
  },

  canEdit: async (id: number): Promise<boolean> => {
    const response = await api.get<ApiResponse<boolean>>(`/api/approval/demand/${id}/can-edit`);
    if (response.success && response.data !== undefined) {
      return response.data;
    }
    return false;
  },

  getApprovalStatus: async (id: number): Promise<ApprovalStatus> => {
    const response = await api.get<ApiResponse<ApprovalStatus>>(
      `/api/approval/demand/${id}/status`
    );
    if (response.success && response.data !== undefined) {
      return response.data;
    }
    throw new Error(response.message || 'Onay durumu yüklenemedi');
  },

  getPriceOfProduct: async (requests: PriceOfProductRequestDto[]): Promise<PriceOfProductDto[]> => {
    if (!requests || requests.length === 0) {
      return [];
    }

    const queryParams = new URLSearchParams();
    requests.forEach((req, index) => {
      queryParams.append(`request[${index}].productCode`, req.productCode);
      queryParams.append(`request[${index}].groupCode`, req.groupCode);
    });

    const url = `/api/demand/price-of-product?${queryParams.toString()}`;
    const response = await api.get<ApiResponse<PriceOfProductDto[]>>(url);

    if (!response) {
      throw new Error('API response bulunamadı');
    }

    if (response.statusCode && response.statusCode !== 200) {
      throw new Error(response.message || `HTTP ${response.statusCode}: Ürün fiyatı yüklenemedi`);
    }

    if (!response.success && (!response.data || !Array.isArray(response.data) || response.data.length === 0)) {
      return [];
    }

    if (!response.data) {
      return [];
    }

    if (!Array.isArray(response.data)) {
      throw new Error('API\'den beklenmeyen veri formatı döndü');
    }

    const mappedData = response.data.map((item: unknown) => {
      const priceItem = item as Record<string, unknown>;
      return {
        productCode: (priceItem.productCode as string) || (priceItem.ProductCode as string) || '',
        groupCode: (priceItem.groupCode as string) || (priceItem.GroupCode as string) || '',
        currency: (priceItem.currency as string) || (priceItem.Currency as string) || '',
        listPrice: (priceItem.listPrice as number) ?? (priceItem.ListPrice as number) ?? 0,
        costPrice: (priceItem.costPrice as number) ?? (priceItem.CostPrice as number) ?? 0,
        discount1: (priceItem.discount1 as number | null) ?? (priceItem.Discount1 as number | null) ?? null,
        discount2: (priceItem.discount2 as number | null) ?? (priceItem.Discount2 as number | null) ?? null,
        discount3: (priceItem.discount3 as number | null) ?? (priceItem.Discount3 as number | null) ?? null,
      };
    });

    return mappedData;
  },

  getPriceRuleOfDemand: async (
    customerCode: string,
    salesmenId: number,
    demandDate: string
  ): Promise<PricingRuleLineGetDto[]> => {
    const queryParams = new URLSearchParams({
      customerCode,
      salesmenId: salesmenId.toString(),
      demandDate,
    });

    const url = `/api/demand/price-rule-of-demand?${queryParams.toString()}`;
    const response = await api.get<ApiResponse<PricingRuleLineGetDto[]>>(url);

    if (!response) {
      throw new Error('API response bulunamadı');
    }

    if (response.statusCode && response.statusCode !== 200) {
      throw new Error(response.message || `HTTP ${response.statusCode}: Fiyat kuralları yüklenemedi`);
    }

    if (!response.success) {
      return [];
    }

    if (!response.data) {
      return [];
    }

    if (!Array.isArray(response.data)) {
      throw new Error('API\'den beklenmeyen veri formatı döndü');
    }

    return response.data;
  },

  getUserDiscountLimitsBySalespersonId: async (salespersonId: number): Promise<UserDiscountLimitDto[]> => {
    const response = await api.get<ApiResponse<UserDiscountLimitDto[]>>(
      `/api/UserDiscountLimit/salesperson/${salespersonId}`
    );
    
    if (!response.success || !response.data) {
      return [];
    }

    if (!Array.isArray(response.data)) {
      throw new Error('API\'den beklenmeyen veri formatı döndü');
    }

    return response.data.map((item: unknown) => {
      const value = item as Record<string, unknown>;
      return {
        erpProductGroupCode:
          (value.erpProductGroupCode as string) ??
          (value.ErpProductGroupCode as string) ??
          '',
        salespersonId:
          (value.salespersonId as number) ??
          (value.SalespersonId as number) ??
          0,
        salespersonName:
          (value.salespersonName as string) ??
          (value.SalespersonName as string) ??
          '',
        maxDiscount1:
          Number((value.maxDiscount1 as number) ?? (value.MaxDiscount1 as number) ?? 0) || 0,
        maxDiscount2:
          value.maxDiscount2 != null || value.MaxDiscount2 != null
            ? Number((value.maxDiscount2 as number) ?? (value.MaxDiscount2 as number))
            : null,
        maxDiscount3:
          value.maxDiscount3 != null || value.MaxDiscount3 != null
            ? Number((value.maxDiscount3 as number) ?? (value.MaxDiscount3 as number))
            : null,
        id: (value.id as number) ?? (value.Id as number) ?? undefined,
        createdAt:
          (value.createdAt as string) ??
          (value.CreatedAt as string) ??
          (value.createdDate as string) ??
          (value.CreatedDate as string) ??
          null,
        updatedAt:
          (value.updatedAt as string) ??
          (value.UpdatedAt as string) ??
          (value.updatedDate as string) ??
          (value.UpdatedDate as string) ??
          null,
        createdBy:
          (value.createdBy as number) ??
          (value.CreatedBy as number) ??
          null,
        updatedBy:
          (value.updatedBy as number) ??
          (value.UpdatedBy as number) ??
          null,
        deletedBy:
          (value.deletedBy as number) ??
          (value.DeletedBy as number) ??
          null,
      };
    });
  },

  startApprovalFlow: async (data: { entityId: number; documentType: number; totalAmount: number }): Promise<ApiResponse<boolean>> => {
    try {
      const response = await api.post<ApiResponse<boolean>>('/api/demand/start-approval-flow', data);
      if (!response.success) {
        const errorMessage = response.message || response.exceptionMessage || 'Onay akışı başlatılamadı';
        const errorData = {
          message: errorMessage,
          exceptionMessage: response.exceptionMessage,
          errors: response.errors,
        };
        throw new Error(JSON.stringify(errorData));
      }
      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: ApiResponse<boolean> } };
        if (axiosError.response?.data) {
          const apiError = axiosError.response.data;
          const errorData = {
            message: apiError.message || apiError.exceptionMessage || 'Onay akışı başlatılamadı',
            exceptionMessage: apiError.exceptionMessage,
            errors: apiError.errors,
          };
          throw new Error(JSON.stringify(errorData));
        }
      }
      throw error;
    }
  },

  getWaitingApprovals: async (): Promise<ApprovalActionGetDto[]> => {
    const response = await api.get<ApiResponse<ApprovalActionGetDto[]>>('/api/demand/waiting-approvals');
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  },

  approve: async (data: ApproveActionDto): Promise<ApiResponse<boolean>> => {
    try {
      const response = await api.post<ApiResponse<boolean>>('/api/demand/approve', data);
      if (!response.success) {
        const errorMessage = response.message || response.exceptionMessage || 'Onay işlemi gerçekleştirilemedi';
        const errorData = {
          message: errorMessage,
          exceptionMessage: response.exceptionMessage,
          errors: response.errors,
        };
        throw new Error(JSON.stringify(errorData));
      }
      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: ApiResponse<boolean> } };
        if (axiosError.response?.data) {
          const apiError = axiosError.response.data;
          const errorData = {
            message: apiError.message || apiError.exceptionMessage || 'Onay işlemi gerçekleştirilemedi',
            exceptionMessage: apiError.exceptionMessage,
            errors: apiError.errors,
          };
          throw new Error(JSON.stringify(errorData));
        }
      }
      throw error;
    }
  },

  reject: async (data: RejectActionDto): Promise<ApiResponse<boolean>> => {
    try {
      const response = await api.post<ApiResponse<boolean>>('/api/demand/reject', data);
      if (!response.success) {
        const errorMessage = response.message || response.exceptionMessage || 'Red işlemi gerçekleştirilemedi';
        const errorData = {
          message: errorMessage,
          exceptionMessage: response.exceptionMessage,
          errors: response.errors,
        };
        throw new Error(JSON.stringify(errorData));
      }
      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: ApiResponse<boolean> } };
        if (axiosError.response?.data) {
          const apiError = axiosError.response.data;
          const errorData = {
            message: apiError.message || apiError.exceptionMessage || 'Red işlemi gerçekleştirilemedi',
            exceptionMessage: apiError.exceptionMessage,
            errors: apiError.errors,
          };
          throw new Error(JSON.stringify(errorData));
        }
      }
      throw error;
    }
  },

  getDemandExchangeRatesByDemandId: async (demandId: number): Promise<DemandExchangeRateGetDto[]> => {
    const response = await api.get<ApiResponse<DemandExchangeRateGetDto[]>>(
      `/api/DemandExchangeRate/demand/${demandId}`
    );
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  },

  getDemandLinesByDemandId: async (demandId: number): Promise<DemandLineGetDto[]> => {
    const response = await api.get<ApiResponse<DemandLineGetDto[]>>(
      `/api/DemandLine/by-demand/${demandId}`
    );
    if (response.success && response.data) {
      const raw = response.data as Array<DemandLineGetDto & { Id?: number }>;
      return raw.map((line) => ({
        ...line,
        id: line.id ?? line.Id ?? 0,
      })) as DemandLineGetDto[];
    }
    return [];
  },

  getDemandNotesByDemandId: async (demandId: number): Promise<DemandNotesGetDto | null> => {
    const response = await api.get<ApiResponse<DemandNotesGetDto>>(
      `/api/DemandNotes/by-demand/${demandId}`
    );
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  },

  updateNotesListByDemandId: async (
    demandId: number,
    payload: UpdateDemandNotesListDto
  ): Promise<ApiResponse<unknown>> => {
    const response = await api.put<ApiResponse<unknown>>(
      `/api/DemandNotes/by-demand/${demandId}/notes-list`,
      payload
    );
    if (!response.success) {
      throw new Error(response.message || 'Notlar güncellenirken bir hata oluştu');
    }
    return response;
  },

  createDemandLines: async (dtos: CreateDemandLineDto[]): Promise<DemandLineGetDto[]> => {
    const response = await api.post<ApiResponse<DemandLineGetDto[]>>(
      '/api/DemandLine/create-multiple',
      dtos
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Satırlar eklenirken bir hata oluştu');
  },

  updateDemandLines: async (dtos: DemandLineGetDto[]): Promise<DemandLineGetDto[]> => {
    const response = await api.put<ApiResponse<DemandLineGetDto[]>>(
      '/api/DemandLine/update-multiple',
      dtos
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Satırlar güncellenirken bir hata oluştu');
  },

  deleteDemandLine: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<unknown> | undefined>(`/api/DemandLine/${id}`);
    if (response != null && response.success === false) {
      throw new Error(response.message || 'Satır silinirken bir hata oluştu');
    }
  },

  updateExchangeRateInDemand: async (
    dtos: DemandExchangeRateGetDto[]
  ): Promise<ApiResponse<boolean>> => {
    const response = await api.put<ApiResponse<boolean>>(
      '/api/DemandExchangeRate/update-exchange-rate-in-demand',
      dtos
    );
    if (!response.success) {
      throw new Error(response.message || 'Döviz kurları güncellenirken bir hata oluştu');
    }
    return response;
  },

  updateBulk: async (id: number, data: DemandBulkCreateDto): Promise<ApiResponse<DemandGetDto>> => {
    try {
      const response = await api.put<ApiResponse<DemandGetDto>>(
        `/api/demand/bulk-demand/${id}`,
        data
      );
      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number } };
        if (axiosError.response?.data) {
          throw new Error(JSON.stringify(axiosError.response.data));
        }
      }
      throw error;
    }
  },

  getDemandRelatedUsers: async (userId: number): Promise<ApprovalScopeUserDto[]> => {
    const response = await api.get<ApiResponse<ApprovalScopeUserDto[]>>(
      `/api/Demand/related-users/${userId}`
    );
    if (!response.success || !response.data || !Array.isArray(response.data)) {
      return [];
    }
    return response.data.map((item: unknown) => {
      const r = item as Record<string, unknown>;
      return {
        flowId: (r.flowId as number) ?? (r.FlowId as number) ?? 0,
        userId: (r.userId as number) ?? (r.UserId as number) ?? 0,
        firstName: (r.firstName as string) ?? (r.FirstName as string) ?? '',
        lastName: (r.lastName as string) ?? (r.LastName as string) ?? '',
        roleGroupName: (r.roleGroupName as string) ?? (r.RoleGroupName as string) ?? '',
        stepOrder: (r.stepOrder as number) ?? (r.StepOrder as number) ?? 0,
      };
    });
  },

  getApprovalFlowReport: async (demandId: number): Promise<DemandApprovalFlowReportDto> => {
    const response = await api.get<ApiResponse<DemandApprovalFlowReportDto>>(
      `/api/Demand/${demandId}/approval-flow-report`
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay akışı raporu yüklenemedi');
  },

  createRevisionOfDemand: async (demandId: number): Promise<ApiResponse<DemandGetDto>> => {
    try {
      const response = await api.post<ApiResponse<DemandGetDto>>(
        '/api/Demand/revision-of-demand',
        demandId
      );
      if (!response.success) {
        throw new Error(response.message || 'Teklif revizyonu oluşturulamadı');
      }
      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number } };
        if (axiosError.response?.data) {
          throw new Error(JSON.stringify(axiosError.response.data));
        }
      }
      throw error;
    }
  },
};
