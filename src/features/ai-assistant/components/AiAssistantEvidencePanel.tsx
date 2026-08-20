import { type ReactElement, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronDown, CircleAlert, Database, Route, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type {
  AiAssistantInterpretationDto,
  AiAssistantResponseContextDto,
  AiAssistantSourceDto,
  AiAssistantStructuredColumnDto,
  AiAssistantStructuredResultDto,
} from '../types/ai-assistant.types';

type Props = {
  intent?: string;
  context?: AiAssistantResponseContextDto | null;
  interpretations?: AiAssistantInterpretationDto[];
  result?: AiAssistantStructuredResultDto | null;
  sources?: AiAssistantSourceDto[];
  compact?: boolean;
};

const hasStructuredData = (result?: AiAssistantStructuredResultDto | null): boolean => Boolean(
  result && (result.rows.length > 0 || result.sections?.some((section) => hasStructuredData(section)))
);

const countStructuredRows = (result?: AiAssistantStructuredResultDto | null): number => {
  if (!result) return 0;
  return result.rows.length + (result.sections ?? []).reduce((total, section) => total + countStructuredRows(section), 0);
};

function renderValue(
  value: unknown,
  column: AiAssistantStructuredColumnDto,
  locale: string,
  emptyLabel: string
): ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-slate-400">{emptyLabel}</span>;

  if (typeof value === 'number') {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: column.dataType === 'currency' ? 2 : 4,
    }).format(value);
  }

  if (typeof value === 'boolean') return value ? '✓' : '—';

  if (column.dataType === 'date' && typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat(locale).format(date);
  }

  if (typeof value === 'string' && value.startsWith('/')) {
    return (
      <Link className="font-black text-primary underline-offset-2 hover:underline" to={value}>
        {value}
      </Link>
    );
  }

  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function StructuredResultSection({
  result,
  locale,
  emptyLabel,
  depth = 0,
}: {
  result: AiAssistantStructuredResultDto;
  locale: string;
  emptyLabel: string;
  depth?: number;
}): ReactElement {
  return (
    <section data-ai-structured-result={result.type} className={depth > 0 ? 'rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-black/10' : ''}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">{result.title}</h4>
        <span className="shrink-0 font-mono text-[0.62rem] font-bold uppercase text-slate-400">
          {result.rows.length}
        </span>
      </div>

      {result.columns.length > 0 && result.rows.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10 sm:block">
            <table className="w-full min-w-[32rem] border-collapse text-start text-xs">
              <thead className="bg-slate-100/90 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
                <tr>
                  {result.columns.map((column) => (
                    <th key={column.key} className="border-b border-slate-200 px-3 py-2 text-start font-black dark:border-white/10">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, rowIndex) => (
                  <tr key={`${result.type}-${rowIndex}`} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    {result.columns.map((column) => (
                      <td key={column.key} className="max-w-xs break-words px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                        {renderValue(row[column.key], column, locale, emptyLabel)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-2 sm:hidden">
            {result.rows.map((row, rowIndex) => (
              <dl key={`${result.type}-mobile-${rowIndex}`} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
                {result.columns.map((column) => (
                  <div key={column.key} className="grid grid-cols-[minmax(5.5rem,0.8fr)_minmax(0,1.2fr)] gap-2 border-b border-slate-100 py-1.5 last:border-0 dark:border-white/5">
                    <dt className="text-[0.65rem] font-black uppercase text-slate-400">{column.label}</dt>
                    <dd className="min-w-0 break-words text-end text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {renderValue(row[column.key], column, locale, emptyLabel)}
                    </dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
        </>
      ) : null}

      {result.sections?.length ? (
        <div className="mt-3 grid gap-3">
          {result.sections.map((section, index) => (
            <StructuredResultSection
              key={`${section.type}-${section.title}-${index}`}
              result={section}
              locale={locale}
              emptyLabel={emptyLabel}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function AiAssistantEvidencePanel({
  intent,
  context,
  interpretations = [],
  result,
  sources = [],
  compact = false,
}: Props): ReactElement | null {
  const { t, i18n } = useTranslation('ai-assistant');
  const [isOpen, setIsOpen] = useState(result?.type === 'compound-read');
  const structuredRowCount = countStructuredRows(result);
  const hasEvidence = interpretations.length > 0 || sources.length > 0 || hasStructuredData(result);
  if (!hasEvidence) return null;

  const groundedCount = interpretations.filter((item) => item.isGrounded && item.status !== 'Failed').length;
  const locale = i18n.resolvedLanguage || i18n.language || 'tr';

  return (
    <details
      data-ai-evidence-panel
      className="group ms-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80 shadow-sm dark:border-white/10 dark:bg-white/[0.035]"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30">
        <span className="flex min-w-0 items-center gap-2">
          <ShieldCheck size={15} className="shrink-0 text-primary" />
          <span className="truncate text-[0.68rem] font-black uppercase tracking-wider text-slate-600 dark:text-slate-200">
            {t('evidence.title')}
          </span>
          {intent ? <span className="hidden rounded bg-primary/10 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-primary sm:inline">{intent}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[0.62rem] font-bold text-slate-400">
          {groundedCount > 0 ? t('evidence.groundedCount', { count: groundedCount }) : t('evidence.guidance')}
          <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className={`border-t border-slate-200 dark:border-white/10 ${compact ? 'p-3' : 'p-4'}`}>
        {interpretations.length > 0 ? (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300">
              <Route size={13} /> {t('evidence.interpretations')}
            </h3>
            <div className="grid gap-2">
              {interpretations.map((item) => {
                const failed = item.status === 'Failed';
                return (
                  <div data-ai-interpretation-status={item.status.toLowerCase()} key={`${item.order}-${item.toolName}-${item.question}`} className={`rounded-lg border p-3 ${failed ? 'border-red-300 bg-red-50/70 dark:border-red-400/25 dark:bg-red-500/10' : 'border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.04]'}`}>
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 font-mono text-[0.62rem] font-black ${failed ? 'text-red-500' : 'text-primary'}`}>{String(item.order).padStart(2, '0')}</span>
                      {failed ? <CircleAlert size={14} className="mt-0.5 shrink-0 text-red-500" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />}
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-xs font-bold text-slate-700 dark:text-slate-200">{item.question}</p>
                        {failed && item.failureMessage ? <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300">{item.failureMessage}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[0.58rem] font-bold uppercase text-slate-500 dark:text-slate-300">
                          {item.toolName ? <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-white/10">{item.toolName}</span> : null}
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{item.routingMode}</span>
                          {item.provider ? <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-white/10">{item.provider}</span> : null}
                          {typeof item.confidence === 'number' ? <span>{t('evidence.confidence', { value: Math.round(item.confidence * 100) })}</span> : null}
                          {!failed ? <span>{t('evidence.resultCount', { count: item.resultCount })}</span> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {context ? (
          <section className="mt-3 rounded-lg border border-slate-200 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <h3 className="flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300">
              <Route size={13} /> {t('evidence.context')}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[0.65rem] font-bold text-slate-600 dark:text-slate-300">
              {[context.module, context.routeTitle, context.entityType && context.entityId ? `${context.entityType} #${context.entityId}` : context.entityType]
                .filter(Boolean)
                .map((value) => <span key={value} className="rounded bg-slate-100 px-2 py-1 dark:bg-white/10">{value}</span>)}
            </div>
          </section>
        ) : null}

        {hasStructuredData(result) && result ? (
          <section className="mt-3">
            <h3 className="mb-2 flex items-center justify-between gap-2 text-[0.66rem] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300">
              <span className="flex items-center gap-2"><Database size={13} /> {t('evidence.results')}</span>
              <span className="font-mono">{structuredRowCount}</span>
            </h3>
            <StructuredResultSection result={result} locale={locale} emptyLabel={t('evidence.empty')} />
          </section>
        ) : null}

        {sources.length > 0 ? (
          <section className="mt-3">
            <h3 className="mb-2 flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300">
              <Database size={13} /> {t('evidence.sources')}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {sources.map((source, index) => (
                <div key={`${source.label}-${source.module}-${index}`} className="rounded-lg border border-slate-200 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="text-xs font-black text-slate-800 dark:text-slate-100">{source.label}</div>
                  <p className="mt-1 text-[0.7rem] font-semibold leading-5 text-slate-500 dark:text-slate-300">{source.description}</p>
                  {(source.module || source.period) ? (
                    <div className="mt-2 flex flex-wrap gap-1 font-mono text-[0.58rem] font-bold uppercase text-primary">
                      {source.module ? <span>{source.module}</span> : null}
                      {source.period ? <span>· {source.period}</span> : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </details>
  );
}
