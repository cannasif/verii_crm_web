import type { PagedFilter } from '@/types/api';
import { pricingRuleApi } from '../api/pricing-rule-api';
import type { PricingRuleHeaderGetDto, PricingRuleType } from '../types/pricing-rule-types';

function isRuleEffectiveOn(h: PricingRuleHeaderGetDto, asOf: Date): boolean {
  const from = new Date(h.validFrom);
  const to = new Date(h.validTo);
  return from <= asOf && to >= asOf;
}

function isGlobalCustomerHeader(h: PricingRuleHeaderGetDto): boolean {
  const id = h.customerId;
  const erp = h.erpCustomerCode != null ? String(h.erpCustomerCode).trim() : '';
  return (id == null || id === 0) && erp === '';
}

function headerMatchesCustomer(
  h: PricingRuleHeaderGetDto,
  customerId?: number | null,
  erpCustomerCode?: string | null,
): boolean {
  const hasId = customerId != null && customerId > 0;
  const erpTrim = erpCustomerCode != null ? String(erpCustomerCode).trim() : '';
  const hasErp = erpTrim !== '';
  if (!hasId && !hasErp) {
    return true;
  }
  if (isGlobalCustomerHeader(h)) {
    return true;
  }
  if (hasId && h.customerId === customerId) {
    return true;
  }
  if (hasErp) {
    const he = h.erpCustomerCode != null ? String(h.erpCustomerCode).trim() : '';
    if (he !== '' && he === erpTrim) {
      return true;
    }
  }
  return false;
}

async function fetchAllPricingRuleHeaderPages(filters: PagedFilter[]): Promise<PricingRuleHeaderGetDto[]> {
  const pageSize = 100;
  const acc: PricingRuleHeaderGetDto[] = [];
  let pageNumber = 1;
  for (;;) {
    const res = await pricingRuleApi.getHeaders({
      pageNumber,
      pageSize,
      sortBy: 'Id',
      sortDirection: 'desc',
      filters,
    });
    acc.push(...res.data);
    if (!res.hasNextPage || res.data.length === 0) {
      break;
    }
    pageNumber += 1;
    if (pageNumber > 200) {
      break;
    }
  }
  return acc;
}

export interface PricingRuleCampaignLineDisplay {
  fixedUnitPrice: number | null;
  currencyCode: string;
  discountRate1: number;
  discountRate2: number;
  discountRate3: number;
  discountAmount1: number;
  discountAmount2: number;
  discountAmount3: number;
}

function lineToDisplay(line: {
  fixedUnitPrice?: number | null;
  currencyCode: string;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
}): PricingRuleCampaignLineDisplay {
  return {
    fixedUnitPrice: line.fixedUnitPrice ?? null,
    currencyCode: String(line.currencyCode ?? ''),
    discountRate1: line.discountRate1,
    discountRate2: line.discountRate2,
    discountRate3: line.discountRate3,
    discountAmount1: line.discountAmount1,
    discountAmount2: line.discountAmount2,
    discountAmount3: line.discountAmount3,
  };
}

export async function fetchPricingRuleCampaignStockData(params: {
  ruleType: PricingRuleType;
  asOf?: Date;
  customerId?: number | null;
  erpCustomerCode?: string | null;
}): Promise<{
  orderedCodes: string[];
  pricingByCodeLower: Record<string, PricingRuleCampaignLineDisplay>;
}> {
  const asOf = params.asOf ?? new Date();
  const filters: PagedFilter[] = [
    { column: 'RuleType', operator: 'eq', value: String(params.ruleType) },
    { column: 'IsActive', operator: 'eq', value: 'true' },
  ];
  let headers = await fetchAllPricingRuleHeaderPages(filters);
  if (headers.length === 0) {
    const loose = await fetchAllPricingRuleHeaderPages([]);
    headers = loose.filter((h) => h.ruleType === params.ruleType && h.isActive);
  }
  const scoped = headers.filter(
    (h) => isRuleEffectiveOn(h, asOf) && headerMatchesCustomer(h, params.customerId, params.erpCustomerCode),
  );
  const codesOrdered: string[] = [];
  const seen = new Set<string>();
  const pricingByCodeLower: Record<string, PricingRuleCampaignLineDisplay> = {};
  for (const header of scoped) {
    const lines = await pricingRuleApi.getLinesByHeaderId(header.id);
    for (const line of lines) {
      const raw = line.stokCode?.trim();
      if (!raw) {
        continue;
      }
      const lower = raw.toLowerCase();
      if (seen.has(lower)) {
        continue;
      }
      seen.add(lower);
      codesOrdered.push(raw);
      pricingByCodeLower[lower] = lineToDisplay(line);
    }
  }
  return { orderedCodes: codesOrdered, pricingByCodeLower };
}

export async function fetchPricingRuleCampaignStockCodes(params: {
  ruleType: PricingRuleType;
  asOf?: Date;
  customerId?: number | null;
  erpCustomerCode?: string | null;
}): Promise<string[]> {
  const { orderedCodes } = await fetchPricingRuleCampaignStockData(params);
  return orderedCodes;
}
