import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type {
  OrderBulkCreateDto,
  OrderGetDto,
  CreateOrderLineDto,
  PriceOfProductDto,
  PriceOfProductRequestDto,
  PricingRuleLineGetDto,
  UserDiscountLimitDto,
  ApprovalActionGetDto,
  ApproveActionDto,
  RejectActionDto,
  OrderExchangeRateGetDto,
  OrderLineGetDto,
  OrderNotesGetDto,
  UpdateOrderNotesListDto,
  ApprovalStatus,
  ApprovalScopeUserDto,
  OrderApprovalFlowReportDto,
} from '../types/order-types';

export const orderApi = {
  createBulk: async (data: OrderBulkCreateDto): Promise<ApiResponse<OrderGetDto>> => {
    try {
      const response = await api.post<ApiResponse<OrderGetDto>>(
        '/api/order/bulk-order',
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

  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<OrderGetDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<OrderGetDto>>>(
      `/api/Order/related?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const pagedDataWithItems = pagedData as PagedResponse<OrderGetDto> & { items?: OrderGetDto[] };
      if (pagedDataWithItems.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedDataWithItems.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Sipariş listesi yüklenemedi');
  },

  getById: async (id: number): Promise<OrderGetDto> => {
    const response = await api.get<ApiResponse<OrderGetDto>>(`/api/order/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Sipariş detayı yüklenemedi');
  },

  canEdit: async (id: number): Promise<boolean> => {
    const response = await api.get<ApiResponse<boolean>>(`/api/approval/order/${id}/can-edit`);
    if (response.success && response.data !== undefined) {
      return response.data;
    }
    return false;
  },

  getApprovalStatus: async (id: number): Promise<ApprovalStatus> => {
    const response = await api.get<ApiResponse<ApprovalStatus>>(
      `/api/approval/order/${id}/status`
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

    const url = `/api/order/price-of-product?${queryParams.toString()}`;
    const response = await api.get<ApiResponse<PriceOfProductDto[]>>(url);

    if (!response) {
      throw new Error('API response bulunamadı');
    }

    if (response.statusCode && response.statusCode !== 200) {
      throw new Error(response.message || `HTTP ${response.statusCode}: Ürün fiyatı yüklenemedi`);
    }

    if (!response.success || !response.data) {
      return [];
    }

    if (!Array.isArray(response.data)) {
      throw new Error('API\'den beklenmeyen veri formatı döndü');
    }

    return response.data.map((item: unknown) => {
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
  },

  getPriceRuleOfOrder: async (
    customerCode: string,
    salesmenId: number,
    orderDate: string
  ): Promise<PricingRuleLineGetDto[]> => {
    const queryParams = new URLSearchParams({
      customerCode,
      salesmenId: salesmenId.toString(),
      orderDate,
    });

    const url = `/api/order/price-rule-of-order?${queryParams.toString()}`;
    const response = await api.get<ApiResponse<PricingRuleLineGetDto[]>>(url);

    if (!response) {
      throw new Error('API response bulunamadı');
    }

    if (response.statusCode && response.statusCode !== 200) {
      throw new Error(response.message || `HTTP ${response.statusCode}: Fiyat kuralları yüklenemedi`);
    }

    if (!response.success || !response.data) {
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
      const response = await api.post<ApiResponse<boolean>>('/api/order/start-approval-flow', data);
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
    const response = await api.get<ApiResponse<ApprovalActionGetDto[]>>('/api/order/waiting-approvals');
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  },

  approve: async (data: ApproveActionDto): Promise<ApiResponse<boolean>> => {
    try {
      const response = await api.post<ApiResponse<boolean>>('/api/order/approve', data);
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
      const response = await api.post<ApiResponse<boolean>>('/api/order/reject', data);
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

  getOrderExchangeRatesByOrderId: async (orderId: number): Promise<OrderExchangeRateGetDto[]> => {
    const response = await api.get<ApiResponse<OrderExchangeRateGetDto[]>>(
      `/api/OrderExchangeRate/order/${orderId}`
    );
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  },

  getOrderLinesByOrderId: async (orderId: number): Promise<OrderLineGetDto[]> => {
    const response = await api.get<ApiResponse<OrderLineGetDto[]>>(
      `/api/OrderLine/by-order/${orderId}`
    );
    if (response.success && response.data) {
      const raw = response.data as Array<OrderLineGetDto & { Id?: number }>;
      return raw.map((line) => ({
        ...line,
        id: line.id ?? line.Id ?? 0,
      })) as OrderLineGetDto[];
    }
    return [];
  },

  getOrderNotesByOrderId: async (orderId: number): Promise<OrderNotesGetDto | null> => {
    const response = await api.get<ApiResponse<OrderNotesGetDto>>(
      `/api/OrderNotes/by-order/${orderId}`
    );
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  },

  updateNotesListByOrderId: async (
    orderId: number,
    payload: UpdateOrderNotesListDto
  ): Promise<ApiResponse<unknown>> => {
    const response = await api.put<ApiResponse<unknown>>(
      `/api/OrderNotes/by-order/${orderId}/notes-list`,
      payload
    );
    if (!response.success) {
      throw new Error(response.message || 'Notlar güncellenirken bir hata oluştu');
    }
    return response;
  },

  createOrderLines: async (dtos: CreateOrderLineDto[]): Promise<OrderLineGetDto[]> => {
    const response = await api.post<ApiResponse<OrderLineGetDto[]>>(
      '/api/OrderLine/create-multiple',
      dtos
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Satırlar eklenirken bir hata oluştu');
  },

  updateOrderLines: async (dtos: OrderLineGetDto[]): Promise<OrderLineGetDto[]> => {
    const response = await api.put<ApiResponse<OrderLineGetDto[]>>(
      '/api/OrderLine/update-multiple',
      dtos
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Satırlar güncellenirken bir hata oluştu');
  },

  deleteOrderLine: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<unknown> | undefined>(`/api/OrderLine/${id}`);
    if (response != null && response.success === false) {
      throw new Error(response.message || 'Satır silinirken bir hata oluştu');
    }
  },

  updateExchangeRateInOrder: async (
    dtos: OrderExchangeRateGetDto[]
  ): Promise<ApiResponse<boolean>> => {
    const response = await api.put<ApiResponse<boolean>>(
      '/api/OrderExchangeRate/update-exchange-rate-in-order',
      dtos
    );
    if (!response.success) {
      throw new Error(response.message || 'Döviz kurları güncellenirken bir hata oluştu');
    }
    return response;
  },

  updateBulk: async (id: number, data: OrderBulkCreateDto): Promise<ApiResponse<OrderGetDto>> => {
    try {
      const response = await api.put<ApiResponse<OrderGetDto>>(
        `/api/order/bulk-order/${id}`,
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

  getOrderRelatedUsers: async (userId: number): Promise<ApprovalScopeUserDto[]> => {
    const response = await api.get<ApiResponse<ApprovalScopeUserDto[]>>(
      `/api/Order/related-users/${userId}`
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

  getApprovalFlowReport: async (orderId: number): Promise<OrderApprovalFlowReportDto> => {
    const response = await api.get<ApiResponse<OrderApprovalFlowReportDto>>(
      `/api/Order/${orderId}/approval-flow-report`
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay akışı raporu yüklenemedi');
  },

  createRevisionOfOrder: async (orderId: number): Promise<ApiResponse<OrderGetDto>> => {
    try {
      const response = await api.post<ApiResponse<OrderGetDto>>(
        '/api/Order/revision-of-order',
        orderId
      );
      if (!response.success) {
        throw new Error(response.message || 'Sipariş revizyonu oluşturulamadı');
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
