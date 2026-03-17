import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import { appendPagedQueryParams } from '@/utils/query-params';
import type {
  QuotationBulkCreateDto,
  QuotationGetDto,
  CreateQuotationLineDto,
  PriceOfProductDto,
  PriceOfProductRequestDto,
  PricingRuleLineGetDto,
  UserDiscountLimitDto,
  ApprovalActionGetDto,
  ApproveActionDto,
  RejectActionDto,
  QuotationExchangeRateGetDto,
  QuotationLineGetDto,
  ApprovalStatus,
  ApprovalScopeUserDto,
  QuotationApprovalFlowReportDto,
  QuotationNotesGetDto,
  UpdateQuotationNotesListDto,
} from '../types/quotation-types';

export const quotationApi = {
  createBulk: async (data: QuotationBulkCreateDto): Promise<ApiResponse<QuotationGetDto>> => {
    try {
      const response = await api.post<ApiResponse<QuotationGetDto>>(
        '/api/quotation/bulk-quotation',
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

  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<QuotationGetDto>> => {
    const queryParams = appendPagedQueryParams(new URLSearchParams(), params);

    const response = await api.get<ApiResponse<PagedResponse<QuotationGetDto>>>(
      `/api/Quotation/related?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const pagedDataWithItems = pagedData as PagedResponse<QuotationGetDto> & { items?: QuotationGetDto[] };
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

  getById: async (id: number): Promise<QuotationGetDto> => {
    const response = await api.get<ApiResponse<QuotationGetDto>>(`/api/quotation/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Teklif detayı yüklenemedi');
  },

  canEdit: async (id: number): Promise<boolean> => {
    const response = await api.get<ApiResponse<boolean>>(`/api/approval/quotation/${id}/can-edit`);
    if (response.success && response.data !== undefined) {
      return response.data;
    }
    return false;
  },

  getApprovalStatus: async (id: number): Promise<ApprovalStatus> => {
    const response = await api.get<ApiResponse<ApprovalStatus>>(
      `/api/approval/quotation/${id}/status`
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

    const url = `/api/quotation/price-of-product?${queryParams.toString()}`;
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

  getPriceRuleOfQuotation: async (
    customerCode: string,
    salesmenId: number,
    quotationDate: string
  ): Promise<PricingRuleLineGetDto[]> => {
    const queryParams = new URLSearchParams({
      customerCode,
      salesmenId: salesmenId.toString(),
      quotationDate,
    });

    const url = `/api/quotation/price-rule-of-quotation?${queryParams.toString()}`;
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
      const response = await api.post<ApiResponse<boolean>>('/api/quotation/start-approval-flow', data);
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
    const response = await api.get<ApiResponse<ApprovalActionGetDto[]>>('/api/quotation/waiting-approvals');
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  },

  approve: async (data: ApproveActionDto): Promise<ApiResponse<boolean>> => {
    try {
      const response = await api.post<ApiResponse<boolean>>('/api/quotation/approve', data);
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
      const response = await api.post<ApiResponse<boolean>>('/api/quotation/reject', data);
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

  getQuotationExchangeRatesByQuotationId: async (quotationId: number): Promise<QuotationExchangeRateGetDto[]> => {
    const response = await api.get<ApiResponse<QuotationExchangeRateGetDto[]>>(
      `/api/QuotationExchangeRate/quotation/${quotationId}`
    );
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  },

  getQuotationLinesByQuotationId: async (quotationId: number): Promise<QuotationLineGetDto[]> => {
    const response = await api.get<ApiResponse<QuotationLineGetDto[]>>(
      `/api/QuotationLine/by-quotation/${quotationId}`
    );
    if (response.success && response.data) {
      const raw = response.data as Array<QuotationLineGetDto & { Id?: number }>;
      return raw.map((line) => ({
        ...line,
        id: line.id ?? line.Id ?? 0,
      })) as QuotationLineGetDto[];
    }
    return [];
  },

  getQuotationNotesByQuotationId: async (quotationId: number): Promise<QuotationNotesGetDto | null> => {
    const response = await api.get<ApiResponse<QuotationNotesGetDto>>(
      `/api/QuotationNotes/by-quotation/${quotationId}`
    );
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  },

  updateNotesListByQuotationId: async (
    quotationId: number,
    payload: UpdateQuotationNotesListDto
  ): Promise<ApiResponse<unknown>> => {
    const response = await api.put<ApiResponse<unknown>>(
      `/api/QuotationNotes/by-quotation/${quotationId}/notes-list`,
      payload
    );
    if (!response.success) {
      throw new Error(response.message || 'Notlar güncellenirken bir hata oluştu');
    }
    return response;
  },

  createQuotationLines: async (dtos: CreateQuotationLineDto[]): Promise<QuotationLineGetDto[]> => {
    const response = await api.post<ApiResponse<QuotationLineGetDto[]>>(
      '/api/QuotationLine/create-multiple',
      dtos
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Satırlar eklenirken bir hata oluştu');
  },

  updateQuotationLines: async (dtos: QuotationLineGetDto[]): Promise<QuotationLineGetDto[]> => {
    const response = await api.put<ApiResponse<QuotationLineGetDto[]>>(
      '/api/QuotationLine/update-multiple',
      dtos
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Satırlar güncellenirken bir hata oluştu');
  },

  deleteQuotationLine: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<unknown> | undefined>(`/api/QuotationLine/${id}`);
    if (response != null && response.success === false) {
      throw new Error(response.message || 'Satır silinirken bir hata oluştu');
    }
  },

  updateExchangeRateInQuotation: async (
    dtos: QuotationExchangeRateGetDto[]
  ): Promise<ApiResponse<boolean>> => {
    const response = await api.put<ApiResponse<boolean>>(
      '/api/QuotationExchangeRate/update-exchange-rate-in-quotation',
      dtos
    );
    if (!response.success) {
      throw new Error(response.message || 'Döviz kurları güncellenirken bir hata oluştu');
    }
    return response;
  },

  updateBulk: async (id: number, data: QuotationBulkCreateDto): Promise<ApiResponse<QuotationGetDto>> => {
    try {
      const response = await api.put<ApiResponse<QuotationGetDto>>(
        `/api/quotation/bulk-quotation/${id}`,
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

  getQuotationRelatedUsers: async (userId: number): Promise<ApprovalScopeUserDto[]> => {
    const response = await api.get<ApiResponse<ApprovalScopeUserDto[]>>(
      `/api/Quotation/related-users/${userId}`
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

  getApprovalFlowReport: async (quotationId: number): Promise<QuotationApprovalFlowReportDto> => {
    const response = await api.get<ApiResponse<QuotationApprovalFlowReportDto>>(
      `/api/Quotation/${quotationId}/approval-flow-report`
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay akışı raporu yüklenemedi');
  },

  createRevisionOfQuotation: async (quotationId: number): Promise<ApiResponse<QuotationGetDto>> => {
    try {
      const response = await api.post<ApiResponse<QuotationGetDto>>(
        '/api/Quotation/revision-of-quotation',
        quotationId
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
