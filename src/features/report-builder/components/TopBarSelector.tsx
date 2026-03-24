import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ConnectionDto, DataSourceCatalogItem, DataSourceParameter, DataSourceParameterBinding, DataSourceParameterBindingType } from '../types';
import { Database, Layers3, Loader2, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarSelectorProps {
  connections: ConnectionDto[];
  dataSources: DataSourceCatalogItem[];
  dataSourceParameters: DataSourceParameter[];
  datasetParameterBindings: DataSourceParameterBinding[];
  connectionKey: string;
  dataSourceType: string;
  dataSourceName: string;
  dataSourceSearch: string;
  connectionsLoading: boolean;
  dataSourcesLoading: boolean;
  checkLoading: boolean;
  onConnectionChange: (key: string) => void;
  onTypeChange: (type: string) => void;
  onNameChange: (name: string) => void;
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
  connections,
  dataSources,
  dataSourceParameters,
  datasetParameterBindings,
  connectionKey,
  dataSourceType,
  dataSourceName,
  dataSourceSearch,
  connectionsLoading,
  dataSourcesLoading,
  checkLoading,
  onConnectionChange,
  onTypeChange,
  onNameChange,
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

  return (
    <div className={cn('rounded-2xl border bg-card p-4 shadow-xs')}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('common.reportBuilder.datasetSetupTitle')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('common.reportBuilder.datasetSetupDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" />
          {t('common.reportBuilder.datasetSetupTip')}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.8fr_1fr_1.4fr_auto]">
        <div className="rounded-xl border bg-background p-3">
          <Label className="mb-2 flex items-center gap-2">
            <Database className="size-4 text-primary" />
            {t('common.reportBuilder.connection')}
            {connectionsLoading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </Label>
          <Select value={connectionKey || undefined} onValueChange={onConnectionChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="CRM / ERP" />
            </SelectTrigger>
            <SelectContent>
              {connectionList.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label ?? c.key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border bg-background p-3">
          <Label className="mb-2 flex items-center gap-2">
            <Layers3 className="size-4 text-primary" />
            {t('common.reportBuilder.datasetType')}
          </Label>
          <Select value={dataSourceType} onValueChange={onTypeChange}>
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
        </div>

        <div className="rounded-xl border bg-background p-3">
          <Label className="mb-2 flex items-center gap-2">
            <Search className="size-4 text-primary" />
            {t('common.reportBuilder.datasetSearch')}
          </Label>
          <Input
            placeholder={t('common.reportBuilder.datasetSearchPlaceholder')}
            value={dataSourceSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-sm"
            disabled={!connectionKey || !dataSourceType}
          />
        </div>

        <div className="rounded-xl border bg-background p-3">
          <Label className="mb-2 flex items-center gap-2">
            {t('common.reportBuilder.dataset')}
            {dataSourcesLoading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </Label>
          <Select value={dataSourceName || undefined} onValueChange={onNameChange} disabled={!connectionKey || !dataSourceType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('common.reportBuilder.datasetPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {dataSourceList.map((item) => (
                <SelectItem key={item.fullName} value={item.fullName}>
                  {item.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button className="w-full xl:w-auto" onClick={onCheck} disabled={checkLoading || connectionsLoading}>
            {checkLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('common.reportBuilder.check')}
          </Button>
        </div>
      </div>

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
