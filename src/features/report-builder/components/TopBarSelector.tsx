import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ConnectionDto, DataSourceCatalogItem, DataSourceParameter, DataSourceParameterBinding, DataSourceParameterBindingType } from '../types';
import { Database, Layers3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarSelectorProps {
  className?: string;
  mode?: 'basic' | 'advanced';
  connections: ConnectionDto[];
  dataSources: DataSourceCatalogItem[];
  dataSourceParameters: DataSourceParameter[];
  datasetParameterBindings: DataSourceParameterBinding[];
  connectionKey: string;
  dataSourceType: string;
  dataSourceName: string;
  reportName?: string;
  datasetChecked?: boolean;
  connectionsLoading: boolean;
  dataSourcesLoading: boolean;
  checkLoading: boolean;
  onConnectionChange: (key: string) => void;
  onTypeChange: (type: string) => void;
  onNameChange: (name: string) => void;
  onReportNameChange?: (name: string) => void;
  onParameterBindingChange: (
    name: string,
    source: DataSourceParameterBindingType,
    value?: string,
    options?: { allowViewerOverride?: boolean; viewerLabel?: string }
  ) => void;
  onSearchChange: (search: string) => void;
  onCheck: () => void;
}

const TYPE_OPTIONS = [
  { value: 'view', labelKey: 'common.reportBuilder.datasetTypes.view' },
  { value: 'function', labelKey: 'common.reportBuilder.datasetTypes.function' },
];

export function TopBarSelector({
  className,
  mode = 'advanced',
  connections,
  dataSources,
  dataSourceParameters,
  datasetParameterBindings,
  connectionKey,
  dataSourceType,
  dataSourceName,
  reportName,
  datasetChecked,
  connectionsLoading,
  dataSourcesLoading,
  checkLoading,
  onConnectionChange,
  onTypeChange,
  onNameChange,
  onReportNameChange,
  onParameterBindingChange,
  onSearchChange,
  onCheck,
}: TopBarSelectorProps): ReactElement {
  const { t } = useTranslation('common');
  const connectionList = Array.isArray(connections) ? connections : [];
  const dataSourceList = dataSourceName && !dataSources.some((item) => item.fullName === dataSourceName)
    ? [
      ...dataSources,
      {
        schemaName: '',
        objectName: dataSourceName,
        fullName: dataSourceName,
        type: dataSourceType,
        displayName: dataSourceName,
      },
    ]
    : dataSources;
  const parameterSourceOptions: { value: DataSourceParameterBindingType; label: string }[] = [
    { value: 'literal', label: t('common.reportBuilder.parameterSources.literal') },
    { value: 'currentUserId', label: t('common.reportBuilder.parameterSources.currentUserId') },
    { value: 'currentUserEmail', label: t('common.reportBuilder.parameterSources.currentUserEmail') },
    { value: 'today', label: t('common.reportBuilder.parameterSources.today') },
    { value: 'now', label: t('common.reportBuilder.parameterSources.now') },
  ];

  const showReportNameField = typeof onReportNameChange === 'function';
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border border-slate-300/80 bg-stone-50/95 p-5 shadow-md ring-1 ring-slate-200/70 backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-[#1a1025]/60 dark:shadow-sm dark:ring-0',
      className
    )}>
      <div className="absolute inset-0 pointer-events-none bg-linear-to-r from-pink-500/0 to-orange-500/0 dark:from-pink-500/5 dark:to-orange-500/5 opacity-50" />

      <div className="relative z-10 mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-pink-500 to-orange-500 text-white shadow-lg shadow-pink-500/20">
            <Database className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              {t('common.reportBuilder.setupSectionTitle')}
            </h2>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {t('common.reportBuilder.datasetSetupTip')}
            </p>
          </div>
        </div>
      </div>

      <ol className={cn(
        'grid gap-2.5',
        showReportNameField
          ? 'md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_1.4fr_auto]'
          : 'md:grid-cols-[1fr_1fr_2fr_auto] xl:grid-cols-[1fr_1fr_2fr_auto]',
      )}>
        <li className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">1</span>
            {mode === 'basic' ? t('common.reportBuilder.simpleConnectionLabel') : t('common.reportBuilder.connection')}
            {connectionsLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
          </Label>
          <Select value={connectionKey || undefined} onValueChange={onConnectionChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('common.reportBuilder.connectionPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {connectionList.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label ?? c.key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </li>

        <li className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">2</span>
            {mode === 'basic' ? t('common.reportBuilder.simpleDatasetTypeLabel') : t('common.reportBuilder.datasetType')}
          </Label>
          <Select
            value={dataSourceType}
            onValueChange={onTypeChange}
            disabled={!connectionKey}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('common.reportBuilder.datasetTypePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </li>

        <li className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">3</span>
            {mode === 'basic' ? t('common.reportBuilder.simpleDatasetLabel') : t('common.reportBuilder.dataset')}
            {dataSourcesLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
            {datasetChecked && dataSourceName ? (
              <Layers3 className="size-3 text-emerald-600" aria-label="checked" />
            ) : null}
          </Label>
          <Combobox
            options={dataSourceList.map((item) => ({ value: item.fullName, label: item.displayName }))}
            value={dataSourceName || undefined}
            onValueChange={onNameChange}
            onSearchChange={onSearchChange}
            placeholder={t('common.reportBuilder.datasetPlaceholder')}
            searchPlaceholder={t('common.reportBuilder.datasetSearchPlaceholder')}
            emptyText={t('common.reportBuilder.datasetEmpty')}
            disabled={!connectionKey || !dataSourceType}
          />
        </li>

        {showReportNameField ? (
          <li className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">4</span>
              {t('common.reportBuilder.reportName')}
            </Label>
            <Input
              value={reportName ?? ''}
              onChange={(event) => onReportNameChange?.(event.target.value)}
              placeholder={t('common.reportBuilder.reportNamePlaceholder')}
              className="h-9"
            />
          </li>
        ) : null}

        <li className="flex items-end">
          <Button
            className="h-9 w-full bg-linear-to-r from-pink-600 to-orange-600 font-bold text-white shadow-lg shadow-pink-500/20 opacity-90 hover:opacity-100 transition-all hover:scale-[1.02] hover:from-pink-500 hover:to-orange-500 hover:opacity-30 xl:w-auto"
            onClick={onCheck}
            disabled={checkLoading || connectionsLoading || !dataSourceName}
          >
            {checkLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === 'basic' ? t('common.reportBuilder.simpleCheckAction') : t('common.reportBuilder.check')}
          </Button>
        </li>
      </ol>
      {!connectionKey ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{t('common.reportBuilder.datasetDisabledHint')}</p>
      ) : !dataSourceName && dataSourceType ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{t('common.reportBuilder.datasetPickHint')}</p>
      ) : null}

      {dataSourceType === 'function' && dataSourceParameters.length > 0 ? (
        <div className="mt-4 rounded-2xl border bg-background p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">{t('common.reportBuilder.parametersTitle')}</h3>
            <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.parametersDescription')}</p>
          </div>
          <div className="grid gap-3">
            {dataSourceParameters.map((parameter) => {
              const binding = datasetParameterBindings.find((item) => item.name === parameter.name);
              const source = binding?.source ?? (parameter.semanticType === 'date' ? 'today' : 'literal');
              const showLiteralValue = source === 'literal';
              return (
                <div key={parameter.name} className="grid gap-3 rounded-xl border p-3 lg:grid-cols-[1.1fr_1fr_1fr]">
                  <div>
                    <div className="font-medium">{parameter.displayName || parameter.name}</div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      @{parameter.name} • {parameter.dotNetType || parameter.sqlType}
                    </div>
                    <div className="mt-3 rounded-lg border bg-muted/30 p-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${parameter.name}-viewer-override`}
                          checked={binding?.allowViewerOverride ?? false}
                          onCheckedChange={(checked) =>
                            onParameterBindingChange(parameter.name, source, binding?.value, {
                              allowViewerOverride: Boolean(checked),
                              viewerLabel: binding?.viewerLabel ?? parameter.displayName ?? parameter.name,
                            })
                          }
                        />
                        <Label htmlFor={`${parameter.name}-viewer-override`} className="text-xs font-medium">
                          {t('common.reportBuilder.viewerCanOverride')}
                        </Label>
                      </div>
                      <Input
                        className="mt-2"
                        value={binding?.viewerLabel ?? parameter.displayName ?? parameter.name}
                        onChange={(e) =>
                          onParameterBindingChange(parameter.name, source, binding?.value, {
                            allowViewerOverride: binding?.allowViewerOverride ?? false,
                            viewerLabel: e.target.value,
                          })
                        }
                        placeholder={t('common.reportBuilder.viewerParameterLabel')}
                        disabled={!(binding?.allowViewerOverride ?? false)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">{t('common.reportBuilder.parameterSource')}</Label>
                    <Select
                      value={source}
                      onValueChange={(value) =>
                        onParameterBindingChange(parameter.name, value as DataSourceParameterBindingType, binding?.value, {
                          allowViewerOverride: binding?.allowViewerOverride ?? false,
                          viewerLabel: binding?.viewerLabel,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {parameterSourceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block">{t('common.reportBuilder.parameterValue')}</Label>
                    <Input
                      value={binding?.value ?? ''}
                      onChange={(e) =>
                        onParameterBindingChange(parameter.name, source, e.target.value, {
                          allowViewerOverride: binding?.allowViewerOverride ?? false,
                          viewerLabel: binding?.viewerLabel,
                        })
                      }
                      disabled={!showLiteralValue}
                      placeholder={showLiteralValue ? t('common.reportBuilder.parameterValuePlaceholder') : t('common.reportBuilder.parameterAutoValue')}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
