import i18next from 'i18next';
import type { Field } from '../types';
import type { ReportConfig } from '../types';

function getTypeString(field: Field): string {
  if (field.semanticType === 'boolean') return 'bool bit';
  if (field.semanticType === 'date') return 'datetime date';
  if (field.semanticType === 'number') return 'decimal int numeric';
  if (field.semanticType === 'text') return 'string varchar text';
  return ((field.dotNetType ?? '') + ' ' + (field.sqlType ?? '')).trim().toLowerCase();
}

const STRING_KEYWORDS = ['string', 'guid', 'nvarchar', 'varchar', 'char', 'nchar', 'text'];
const DATE_KEYWORDS = ['datetime', 'datetimeoffset', 'dateonly', 'date', 'time', 'timestamp'];
const NUMERIC_KEYWORDS = [
  'int32', 'int64', 'int16', 'int', 'integer', 'bigint', 'smallint', 'tinyint', 'byte',
  'decimal', 'numeric', 'double', 'single', 'float', 'real', 'number', 'long', 'short',
];

export function isAxisCompatible(field: Field): boolean {
  const t = getTypeString(field);
  return STRING_KEYWORDS.some((s) => t.includes(s)) || DATE_KEYWORDS.some((s) => t.includes(s));
}

export function isValuesCompatible(field: Field): boolean {
  const t = getTypeString(field);
  return NUMERIC_KEYWORDS.some((s) => t.includes(s));
}

export function isLegendCompatible(field: Field): boolean {
  const t = getTypeString(field);
  return STRING_KEYWORDS.some((s) => t.includes(s));
}

export function getOperatorsForField(field: Field): string[] {
  const t = getTypeString(field);
  if (DATE_KEYWORDS.some((d) => t.includes(d))) {
    return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'];
  }
  if (NUMERIC_KEYWORDS.some((n) => t.includes(n))) {
    return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'];
  }
  return ['eq', 'ne', 'contains', 'startsWith', 'endsWith', 'in', 'isNull', 'isNotNull'];
}

export function getFieldSemanticType(field: Field): 'date' | 'number' | 'text' | 'boolean' | 'other' {
  const t = getTypeString(field);
  if (t.includes('bool') || t.includes('bit')) return 'boolean';
  if (DATE_KEYWORDS.some((d) => t.includes(d))) return 'date';
  if (NUMERIC_KEYWORDS.some((n) => t.includes(n))) return 'number';
  if (STRING_KEYWORDS.some((s) => t.includes(s))) return 'text';
  return 'other';
}

export function getFieldSemanticLabel(field: Field): string {
  if (field.semanticType === 'date') return i18next.t('common.reportBuilder.semanticTypes.date');
  if (field.semanticType === 'number') return i18next.t('common.reportBuilder.semanticTypes.number');
  if (field.semanticType === 'boolean') return i18next.t('common.reportBuilder.semanticTypes.boolean');
  if (field.semanticType === 'text') return i18next.t('common.reportBuilder.semanticTypes.text');
  const semanticType = getFieldSemanticType(field);
  if (semanticType === 'date') return i18next.t('common.reportBuilder.semanticTypes.date');
  if (semanticType === 'number') return i18next.t('common.reportBuilder.semanticTypes.number');
  if (semanticType === 'boolean') return i18next.t('common.reportBuilder.semanticTypes.boolean');
  if (semanticType === 'text') return i18next.t('common.reportBuilder.semanticTypes.text');
  return i18next.t('common.reportBuilder.field');
}

export function validatePieConfig(config: ReportConfig): string | null {
  const hasAxis = !!config.axis?.field;
  const hasLegend = !!config.legend?.field;
  if (!hasAxis && !hasLegend) return i18next.t('common.reportBuilder.validation.pieRequiresAxisOrLegend');
  if (config.values.length === 0) return i18next.t('common.reportBuilder.validation.pieRequiresSingleNumericValue');
  if (config.values.length > 1) return i18next.t('common.reportBuilder.validation.pieShouldHaveSingleValue');
  return null;
}

export function validateKpiConfig(config: ReportConfig): string | null {
  if (config.values.length === 0) return i18next.t('common.reportBuilder.validation.kpiRequiresNumericValue');
  return null;
}

export function validateMatrixConfig(config: ReportConfig): string | null {
  if (!config.axis?.field) return i18next.t('common.reportBuilder.validation.matrixRequiresAxis');
  if (!config.legend?.field) return i18next.t('common.reportBuilder.validation.matrixRequiresLegend');
  if (config.values.length === 0) return i18next.t('common.reportBuilder.validation.matrixRequiresNumericValue');
  return null;
}
