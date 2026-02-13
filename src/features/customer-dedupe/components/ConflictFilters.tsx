import { type ReactElement } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

export const MATCH_TYPE_ALL = '';
export const MATCH_TYPE_ALL_SELECT_VALUE = '__all__';
export const MATCH_TYPES = ['TaxNumber', 'TcknNumber', 'CustomerCode'] as const;
export const MIN_SCORE_OPTIONS = [0.7, 0.8, 0.9, 0.95] as const;

export interface ConflictFiltersState {
  search: string;
  matchType: string;
  minScore: number;
}

export interface ConflictFiltersProps {
  value: ConflictFiltersState;
  onChange: (value: ConflictFiltersState) => void;
}

export function ConflictFilters({ value, onChange }: ConflictFiltersProps): ReactElement {
  const { t } = useTranslation(['customerDedupe', 'common']);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder={t('customerDedupe:searchPlaceholder')}
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="max-w-xs"
      />
      <Select
        value={value.matchType || MATCH_TYPE_ALL_SELECT_VALUE}
        onValueChange={(v) => onChange({ ...value, matchType: v === MATCH_TYPE_ALL_SELECT_VALUE ? MATCH_TYPE_ALL : v })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('customerDedupe:matchType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={MATCH_TYPE_ALL_SELECT_VALUE}>{t('customerDedupe:all')}</SelectItem>
          {MATCH_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {t(`customerDedupe:${type}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(value.minScore)}
        onValueChange={(v) => onChange({ ...value, minScore: Number(v) })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('customerDedupe:minScore')} />
        </SelectTrigger>
        <SelectContent>
          {MIN_SCORE_OPTIONS.map((score) => (
            <SelectItem key={score} value={String(score)}>
              {(score * 100).toFixed(0)}%
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
