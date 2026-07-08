import { CheckCircle2, History, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  CustomerDocumentSerialSuggestionDto,
  DocumentSerialTypeGetDto,
} from '../types/document-serial-type-types';

interface CustomerDocumentSerialSuggestionCardProps {
  suggestion?: CustomerDocumentSerialSuggestionDto | null;
  serialType?: DocumentSerialTypeGetDto;
  isLoading?: boolean;
  isApplied?: boolean;
  disabled?: boolean;
  onApply: () => void;
}

export function CustomerDocumentSerialSuggestionCard({
  suggestion,
  serialType,
  isLoading = false,
  isApplied = false,
  disabled = false,
  onApply,
}: CustomerDocumentSerialSuggestionCardProps) {
  const { t } = useTranslation('common');

  if (isLoading) {
    return (
      <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>{t('documentSerialSuggestion.loading', { defaultValue: 'Cari geçmişinden seri önerisi kontrol ediliyor...' })}</span>
        </div>
      </div>
    );
  }

  if (!suggestion || !serialType) return null;

  const prefix = serialType.serialPrefix || suggestion.serialPrefix || suggestion.serialPrefixSnapshot || String(serialType.id);

  return (
    <div
      className={cn(
        'mt-2 rounded-lg border px-3 py-2 text-xs shadow-sm transition-colors',
        isApplied
          ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
          : 'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            {isApplied ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <History className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">
              {isApplied
                ? t('documentSerialSuggestion.appliedTitle', { defaultValue: 'Önerilen seri seçili' })
                : t('documentSerialSuggestion.title', { defaultValue: 'Cari geçmişinden önerilen seri' })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] opacity-90">
            <span className="rounded-md bg-white/70 px-1.5 py-0.5 font-bold text-slate-900 dark:bg-white/10 dark:text-white">{prefix}</span>
            <span>
              {t('documentSerialSuggestion.usageCount', {
                defaultValue: '{{count}} kez kullanıldı',
                count: suggestion.usageCount,
              })}
            </span>
            {suggestion.lastDocumentNo && (
              <span className="truncate">
                {t('documentSerialSuggestion.lastDocument', {
                  defaultValue: 'Son belge: {{documentNo}}',
                  documentNo: suggestion.lastDocumentNo,
                })}
              </span>
            )}
          </div>
        </div>

        {!isApplied && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 rounded-md px-2 text-[11px] font-bold"
            disabled={disabled}
            onClick={onApply}
          >
            {t('documentSerialSuggestion.apply', { defaultValue: 'Uygula' })}
          </Button>
        )}
      </div>
    </div>
  );
}
