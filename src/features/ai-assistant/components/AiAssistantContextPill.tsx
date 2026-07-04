import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, Image, MapPinned, TriangleAlert } from 'lucide-react';
import type { AiAssistantResponseContextDto } from '../types/ai-assistant.types';

type AiAssistantContextPillProps = {
  context?: AiAssistantResponseContextDto | null;
};

export function AiAssistantContextPill({ context }: AiAssistantContextPillProps): ReactElement | null {
  const { t } = useTranslation('ai-assistant');

  if (!context) {
    return null;
  }

  const contextLabel = context.routeTitle || context.module || context.currentPath;
  if (!contextLabel && !context.entityType && !context.hasErrorContext && context.attachmentCount <= 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
      {contextLabel && (
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-primary">
          <MapPinned size={12} className="shrink-0" />
          <span className="truncate">{contextLabel}</span>
        </span>
      )}
      {context.entityType && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 dark:border-white/10 dark:bg-white/[0.05]">
          {context.entityType}
          {context.entityId ? ` #${context.entityId}` : ''}
        </span>
      )}
      {context.hasPageFilters && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/40 bg-sky-400/10 px-2.5 py-1 text-sky-700 dark:text-sky-200">
          <Filter size={12} />
          {t('context.filtered', { defaultValue: 'Filtreli' })}
        </span>
      )}
      {context.hasErrorContext && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/10 px-2.5 py-1 text-amber-700 dark:text-amber-200">
          <TriangleAlert size={12} />
          {t('context.error', { defaultValue: 'Hata bağlamı' })}
        </span>
      )}
      {context.attachmentCount > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/40 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-700 dark:text-fuchsia-200">
          <Image size={12} />
          {t('context.attachments', {
            count: context.attachmentCount,
            defaultValue: '{{count}} görsel',
          })}
        </span>
      )}
    </div>
  );
}
