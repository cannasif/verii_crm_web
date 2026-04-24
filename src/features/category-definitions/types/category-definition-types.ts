import type { PagedResponse } from '@/types/api';

export interface ProductCatalogDto {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  catalogType: number;
  branchCode?: number | null;
  sortOrder: number;
}

export interface ProductCatalogCreateDto {
  name: string;
  code: string;
  description?: string | null;
  catalogType: number;
  branchCode?: number | null;
  sortOrder: number;
}

export interface ProductCatalogUpdateDto extends ProductCatalogCreateDto {}

export interface CatalogCategoryNodeDto {
  catalogCategoryId: number;
  categoryId: number;
  parentCatalogCategoryId?: number | null;
  name: string;
  code: string;
  description?: string | null;
  level: number;
  fullPath?: string | null;
  isLeaf: boolean;
  hasChildren: boolean;
  sortOrder: number;
  visualPreset: number;
  imageUrl?: string | null;
  iconName?: string | null;
  colorHex?: string | null;
}

export interface CatalogCategoryCreateDto {
  parentCatalogCategoryId?: number | null;
  name: string;
  code: string;
  description?: string | null;
  sortOrder: number;
  isLeaf: boolean;
  visualPreset: number;
  imageUrl?: string | null;
}

export interface CatalogCategoryUpdateDto extends Omit<CatalogCategoryCreateDto, 'parentCatalogCategoryId'> {}

export interface CatalogCategoryReorderDto {
  parentCatalogCategoryId?: number | null;
  orderedCatalogCategoryIds: number[];
}

export interface CatalogStockItemDto {
  id: number;
  stockCategoryId: number;
  stockId: number;
  erpStockCode: string;
  stockName: string;
  unit?: string | null;
  grupKodu?: string | null;
  grupAdi?: string | null;
  kod1?: string | null;
  kod1Adi?: string | null;
  kod2?: string | null;
  kod2Adi?: string | null;
  kod3?: string | null;
  kod3Adi?: string | null;
  isPrimaryCategory: boolean;
  imageUrl?: string | null;
}

export type CatalogStockListResponse = PagedResponse<CatalogStockItemDto>;

export interface StockCategoryCreateDto {
  stockId: number;
  isPrimary: boolean;
  sortOrder: number;
  note?: string | null;
}

export interface ProductCategoryRuleDto {
  id: number;
  categoryId: number;
  ruleName: string;
  ruleCode?: string | null;
  stockAttributeType: number;
  operatorType: number;
  value: string;
  priority: number;
}

export interface ProductCategoryRuleCreateDto {
  ruleName: string;
  ruleCode?: string | null;
  stockAttributeType: number;
  operatorType: number;
  value: string;
  priority: number;
}

export interface ProductCategoryRuleUpdateDto extends ProductCategoryRuleCreateDto {}

export interface CategoryRuleValueOptionDto {
  value: string;
  usageCount: number;
}

export interface CategoryRuleApplyResultDto {
  matchedStockCount: number;
  createdAssignmentCount: number;
  updatedAssignmentCount: number;
  skippedManualAssignmentCount: number;
}

export interface CategoryRulePreviewItemDto {
  stockId: number;
  erpStockCode: string;
  stockName: string;
  existingStockCategoryId?: number | null;
  matchedRuleName: string;
  matchedRuleCode?: string | null;
  priority: number;
  actionType: number;
}

export interface CategoryRulePreviewResultDto extends CategoryRuleApplyResultDto {
  previewItems: CategoryRulePreviewItemDto[];
}
