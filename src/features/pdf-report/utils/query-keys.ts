export const PDF_REPORT_TEMPLATE_KEYS = {
  LIST: 'pdf-report-template.list',
  ITEM: 'pdf-report-template.item',
  FIELDS: 'pdf-report-template.fields',
  PRESET_LIST: 'pdf-table-preset.list',
} as const;

export const pdfReportTemplateQueryKeys = {
  list: (params?: { pageNumber?: number; pageSize?: number; search?: string; sortBy?: string; sortDirection?: 'asc' | 'desc'; ruleType?: number; isActive?: boolean }) =>
    [PDF_REPORT_TEMPLATE_KEYS.LIST, params ?? {}] as const,
  item: (id: number) => [PDF_REPORT_TEMPLATE_KEYS.ITEM, id] as const,
  fields: (ruleType: number) => [PDF_REPORT_TEMPLATE_KEYS.FIELDS, ruleType] as const,
  presetList: (params?: { pageNumber?: number; pageSize?: number; search?: string; sortBy?: string; sortDirection?: 'asc' | 'desc'; ruleType?: number; isActive?: boolean }) =>
    [PDF_REPORT_TEMPLATE_KEYS.PRESET_LIST, params ?? {}] as const,
};
