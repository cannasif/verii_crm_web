import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Boxes, BrainCircuit, ShieldCheck } from 'lucide-react';
import type { AiAssistantCapabilitiesDto } from '../types/ai-assistant.types';

type Props = {
  capabilities?: AiAssistantCapabilitiesDto;
  compact?: boolean;
};

export function AiAssistantCapabilityStrip({ capabilities, compact = false }: Props): ReactElement | null {
  const { t } = useTranslation('ai-assistant');
  if (!capabilities) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'px-3 py-2' : 'px-4 py-2.5'} border-b border-slate-200 bg-slate-50/75 dark:border-white/10 dark:bg-white/[0.025]`}>
      <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/15 bg-primary/5 px-2 py-1 font-mono text-[0.6rem] font-black uppercase text-primary">
        <BrainCircuit size={12} /> {capabilities.routingMode}
      </span>
      {capabilities.canRunCompoundQueries ? (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[0.62rem] font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
          <Boxes size={12} /> {t('capabilities.compound', { count: capabilities.maximumQueriesPerMessage })}
        </span>
      ) : null}
      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[0.62rem] font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
        <ShieldCheck size={12} className="shrink-0 text-emerald-500" />
        <span className="truncate">{t('capabilities.scoped')}</span>
      </span>
      {!compact ? (
        <span className="ms-auto font-mono text-[0.58rem] font-bold uppercase text-slate-400">
          {t('capabilities.tools', { count: capabilities.readOnlyToolCount })} · v{capabilities.assistantVersion}
        </span>
      ) : null}
    </div>
  );
}
