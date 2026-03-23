import { api } from '@/lib/axios';
import { getApiData, isApiSuccess, unwrapApiResponse } from '@/lib/utils/api-response';
import type {
  DocumentRuleType,
  ReportTemplateDataDto,
  ReportTemplateFieldsDto,
  ReportTemplateGetDto,
  ReportTemplateCreateDto,
  ReportTemplateUpdateDto,
  PdfReportTemplateListParams,
  PdfReportTemplateListResult,
  PdfTablePresetDto,
  PdfTemplateAssetDto,
  PdfTablePresetCreateDto,
  PdfTablePresetListParams,
  PdfTablePresetListResult,
  PdfTablePresetUpdateDto,
} from '../types/pdf-report-template.types';

const BASE = '/api/pdf-report-templates';
const PRESET_BASE = '/api/pdf-table-presets';

function normalizeTemplateItem(item: unknown): ReportTemplateGetDto {
  const r = item != null && typeof item === 'object' ? (item as Record<string, unknown>) : {};
  const id = r.id ?? r.Id ?? 0;
  const ruleType = r.ruleType ?? r.RuleType ?? 0;
  const title = r.title ?? r.Title ?? '';
  const isActive = r.isActive ?? r.IsActive ?? false;
  let templateData = (r.templateData ?? r.TemplateData) as ReportTemplateDataDto | undefined;
  if (templateData == null) {
    const templateJson = r.templateJson ?? r.TemplateJson;
    if (typeof templateJson === 'string') {
      try {
        templateData = JSON.parse(templateJson) as ReportTemplateDataDto;
      } catch {
        templateData = {
          schemaVersion: 1,
          page: { width: 794, height: 1123, unit: 'px' },
          elements: [],
        };
      }
    } else if (templateJson != null && typeof templateJson === 'object') {
      templateData = templateJson as ReportTemplateDataDto;
    } else {
      templateData = {
        schemaVersion: 1,
        page: { width: 794, height: 1123, unit: 'px' },
        elements: [],
      };
    }
  }
  const elements =
    templateData.elements ??
    (templateData as unknown as Record<string, unknown>).Elements ??
    [];
  const page =
    templateData.page ?? (templateData as unknown as Record<string, unknown>).Page ?? {
      width: 794,
      height: 1123,
      unit: 'px',
    };
  const normalizedData: ReportTemplateDataDto = {
    schemaVersion:
      Number(
        (templateData as unknown as Record<string, unknown>).schemaVersion ??
          (templateData as unknown as Record<string, unknown>).SchemaVersion ??
          1
      ) || 1,
    layoutKey: String(
      (templateData as unknown as Record<string, unknown>).layoutKey ??
      (templateData as unknown as Record<string, unknown>).LayoutKey ??
      ''
    ) || undefined,
    layoutOptions:
      ((templateData as unknown as Record<string, unknown>).layoutOptions ??
        (templateData as unknown as Record<string, unknown>).LayoutOptions) as
        | Record<string, string>
        | undefined,
    page: page as ReportTemplateDataDto['page'],
    elements: Array.isArray(elements) ? elements : [],
  };
  const isDefault = Boolean(r.default ?? r.Default ?? false);
  return {
    id: Number(id),
    ruleType: Number(ruleType) as DocumentRuleType,
    title: String(title),
    templateData: normalizedData,
    isActive: Boolean(isActive),
    default: isDefault,
  };
}

function toTemplateList(raw: unknown): ReportTemplateGetDto[] {
  if (Array.isArray(raw)) return raw.map(normalizeTemplateItem);
  if (raw == null || typeof raw !== 'object') return [];
  const paged = raw as Record<string, unknown>;
  const arr = (paged.items ?? paged.Items ?? paged.data ?? paged.Data) as unknown;
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeTemplateItem);
}

function parseListResult(response: unknown): PdfReportTemplateListResult {
  const data = getApiData<Record<string, unknown>>(response);
  if (data == null) return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 0 };
  const items = toTemplateList(data.items ?? data.data ?? data.Items ?? data.Data ?? []);
  const totalCount = Number(data.totalCount ?? data.TotalCount ?? 0) || items.length;
  const pageNumber = Number(data.pageNumber ?? data.PageNumber ?? 1) || 1;
  const pageSize = Number(data.pageSize ?? data.PageSize ?? 10) || items.length;
  const totalPages =
    Number(data.totalPages ?? data.TotalPages ?? 0) ||
    Math.max(1, Math.ceil(totalCount / (pageSize || 1)));
  return { items, totalCount, pageNumber, pageSize, totalPages };
}

function normalizePresetItem(item: unknown): PdfTablePresetDto {
  const r = item != null && typeof item === 'object' ? (item as Record<string, unknown>) : {};
  return {
    id: Number(r.id ?? r.Id ?? 0),
    ruleType: Number(r.ruleType ?? r.RuleType ?? 0) as DocumentRuleType,
    name: String(r.name ?? r.Name ?? ''),
    key: String(r.key ?? r.Key ?? ''),
    columns: Array.isArray(r.columns ?? r.Columns) ? ((r.columns ?? r.Columns) as PdfTablePresetDto['columns']) : [],
    tableOptions: ((r.tableOptions ?? r.TableOptions) as PdfTablePresetDto['tableOptions']) ?? undefined,
    isActive: Boolean(r.isActive ?? r.IsActive ?? false),
  };
}

function parsePresetListResult(response: unknown): PdfTablePresetListResult {
  const data = getApiData<Record<string, unknown>>(response);
  if (data == null) return { items: [], totalCount: 0, pageNumber: 1, pageSize: 20, totalPages: 0 };
  const rawItems = (data.items ?? data.Items ?? data.data ?? data.Data) as unknown;
  const items = Array.isArray(rawItems) ? rawItems.map(normalizePresetItem) : [];
  const totalCount = Number(data.totalCount ?? data.TotalCount ?? 0) || items.length;
  const pageNumber = Number(data.pageNumber ?? data.PageNumber ?? 1) || 1;
  const pageSize = Number(data.pageSize ?? data.PageSize ?? 20) || items.length;
  const totalPages =
    Number(data.totalPages ?? data.TotalPages ?? 0) ||
    Math.max(1, Math.ceil(totalCount / (pageSize || 1)));
  return { items, totalCount, pageNumber, pageSize, totalPages };
}

export const pdfReportTemplateApi = {
  getFields: async (ruleType: DocumentRuleType | number): Promise<ReportTemplateFieldsDto> => {
    const response = await api.get<unknown>(`${BASE}/fields/${ruleType}`);
    return unwrapApiResponse<ReportTemplateFieldsDto>(response);
  },

  getList: async (
    params?: PdfReportTemplateListParams
  ): Promise<PdfReportTemplateListResult> => {
    const response = await api.get<unknown>(BASE, {
          params: params
            ? {
                pageNumber: params.pageNumber,
                pageSize: params.pageSize,
                search: params.search,
                sortBy: params.sortBy,
                sortDirection: params.sortDirection,
                ruleType: params.ruleType,
                isActive: params.isActive,
              }
            : undefined,
        });
    if (!isApiSuccess(response)) {
      const r = response as Record<string, unknown>;
      throw new Error((r.message ?? r.Message ?? 'Şablon listesi yüklenemedi') as string);
    }
    return parseListResult(response);
  },

  getById: async (id: number): Promise<ReportTemplateGetDto> => {
    const response = await api.get<unknown>(`${BASE}/${id}`);
    if (!isApiSuccess(response)) {
      const r = response as Record<string, unknown>;
      throw new Error((r.message ?? r.Message ?? 'Şablon yüklenemedi') as string);
    }
    const raw = getApiData<ReportTemplateGetDto>(response);
    if (raw == null) throw new Error('Şablon yüklenemedi');
    return normalizeTemplateItem(raw);
  },

  create: async (data: ReportTemplateCreateDto): Promise<ReportTemplateGetDto> => {
    const response = await api.post<unknown>(BASE, data);
    return unwrapApiResponse<ReportTemplateGetDto>(response);
  },

  update: async (id: number, data: ReportTemplateUpdateDto): Promise<ReportTemplateGetDto> => {
    const response = await api.put<unknown>(`${BASE}/${id}`, data);
    return unwrapApiResponse<ReportTemplateGetDto>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<unknown>(`${BASE}/${id}`);
    if (!isApiSuccess(response)) {
      const r = response as Record<string, unknown>;
      throw new Error((r.message ?? r.Message ?? 'Şablon silinemedi') as string);
    }
  },

  generateDocument: async (templateId: number, entityId: number): Promise<Blob> => {
    const blob = await api.post<Blob>(
      `${BASE}/generate-document`,
      { templateId, entityId },
      { responseType: 'blob' }
    );
    if (blob instanceof Blob) return blob;
    throw new Error('PDF yanıtı geçersiz');
  },

  getPresetList: async (params?: PdfTablePresetListParams): Promise<PdfTablePresetListResult> => {
    const response = await api.get<unknown>(PRESET_BASE, { params });
    if (!isApiSuccess(response)) {
      const r = response as Record<string, unknown>;
      throw new Error((r.message ?? r.Message ?? 'Preset listesi yüklenemedi') as string);
    }
    return parsePresetListResult(response);
  },

  createPreset: async (data: PdfTablePresetCreateDto): Promise<PdfTablePresetDto> => {
    const response = await api.post<unknown>(PRESET_BASE, data);
    return unwrapApiResponse<PdfTablePresetDto>(response);
  },

  uploadAsset: async (file: File, templateId?: number): Promise<PdfTemplateAssetDto> => {
    const formData = new FormData();
    formData.append('file', file);
    if (typeof templateId === 'number' && Number.isFinite(templateId) && templateId > 0) {
      formData.append('templateId', String(templateId));
    }

    const response = await api.post<unknown>(`${BASE}/assets/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapApiResponse<PdfTemplateAssetDto>(response);
  },

  updatePreset: async (id: number, data: PdfTablePresetUpdateDto): Promise<PdfTablePresetDto> => {
    const response = await api.put<unknown>(`${PRESET_BASE}/${id}`, data);
    return unwrapApiResponse<PdfTablePresetDto>(response);
  },

  deletePreset: async (id: number): Promise<void> => {
    const response = await api.delete<unknown>(`${PRESET_BASE}/${id}`);
    if (!isApiSuccess(response)) {
      const r = response as Record<string, unknown>;
      throw new Error((r.message ?? r.Message ?? 'Preset silinemedi') as string);
    }
  },
};
