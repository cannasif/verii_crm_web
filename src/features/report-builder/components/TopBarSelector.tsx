import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ConnectionDto, DataSourceCatalogItem } from '../types';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarSelectorProps {
  connections: ConnectionDto[];
  dataSources: DataSourceCatalogItem[];
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

  return (
    <div className={cn('flex flex-wrap items-end gap-4 border-b pb-4')}>
      <div className="space-y-1 min-w-[140px]">
        <Label className="flex items-center gap-2">
          {t('common.reportBuilder.connection')}
          {connectionsLoading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
        </Label>
        <Select
          value={connectionKey || undefined}
          onValueChange={onConnectionChange}
        >
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
      <div className="space-y-1 min-w-[100px]">
        <Label>{t('common.reportBuilder.datasetType')}</Label>
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
      <div className="space-y-1 min-w-[180px]">
        <Label>{t('common.reportBuilder.datasetSearch')}</Label>
        <Input
          placeholder={t('common.reportBuilder.datasetSearchPlaceholder')}
          value={dataSourceSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          className="text-sm"
          disabled={!connectionKey || !dataSourceType}
        />
      </div>
      <div className="space-y-1 min-w-[280px]">
        <Label className="flex items-center gap-2">
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
      <Button onClick={onCheck} disabled={checkLoading || connectionsLoading}>
        {checkLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
        {t('common.reportBuilder.check')}
      </Button>
    </div>
  );
}
