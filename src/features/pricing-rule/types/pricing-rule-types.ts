import { z } from 'zod';

export const PricingRuleType = {
  Demand: 1,
  Quotation: 2,
  Order: 3,
} as const;

export type PricingRuleType = (typeof PricingRuleType)[keyof typeof PricingRuleType];

// Zod Schemas
export const pricingRuleLineSchema = z.object({
  id: z.string().optional(),
  stokCode: z.string().min(1, 'Stok kodu zorunludur'),
  minQuantity: z.number().min(0, 'Min miktar 0 dan küçük olamaz'),
  maxQuantity: z.number().nullable().optional(),
  fixedUnitPrice: z.number().nullable().optional(),
  currencyCode: z.union([z.string(), z.number()]).optional(),
  discountRate1: z.number(),
  discountAmount1: z.number(),
  discountRate2: z.number(),
  discountAmount2: z.number(),
  discountRate3: z.number(),
  discountAmount3: z.number(),
  isEditing: z.boolean().optional(),
});

export const pricingRuleSalesmanSchema = z.object({
  id: z.string().optional(),
  salesmanId: z.number().min(1, 'Satışçı seçimi zorunludur'),
});

export const pricingRuleHeaderSchema = z.object({
  ruleType: z.nativeEnum(PricingRuleType),
  ruleCode: z.string().min(1, 'Kural kodu zorunludur').max(50, 'Kural kodu en fazla 50 karakter olabilir'),
  ruleName: z.string().min(1, 'Kural adı zorunludur').max(250, 'Kural adı en fazla 250 karakter olabilir'),
  validFrom: z.string().min(1, 'Geçerlilik başlangıç tarihi zorunludur'),
  validTo: z.string().min(1, 'Geçerlilik bitiş tarihi zorunludur'),
  customerId: z.number().nullable().optional(),
  erpCustomerCode: z.string().nullable().optional(),
  branchCode: z.number().nullable().optional(),
  priceIncludesVat: z.boolean(),
  isActive: z.boolean(),
  lines: z.array(pricingRuleLineSchema).optional(),
  salesmen: z.array(pricingRuleSalesmanSchema).optional(),
}).refine((data) => {
  if (!data.customerId && !data.erpCustomerCode) {
    return true; // Optional customer
  }
  return true;
}, {
  message: "Müşteri veya ERP Müşteri Kodu seçilmelidir",
  path: ["customerId"],
});

export type PricingRuleFormSchema = z.infer<typeof pricingRuleHeaderSchema>;

export interface PricingRuleHeaderGetDto {
  id: number;
  ruleType: PricingRuleType;
  ruleCode: string;
  ruleName: string;
  validFrom: string;
  validTo: string;
  customerId?: number | null;
  customerName?: string | null;
  erpCustomerCode?: string | null;
  branchCode?: number | null;
  priceIncludesVat: boolean;
  isActive: boolean;
  lines?: PricingRuleLineGetDto[] | null;
  salesmen?: PricingRuleSalesmanGetDto[] | null;
  createdAt: string;
  updatedAt?: string | null;
  createdByFullUser?: string | null;
  updatedByFullUser?: string | null;
}

export interface PricingRuleHeaderCreateDto {
  ruleType: PricingRuleType;
  ruleCode: string;
  ruleName: string;
  validFrom: string;
  validTo: string;
  customerId?: number | null;
  erpCustomerCode?: string | null;
  branchCode?: number | null;
  priceIncludesVat: boolean;
  isActive: boolean;
  lines?: PricingRuleLineCreateDto[] | null;
  salesmen?: PricingRuleSalesmanCreateDto[] | null;
}

export interface PricingRuleHeaderUpdateDto {
  ruleType: PricingRuleType;
  ruleCode: string;
  ruleName: string;
  validFrom: string;
  validTo: string;
  customerId?: number | null;
  erpCustomerCode?: string | null;
  branchCode?: number | null;
  priceIncludesVat: boolean;
  isActive: boolean;
  lines?: PricingRuleLineUpdateDto[] | null;
  salesmen?: PricingRuleSalesmanUpdateDto[] | null;
}

export interface PricingRuleLineGetDto {
  id: number;
  pricingRuleHeaderId: number;
  stokCode: string;
  minQuantity: number;
  maxQuantity?: number | null;
  fixedUnitPrice?: number | null;
  currencyCode: string;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
  createdAt: string;
  updatedAt?: string | null;
}

export interface PricingRuleLineCreateDto {
  pricingRuleHeaderId: number;
  stokCode: string;
  minQuantity: number;
  maxQuantity?: number | null;
  fixedUnitPrice?: number | null;
  currencyCode: string;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
}

export interface PricingRuleLineUpdateDto {
  pricingRuleHeaderId: number;
  stokCode: string;
  minQuantity: number;
  maxQuantity?: number | null;
  fixedUnitPrice?: number | null;
  currencyCode: string;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
}

export interface PricingRuleSalesmanGetDto {
  id: number;
  pricingRuleHeaderId: number;
  salesmanId: number;
  salesmanFullName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface PricingRuleSalesmanCreateDto {
  pricingRuleHeaderId: number;
  salesmanId: number;
}

export interface PricingRuleSalesmanUpdateDto {
  pricingRuleHeaderId: number;
  salesmanId: number;
}

export interface PricingRuleLineFormState extends Omit<PricingRuleLineCreateDto, 'pricingRuleHeaderId' | 'currencyCode'> {
  id: string;
  isEditing: boolean;
  currencyCode?: number | string;
}

export interface PricingRuleSalesmanFormState extends Omit<PricingRuleSalesmanCreateDto, 'pricingRuleHeaderId'> {
  id: string;
}

export interface PricingRuleFormState {
  header: PricingRuleHeaderCreateDto;
  lines: PricingRuleLineFormState[];
  salesmen: PricingRuleSalesmanFormState[];
  isSubmitting: boolean;
  errors: Record<string, string[]>;
}

export interface PricingRuleFilter {
  ruleType?: PricingRuleType;
  customerId?: number;
  isActive?: boolean;
  validFrom?: string;
  validTo?: string;
  search?: string;
}
