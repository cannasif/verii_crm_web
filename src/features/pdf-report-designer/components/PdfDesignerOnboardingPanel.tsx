import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Sparkles, LayoutTemplate, Blocks, Gauge, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface PdfDesignerOnboardingMetric {
  label: string;
  value: number;
}

export interface PdfDesignerOnboardingPanelProps {
  qualityScore: number;
  qualityNarrative: string;
  qualityIssues: string[];
  qualityReadyLabel: string;
  qualityTitle: string;
  healthTitle: string;
  metrics: PdfDesignerOnboardingMetric[];
  smartStartDescription: string;
  presetGalleryDescription: string;
  reusableBlocksDescription: string;
  onApplyStarter: () => void;
  onAddSmartTable: () => void;
  onAddSmartTotals: () => void;
  onAddSmartNote: () => void;
  onApplyPreset: (preset: 'commercialStarter' | 'compactSummary' | 'lineFocused' | 'signatureReady') => void;
  onAddReusableBlock: (block: 'customerSummary' | 'documentMeta' | 'signature' | 'noteBox') => void;
  presetLabels: Record<'commercialStarter' | 'compactSummary' | 'lineFocused' | 'signatureReady', string>;
  smartStartLabels: Record<'applyStarter' | 'addTable' | 'addTotals' | 'addNote', string>;
  reusableBlockLabels: Record<'customerSummary' | 'documentMeta' | 'signature' | 'noteBox', string>;
  showTableActions: boolean;
  initialExpanded: boolean;
}

function getScoreTone(score: number): 'emerald' | 'amber' | 'rose' {
  if (score >= 84) return 'emerald';
  if (score >= 60) return 'amber';
  return 'rose';
}

export function PdfDesignerOnboardingPanel({
  qualityScore,
  qualityNarrative,
  qualityIssues,
  qualityReadyLabel,
  qualityTitle,
  healthTitle,
  metrics,
  smartStartDescription,
  presetGalleryDescription,
  reusableBlocksDescription,
  onApplyStarter,
  onAddSmartTable,
  onAddSmartTotals,
  onAddSmartNote,
  onApplyPreset,
  onAddReusableBlock,
  presetLabels,
  smartStartLabels,
  reusableBlockLabels,
  showTableActions,
  initialExpanded,
}: PdfDesignerOnboardingPanelProps): ReactElement {
  const { t } = useTranslation(['report-designer', 'common']);
  const [expanded, setExpanded] = useState<boolean>(initialExpanded);
  const tone = getScoreTone(qualityScore);
  const hasIssues = qualityIssues.length > 0;

  const toneClasses: Record<'emerald' | 'amber' | 'rose', string> = {
    emerald:
      'text-emerald-700 ring-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:ring-emerald-900/60 dark:bg-emerald-950/40',
    amber:
      'text-amber-700 ring-amber-200 bg-amber-50 dark:text-amber-300 dark:ring-amber-900/60 dark:bg-amber-950/40',
    rose:
      'text-rose-700 ring-rose-200 bg-rose-50 dark:text-rose-300 dark:ring-rose-900/60 dark:bg-rose-950/40',
  };

  return (
    <section
      aria-label={qualityTitle}
      className="border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${toneClasses[tone]}`}
          >
            <Gauge className="size-3.5" />
            <span>
              {qualityScore}
              <span className="opacity-60">/100</span>
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {qualityTitle}
              </span>
              {!hasIssues ? (
                <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="size-3" />
                  {qualityReadyLabel}
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-xs text-slate-600 dark:text-slate-300">{qualityNarrative}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
                <Sparkles className="size-3.5" />
                {t('pdfReportDesigner.smartStartTitle')}
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-slate-500">
                {smartStartDescription}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onApplyStarter}>{smartStartLabels.applyStarter}</DropdownMenuItem>
              {showTableActions ? (
                <>
                  <DropdownMenuItem onSelect={onAddSmartTable}>{smartStartLabels.addTable}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={onAddSmartTotals}>{smartStartLabels.addTotals}</DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuItem onSelect={onAddSmartNote}>{smartStartLabels.addNote}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
                <LayoutTemplate className="size-3.5" />
                {t('pdfReportDesigner.presetGalleryTitle')}
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-slate-500">
                {presetGalleryDescription}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onApplyPreset('commercialStarter')}>
                {presetLabels.commercialStarter}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onApplyPreset('compactSummary')}>
                {presetLabels.compactSummary}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onApplyPreset('lineFocused')}>
                {presetLabels.lineFocused}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onApplyPreset('signatureReady')}>
                {presetLabels.signatureReady}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
                <Blocks className="size-3.5" />
                {t('pdfReportDesigner.reusableBlocksTitle')}
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-slate-500">
                {reusableBlocksDescription}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onAddReusableBlock('customerSummary')}>
                {reusableBlockLabels.customerSummary}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAddReusableBlock('documentMeta')}>
                {reusableBlockLabels.documentMeta}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAddReusableBlock('signature')}>
                {reusableBlockLabels.signature}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAddReusableBlock('noteBox')}>
                {reusableBlockLabels.noteBox}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            <span className="text-xs">
              {expanded
                ? t('pdfReportDesigner.hideGuidance')
                : t('pdfReportDesigner.showGuidance')}
            </span>
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {qualityTitle}
              </span>
              <Badge variant={tone === 'emerald' ? 'default' : tone === 'amber' ? 'secondary' : 'destructive'}>
                {qualityScore}/100
              </Badge>
            </div>
            {hasIssues ? (
              <ul className="mt-2.5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {qualityIssues.slice(0, 6).map((issue) => (
                  <li key={issue} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {qualityReadyLabel}
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {healthTitle}
            </span>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </div>
                  <div className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
