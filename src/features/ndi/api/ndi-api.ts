import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

export interface NetsisCustomerDispatchDto {
  tipi?: string | null;
  exportTipi?: string | null;
  irsaliyeNo: string;
  cariKodu: string;
  cariIsim?: string | null;
  tarih?: string | null;
  aciklama?: string | null;
  plasiyerKodu?: string | null;
  plasiyerAciklama?: string | null;
  teslimCariKodu?: string | null;
  teslimCariIsim?: string | null;
}

export interface NetsisCustomerDispatchLineDto {
  fisNo: string;
  cariKodu?: string | null;
  stokKodu: string;
  stokAdi?: string | null;
  miktar: number;
  tlFiyat?: number | null;
  netFiyat?: number | null;
  dovizTipi?: number | null;
  dovizFiyat?: number | null;
  dovizKuru?: number | null;
  olcuBirimi?: string | null;
  olcuBr?: string | null;
  teslimMiktari: number;
  bakiye: number;
}

export interface NetsisCustomerDispatchOrderCheckDto {
  cariIsim?: string | null;
  teslimCariIsim?: string | null;
  aciklama?: string | null;
  teslimCariKodu?: string | null;
  siparisNo?: string | null;
  irsaliyeTarihi?: string | null;
  irsaliyeTeslimTarihi?: string | null;
  fatirsNo: string;
}

export interface NetsisNdiTransferRuleDto {
  code: string;
  title: string;
  sourceSerial: string;
  sourceNetsisCompany: string;
  targetNetsisCompany: string;
  targetSerialRule: string;
  carriesSourceSerialToTarget: boolean;
  description: string;
}

export interface NdiTransferCreateLineRequest {
  stockCode: string;
  stockName?: string | null;
  quantity: number;
  unitPrice?: number | null;
  foreignUnitPrice?: number | null;
  currencyType?: number | null;
  currencyRate?: number | null;
  exchangeRate?: number | null;
  unit?: string | null;
  sourceWarehouse?: string | null;
  targetWarehouse?: string | null;
  vatRate?: number | null;
}

export interface NdiTransferCreateDocumentRequest {
  sourceDocumentNo: string;
  sourceNetsisCompany: string;
  targetNetsisCompany: string;
  targetSeries: string;
  documentType: string;
  customerCode: string;
  customerName?: string | null;
  description?: string | null;
  date?: string | null;
  lines: NdiTransferCreateLineRequest[];
}

export interface NdiTransferCreateRequest {
  documents: NdiTransferCreateDocumentRequest[];
}

export interface NdiTransferCreatedDocumentDto {
  sourceDocumentNo: string;
  sourceNetsisCompany: string;
  targetNetsisCompany: string;
  targetSeries: string;
  documentType: string;
  netsisDocumentNo: string;
  netsisRecordNo?: string | null;
  netsisReferenceNo?: string | null;
  lineCount: number;
  rawResponse?: string | null;
}

export interface NdiTransferFailedDocumentDto {
  sourceDocumentNo: string;
  targetSeries: string;
  documentType: string;
  errorMessage: string;
}

export interface NdiTransferCreateResponseDto {
  createdDocuments: NdiTransferCreatedDocumentDto[];
  failedDocuments: NdiTransferFailedDocumentDto[];
  warnings: string[];
}

function ensureSuccess<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (response.success) {
    return response.data;
  }

  throw new Error(response.message || fallbackMessage);
}

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error == null || typeof error !== 'object') {
    return fallbackMessage;
  }

  const responseData = (error as { response?: { data?: unknown }; message?: string }).response?.data;
  if (responseData && typeof responseData === 'object') {
    const payload = responseData as Partial<ApiResponse<unknown>>;
    if (typeof payload.exceptionMessage === 'string' && payload.exceptionMessage.trim()) {
      return payload.exceptionMessage;
    }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  }

  const message = (error as { message?: string }).message;
  if (typeof message === 'string' && message.trim() && message !== 'Network Error') {
    return message;
  }

  return fallbackMessage;
}

function isNdiTransferCreateResponse(value: unknown): value is NdiTransferCreateResponseDto {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<NdiTransferCreateResponseDto>;
  return (
    Array.isArray(candidate.createdDocuments) &&
    Array.isArray(candidate.failedDocuments) &&
    Array.isArray(candidate.warnings)
  );
}

function getNdiTransferResultFromError(error: unknown): NdiTransferCreateResponseDto | null {
  if (error == null || typeof error !== 'object') {
    return null;
  }

  const responseData = (error as { response?: { data?: unknown } }).response?.data;
  if (responseData == null || typeof responseData !== 'object') {
    return null;
  }

  const payload = responseData as { details?: unknown; data?: unknown };
  if (isNdiTransferCreateResponse(payload.details)) {
    return payload.details;
  }

  if (isNdiTransferCreateResponse(payload.data)) {
    return payload.data;
  }

  return null;
}

export const ndiApi = {
  getCustomerDispatches: async (): Promise<NetsisCustomerDispatchDto[]> => {
    const response = await api.get<ApiResponse<NetsisCustomerDispatchDto[]>>('/api/NetsisRead/getCustomerDispatches');
    return ensureSuccess(response, 'Netsis irsaliyeleri yuklenemedi.');
  },

  getCustomerDispatchLines: async (irsNoList: string): Promise<NetsisCustomerDispatchLineDto[]> => {
    const fallbackMessage = 'Netsis irsaliye kalemleri yuklenemedi. API baglantisi ve FN_RII_REH_MUSTIRS_KALEM fonksiyonu kontrol edilmeli.';
    try {
      const response = await api.get<ApiResponse<NetsisCustomerDispatchLineDto[]>>('/api/NetsisRead/getCustomerDispatchLines', {
        params: { irsNoList },
      });
      return ensureSuccess(response, fallbackMessage);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, fallbackMessage));
    }
  },

  getCustomerDispatchOrderChecks: async (irsNoList: string): Promise<NetsisCustomerDispatchOrderCheckDto[]> => {
    const response = await api.get<ApiResponse<NetsisCustomerDispatchOrderCheckDto[]>>(
      '/api/NetsisRead/getCustomerDispatchOrderChecks',
      {
        params: { irsNoList },
      }
    );
    return ensureSuccess(response, 'Netsis irsaliye siparis kontrolleri yuklenemedi.');
  },

  getNdiTransferRules: async (): Promise<NetsisNdiTransferRuleDto[]> => {
    const response = await api.get<ApiResponse<NetsisNdiTransferRuleDto[]>>('/api/NetsisRead/getNdiTransferRules');
    return ensureSuccess(response, 'NDI aktarim kurallari yuklenemedi.');
  },

  createNdiTransfer: async (request: NdiTransferCreateRequest): Promise<NdiTransferCreateResponseDto> => {
    try {
      const response = await api.post<ApiResponse<NdiTransferCreateResponseDto>>('/api/NetsisNdiTransfer/create', request);
      return ensureSuccess(response, 'NDI aktarimi Netsis tarafina gonderilemedi.');
    } catch (error) {
      const partialResult = getNdiTransferResultFromError(error);
      if (partialResult) {
        return partialResult;
      }

      throw error;
    }
  },
};
