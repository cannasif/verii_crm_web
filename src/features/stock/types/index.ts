export interface StockGetDto {
  id: number;
  erpStockCode: string;
  stockName: string;
  unit?: string;
  balance?: number | null;
  balanceText?: string | null;
  ureticiKodu?: string;
  grupKodu?: string;
  grupAdi?: string;
  kod1?: string;
  kod1Adi?: string;
  kod2?: string;
  kod2Adi?: string;
  kod3?: string;
  kod3Adi?: string;
  kod4?: string;
  kod4Adi?: string;
  kod5?: string;
  kod5Adi?: string;
  branchCode: number;
  stockDetail?: StockDetailGetDto;
  stockImages?: StockImageDto[];
  parentRelations?: StockRelationDto[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface StockDetailGetDto {
  id: number;
  stockId: number;
  stockName?: string;
  htmlDescription: string;
  technicalSpecsJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockDetailCreateDto {
  stockId: number;
  htmlDescription: string;
  technicalSpecsJson?: string;
}

export interface StockDetailUpdateDto {
  stockId: number;
  htmlDescription: string;
  technicalSpecsJson?: string;
}

export interface StockImageDto {
  id: number;
  stockId: number;
  stockName?: string;
  filePath: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockRelationDto {
  id: number;
  stockId: number;
  stockName?: string;
  relatedStockId: number;
  relatedStockCode?: string;
  relatedStockName?: string;
  quantity: number;
  description?: string;
  isMandatory: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockRelationCreateDto {
  stockId: number;
  relatedStockId: number;
  quantity: number;
  description?: string;
  isMandatory?: boolean;
}

export interface StockRelationUpdateDto {
  stockId: number;
  relatedStockId: number;
  quantity: number;
  description?: string;
  isMandatory: boolean;
}

export interface StockCreateDto {
  erpStockCode: string;
  stockName: string;
  unit?: string;
  ureticiKodu?: string;
  grupKodu?: string;
  grupAdi?: string;
  kod1?: string;
  kod1Adi?: string;
  kod2?: string;
  kod2Adi?: string;
  kod3?: string;
  kod3Adi?: string;
  kod4?: string;
  kod4Adi?: string;
  kod5?: string;
  kod5Adi?: string;
  branchCode: number;
}

export interface StockUpdateDto {
  erpStockCode: string;
  stockName: string;
  unit?: string;
  ureticiKodu?: string;
  grupKodu?: string;
  grupAdi?: string;
  kod1?: string;
  kod1Adi?: string;
  kod2?: string;
  kod2Adi?: string;
  kod3?: string;
  kod3Adi?: string;
  kod4?: string;
  kod4Adi?: string;
  kod5?: string;
  kod5Adi?: string;
  branchCode: number;
}

export interface StockGetWithMainImageDto extends StockGetDto {
  mainImage?: StockImageDto;
}
