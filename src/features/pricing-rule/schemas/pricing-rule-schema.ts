import { z } from 'zod';
import { areDiscountRatesValid } from '@/lib/discount-rate-validation';
import { PricingRuleType } from '../types/pricing-rule-types';

const SUPPORTED_PRICING_RULE_TYPES = [
  PricingRuleType.Demand,
  PricingRuleType.Quotation,
  PricingRuleType.Order,
] as const;

export const pricingRuleHeaderSchema = z
  .object({
    ruleType: z.number().refine((val) => SUPPORTED_PRICING_RULE_TYPES.some((type) => type === val), {
      message: 'validation.required',
    }),
    ruleCode: z
      .string()
      .min(1, 'validation.required')
      .max(50, { message: 'validation.maxLength' }),
    ruleName: z
      .string()
      .min(1, 'validation.required')
      .max(250, { message: 'validation.maxLength' }),
    validFrom: z.string().min(1, 'validation.required'),
    validTo: z.string().min(1, 'validation.required'),
    customerId: z.number().nullable().optional(),
    erpCustomerCode: z.string().max(50).nullable().optional(),
    branchCode: z.number().nullable().optional(),
    priceIncludesVat: z.boolean(),
    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      const from = new Date(data.validFrom);
      const to = new Date(data.validTo);
      return to >= from;
    },
    {
      message: 'pricingRule.header.validToMustBeAfterValidFrom',
      path: ['validTo'],
    }
  );

export const pricingRuleLineSchema = z
  .object({
    stokCode: z
      .string()
      .min(1, 'validation.required')
      .max(50, { message: 'validation.maxLength' })
      .refine((val) => val.trim().length > 0, {
        message: 'validation.required',
      }),
    minQuantity: z
      .number({ message: 'validation.required' })
      .min(0, 'pricingRule.lines.minQuantityMin')
      .max(999999999, 'pricingRule.lines.minQuantityMax'),
    maxQuantity: z
      .number({ message: 'pricingRule.lines.maxQuantityRequired' })
      .min(0.01, 'pricingRule.lines.maxQuantityRequired')
      .max(999999999)
      .nullable()
      .optional(),
    fixedUnitPrice: z
      .number({ message: 'pricingRule.lines.fixedUnitPriceRequired' })
      .min(0.01, 'pricingRule.lines.fixedUnitPriceRequired')
      .max(999999999)
      .nullable()
      .optional(),
    currencyCode: z
      .union([z.string(), z.number()])
      .refine((val) => {
        if (typeof val === 'number') return val >= 0;
        if (typeof val === 'string') return val.trim().length > 0;
        return false;
      }, {
        message: 'pricingRule.lines.currencyCodeRequired',
      })
      .transform((val) => typeof val === 'number' ? String(val) : val),
    discountRate1: z.number().min(0).max(100).default(0),
    discountAmount1: z.number().min(0).default(0),
    discountRate2: z.number().min(0).max(100).default(0),
    discountAmount2: z.number().min(0).default(0),
    discountRate3: z.number().min(0).max(100).default(0),
    discountAmount3: z.number().min(0).default(0),
  })
  .refine(
    (data) => {
      if (data.maxQuantity != null && data.maxQuantity <= data.minQuantity) {
        return false;
      }
      return true;
    },
    {
      message: 'pricingRule.lines.maxQuantityMustBeGreaterThanMin',
      path: ['maxQuantity'],
    }
  )
  .refine(
    (data) =>
      areDiscountRatesValid({
        discountRate1: data.discountRate1,
        discountRate2: data.discountRate2,
        discountRate3: data.discountRate3,
      }),
    {
      message: 'Kademeli iskonto efektif %100 değerine ulaşamaz',
      path: ['discountRate3'],
    }
  );

export const pricingRuleSalesmanSchema = z.object({
  salesmanId: z.number().min(1, 'validation.required'),
});

export const pricingRuleBulkCreateSchema = z.object({
  header: pricingRuleHeaderSchema,
  lines: z.array(pricingRuleLineSchema).min(1, 'pricingRule.lines.required').optional(),
  salesmen: z.array(pricingRuleSalesmanSchema).optional(),
});

export type PricingRuleHeaderSchema = z.infer<typeof pricingRuleHeaderSchema>;
export type PricingRuleLineSchema = z.infer<typeof pricingRuleLineSchema>;
export type PricingRuleSalesmanSchema = z.infer<typeof pricingRuleSalesmanSchema>;
export type PricingRuleBulkCreateSchema = z.infer<typeof pricingRuleBulkCreateSchema>;
