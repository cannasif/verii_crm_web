import type { TFunction } from 'i18next';
import type { RecommendedActionDto } from '../types/salesmen360.types';

export function recommendedActionCodeToKey(code: string): string {
  const trimmed = code.trim();
  if (/^[A-Z][A-Z0-9_]*$/u.test(trimmed)) {
    return trimmed;
  }
  return trimmed
    .replace(/\s+/gu, '_')
    .replace(/([A-Z])/gu, '_$1')
    .replace(/^_/, '')
    .replace(/_+/gu, '_')
    .toUpperCase();
}

export function translateRecommendedActionCopy(
  action: RecommendedActionDto,
  t: TFunction
): { title: string; reason: string } {
  const actionKey = recommendedActionCodeToKey(action.actionCode);
  const baseKey = `salesman360.actions.recommendedActions.${actionKey}`;
  const title = t(`${baseKey}.title`, { defaultValue: action.title });
  const defaultReason = action.reason ?? '-';

  switch (actionKey) {
    case 'INCREASE_ACTIVITY_CADENCE': {
      const match = /(\d+)/u.exec(defaultReason);
      const count = match ? Number(match[1]) : 0;
      return {
        title,
        reason: t(`${baseKey}.reason`, { count, defaultValue: defaultReason }),
      };
    }
    case 'CLEAN_OPEN_PIPELINE': {
      const match = /^(\d+)/u.exec(defaultReason.trim());
      const count = match ? Number(match[1]) : 0;
      return {
        title,
        reason: t(`${baseKey}.reason`, { count, defaultValue: defaultReason }),
      };
    }
    case 'REVIEW_LOST_QUOTATION_REASONS': {
      const match = /(\d+)\s*%/u.exec(defaultReason);
      const rate = match ? match[1] : '0';
      return {
        title,
        reason: t(`${baseKey}.reason`, { rate, defaultValue: defaultReason }),
      };
    }
    default:
      return {
        title,
        reason: t(`${baseKey}.reason`, { defaultValue: defaultReason }),
      };
  }
}
