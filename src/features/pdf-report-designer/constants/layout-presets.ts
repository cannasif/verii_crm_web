import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';

export const PDF_LAYOUT_PRESET = {
  Custom: 'custom',
} as const;

export type PdfLayoutPresetValue = (typeof PDF_LAYOUT_PRESET)[keyof typeof PDF_LAYOUT_PRESET];

export interface PdfLayoutPresetDefinition {
  value: PdfLayoutPresetValue;
  titleKey: string;
  descriptionKey: string;
  supportedRuleTypes: PricingRuleType[];
  locksCanvas: boolean;
}

export const PDF_LAYOUT_PRESETS: PdfLayoutPresetDefinition[] = [
  {
    value: PDF_LAYOUT_PRESET.Custom,
    titleKey: 'pdfReportDesigner.layoutPreset.customTitle',
    descriptionKey: 'pdfReportDesigner.layoutPreset.customDescription',
    supportedRuleTypes: [
      PricingRuleType.Demand,
      PricingRuleType.Quotation,
      PricingRuleType.Order,
    ],
    locksCanvas: false,
  },
];

export function getAvailableLayoutPresets(ruleType: PricingRuleType): PdfLayoutPresetDefinition[] {
  return PDF_LAYOUT_PRESETS.filter((preset) => preset.supportedRuleTypes.includes(ruleType));
}

export function normalizeLayoutPreset(
  value: string | null | undefined,
  ruleType: PricingRuleType
): PdfLayoutPresetValue {
  const available = getAvailableLayoutPresets(ruleType);
  const matched = available.find((preset) => preset.value === value);
  return matched?.value ?? PDF_LAYOUT_PRESET.Custom;
}

export function getLayoutPresetDefinition(
  value: string | null | undefined
): PdfLayoutPresetDefinition | undefined {
  return PDF_LAYOUT_PRESETS.find((preset) => preset.value === value);
}
