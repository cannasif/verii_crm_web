import type { TFunction } from 'i18next';
import type { SystemSettingsDto } from '@/features/system-settings';

export type CatalogFieldKey = 'grupKodu' | 'kod1' | 'kod2' | 'kod3' | 'kod4' | 'kod5';

const SETTINGS_KEY_BY_FIELD: Record<CatalogFieldKey, keyof SystemSettingsDto> = {
  grupKodu: 'catalogGroupCodeLabel',
  kod1: 'catalogCode1Label',
  kod2: 'catalogCode2Label',
  kod3: 'catalogCode3Label',
  kod4: 'catalogCode4Label',
  kod5: 'catalogCode5Label',
};

const TRANSLATION_KEY_BY_FIELD: Record<CatalogFieldKey, string> = {
  grupKodu: 'catalogStockPicker.specialCodesLevel.grupKodu',
  kod1: 'catalogStockPicker.specialCodesLevel.kod1',
  kod2: 'catalogStockPicker.specialCodesLevel.kod2',
  kod3: 'catalogStockPicker.specialCodesLevel.kod3',
  kod4: 'catalogStockPicker.specialCodesLevel.kod4',
  kod5: 'catalogStockPicker.specialCodesLevel.kod5',
};

const FALLBACK_LABEL_BY_FIELD: Record<CatalogFieldKey, string> = {
  grupKodu: 'Grup Kodu',
  kod1: 'Kod1',
  kod2: 'Kod2',
  kod3: 'Kod3',
  kod4: 'Kod4',
  kod5: 'Kod5',
};

export function getCatalogFieldLabel(
  settings: SystemSettingsDto | undefined,
  field: CatalogFieldKey,
  t?: TFunction,
): string {
  const settingsKey = SETTINGS_KEY_BY_FIELD[field];
  const configuredLabel = settings?.[settingsKey];

  if (typeof configuredLabel === 'string' && configuredLabel.trim()) {
    return configuredLabel.trim();
  }

  const fallback = FALLBACK_LABEL_BY_FIELD[field];
  return t ? t(TRANSLATION_KEY_BY_FIELD[field], { defaultValue: fallback }) : fallback;
}
