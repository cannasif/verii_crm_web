import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReportBuilderStore } from '../store';
import type { ChartType, Aggregation, DateGrouping, CalculatedFieldOperation } from '../types';
import { getFieldSemanticType, getOperatorsForField } from '../utils';
import type { Field } from '../types';
import { BarChart3, Calculator, Filter, GripVertical, LayoutTemplate, PieChart, Table2, TrendingUp, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserList } from '@/features/user-management/hooks/useUserList';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'table', label: 'Table' }, // translated at render time
  { value: 'bar', label: 'Bar' },
  { value: 'stackedBar', label: 'Stacked Bar' },
  { value: 'line', label: 'Line' },
  { value: 'pie', label: 'Pie' },
  { value: 'donut', label: 'Donut' },
  { value: 'kpi', label: 'KPI' },
  { value: 'matrix', label: 'Matrix' },
];

const AGGREGATIONS: { value: Aggregation; label: string }[] = [
  { value: 'sum', label: 'Sum' },
  { value: 'count', label: 'Count' },
  { value: 'avg', label: 'Avg' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

const DATE_GROUPINGS: { value: DateGrouping; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const CALCULATED_FIELD_OPERATIONS: { value: CalculatedFieldOperation; label: string }[] = [
  { value: 'add', label: 'A + B' },
  { value: 'subtract', label: 'A - B' },
  { value: 'multiply', label: 'A × B' },
  { value: 'divide', label: 'A ÷ B' },
];

const OPERATOR_LABELS: Record<string, string> = {
  eq: '=',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  between: 'Between',
  contains: 'Contains',
  startsWith: 'Starts with',
  endsWith: 'Ends with',
  in: 'In list',
  isNull: 'Is empty',
  isNotNull: 'Has value',
};

function getInputType(field?: Field): 'text' | 'number' | 'date' {
  if (!field) return 'text';
  const semanticType = getFieldSemanticType(field);
  if (semanticType === 'number') return 'number';
  if (semanticType === 'date') return 'date';
  return 'text';
}

interface PropertiesPanelProps {
  schema: Field[];
  slotError: string | null;
  disabled?: boolean;
}

function getChartIcon(type: ChartType): ReactElement {
  switch (type) {
    case 'table':
    case 'matrix':
      return <Table2 className="size-4" />;
    case 'pie':
    case 'donut':
      return <PieChart className="size-4" />;
    case 'line':
      return <TrendingUp className="size-4" />;
    default:
      return <BarChart3 className="size-4" />;
  }
}

export function PropertiesPanel({ schema, slotError: _slotError, disabled }: PropertiesPanelProps): ReactElement {
  const { t } = useTranslation('common');
  const numericFields = schema.filter((field) => getFieldSemanticType(field) === 'number');
  const [calcName, setCalcName] = useState('');
  const [calcLabel, setCalcLabel] = useState('');
  const [calcLeftField, setCalcLeftField] = useState('');
  const [calcRightField, setCalcRightField] = useState('');
  const [calcOperation, setCalcOperation] = useState<CalculatedFieldOperation>('add');
  const {
    config,
    meta,
    setMeta,
    setChartType,
    setDateGrouping,
    setSorting,
    setAggregation,
    removeFromSlot,
    addCalculatedField,
    removeCalculatedField,
    rollbackToHistory,
    setGovernanceMetadata,
    setLifecycleReleaseNote,
    updateFilter,
    removeFilter,
    addToSlot,
  } = useReportBuilderStore();
  const lifecycle = config.lifecycle ?? { status: 'draft' as const, version: 1 };
  const governance = config.governance ?? {
    audience: 'private' as const,
    refreshCadence: 'manual' as const,
    favorite: false,
    tags: [],
    sharedWith: [],
    subscriptionEnabled: false,
    subscriptionChannel: 'email' as const,
    subscriptionFrequency: 'weekly' as const,
    certified: false,
  };
  const { data: usersResponse } = useUserList({
    pageNumber: 1,
    pageSize: 100,
    sortBy: 'fullName',
    sortDirection: 'asc',
  });
  const userOptions = useMemo<ComboboxOption[]>(
    () =>
      (usersResponse?.data ?? [])
        .filter((user) => Boolean(user.email))
        .map((user) => ({
          value: String(user.id),
          label: `${user.fullName || user.username} (${user.email})`,
        })),
    [usersResponse?.data],
  );
  const assignedUserIds = meta.assignedUserIds ?? [];
  const selectedAssignedUserOptions = useMemo(
    () =>
      assignedUserIds.map((userId) => {
        const match = userOptions.find((option) => option.value === String(userId));
        return {
          userId,
          label: match?.label ?? String(userId),
        };
      }),
    [assignedUserIds, userOptions],
  );

  const axisField = config.axis?.field;
  const axisSchema = schema.find((f) => f.name === axisField);
  const chartTypeLabel = (value: string): string => t(`common.reportBuilder.chartTypes.${value}`);
  const aggregationLabel = (value: string): string => t(`common.reportBuilder.aggregations.${value}`);
  const dateGroupingLabel = (value: string): string => t(`common.reportBuilder.dateGroupings.${value}`);
  const operatorLabel = (value: string): string => t(`common.reportBuilder.operators.${value}`, { defaultValue: OPERATOR_LABELS[value] ?? value });

  if (disabled) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">{t('common.reportBuilder.checkFirst')}</p>
      </div>
    );
  }

  const handleAddCalculatedField = (): void => {
    if (!calcName.trim() || !calcLeftField || !calcRightField) return;
    addCalculatedField({
      name: calcName.trim(),
      label: calcLabel.trim() || calcName.trim(),
      leftField: calcLeftField,
      rightField: calcRightField,
      operation: calcOperation,
    });
    setCalcName('');
    setCalcLabel('');
    setCalcLeftField('');
    setCalcRightField('');
    setCalcOperation('add');
  };

  const handleAddAssignedUser = (userIdRaw: string): void => {
    const userId = Number(userIdRaw);
    if (!Number.isFinite(userId) || userId <= 0) return;
    if (assignedUserIds.includes(userId)) return;
    const user = (usersResponse?.data ?? []).find((item) => item.id === userId);
    const email = user?.email?.toLowerCase();
    setMeta({
      assignedUserIds: [...assignedUserIds, userId],
    });
    setGovernanceMetadata({
      sharedWith: email && !(governance.sharedWith ?? []).includes(email)
        ? [...(governance.sharedWith ?? []), email]
        : governance.sharedWith ?? [],
    });
  };

  const handleRemoveAssignedUser = (userId: number): void => {
    const user = (usersResponse?.data ?? []).find((item) => item.id === userId);
    const email = user?.email?.toLowerCase();
    setMeta({
      assignedUserIds: assignedUserIds.filter((value) => value !== userId),
    });
    setGovernanceMetadata({
      sharedWith: email ? (governance.sharedWith ?? []).filter((value) => value !== email) : governance.sharedWith ?? [],
    });
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <div className="rounded-lg border border-dashed p-3">
        <div className="mb-3 flex items-center gap-2">
          <LayoutTemplate className="size-4 text-primary" />
          <Label>{t('common.reportBuilder.visualGallery')}</Label>
        </div>
        <p className="text-muted-foreground mb-3 text-xs">{t('common.reportBuilder.visualGalleryDescription')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CHART_TYPES.map((item) => {
            const active = config.chartType === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setChartType(item.value)}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                <div className="mb-2 flex items-center gap-2 font-medium">
                  {getChartIcon(item.value)}
                  {chartTypeLabel(item.value)}
                </div>
                <p className="text-muted-foreground text-xs">
                  {t(`common.reportBuilder.chartTypeDescriptions.${item.value}`)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('common.reportBuilder.chartType')}</Label>
        <Select value={config.chartType} onValueChange={(v) => setChartType(v as ChartType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHART_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                    {chartTypeLabel(t.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-dashed p-3">
        <div className="mb-2 flex items-center gap-2">
          <Filter className="size-4 text-primary" />
          <Label>{t('common.reportBuilder.configGuide')}</Label>
        </div>
        <p className="text-muted-foreground text-xs">{t('common.reportBuilder.configGuideDescription')}</p>
      </div>

      {config.axis &&
        axisSchema &&
        (axisSchema.dotNetType?.includes('DateTime') ?? axisSchema.sqlType?.toLowerCase().includes('date')) && (
          <div className="space-y-2">
            <Label>{t('common.reportBuilder.dateGrouping')}</Label>
            <Select
              value={config.axis.dateGrouping ?? 'day'}
              onValueChange={(v) => setDateGrouping(v as DateGrouping)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_GROUPINGS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {dateGroupingLabel(g.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

      <div className="space-y-2">
        <Label>{t('common.reportBuilder.sorting')}</Label>
        <div className="flex gap-2">
          <Select
            value={config.sorting?.by ?? 'axis'}
            onValueChange={(by) =>
              setSorting({
                by: by as 'axis' | 'value',
                direction: config.sorting?.direction ?? 'asc',
                valueField: config.sorting?.valueField,
              })
            }
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t('common.reportBuilder.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="axis">{t('common.reportBuilder.axis')}</SelectItem>
              <SelectItem value="value">{t('common.reportBuilder.value')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={config.sorting?.direction ?? 'asc'}
            onValueChange={(direction) =>
              setSorting({
                by: config.sorting?.by ?? 'axis',
                direction: direction as 'asc' | 'desc',
                valueField: config.sorting?.valueField,
              })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">{t('common.reportBuilder.asc')}</SelectItem>
              <SelectItem value="desc">{t('common.reportBuilder.desc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {config.values.length > 0 && (
        <div className="space-y-2">
          <Label>{t('common.reportBuilder.valuesAggregation')}</Label>
          <div className="space-y-1">
            {config.values.map((v, i) => (
              <div key={`${v.field}-${i}`} className="flex items-center gap-1 rounded bg-muted/50 px-2 py-1 text-sm">
                <GripVertical className="size-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{v.field}</span>
                <Select value={v.aggregation} onValueChange={(agg) => setAggregation(i, agg as Aggregation)}>
                  <SelectTrigger className="h-7 w-20 border-0 bg-transparent px-1 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {aggregationLabel(a.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeFromSlot('values', i)} aria-label={t('common.reportBuilder.dismiss')}>
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {config.filters.length > 0 && (
        <div className="space-y-2">
          <Label>{t('common.reportBuilder.filtersOperator')}</Label>
          <div className="space-y-1">
            {config.filters.map((f, i) => {
              const fieldSchema = schema.find((s) => s.name === f.field);
              const operators = fieldSchema ? getOperatorsForField(fieldSchema) : ['eq', 'ne'];
              const inputType = getInputType(fieldSchema);
              const semanticType = fieldSchema ? getFieldSemanticType(fieldSchema) : 'text';
              const isUnary = f.operator === 'isNull' || f.operator === 'isNotNull';
              const isBetween = f.operator === 'between';
              const isList = f.operator === 'in';
              return (
                <div key={`${f.field}-${i}`} className="space-y-2 rounded bg-muted/50 px-2 py-2 text-sm">
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{f.field}</div>
                      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{semanticType}</div>
                    </div>
                    <Select
                      value={f.operator}
                      onValueChange={(op) => updateFilter(i, { operator: op, value: undefined, values: undefined, from: undefined, to: undefined })}
                    >
                      <SelectTrigger className="h-7 w-28 border-0 bg-transparent px-1 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op} value={op}>
                            {operatorLabel(op)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeFilter(i)} aria-label={t('common.advancedFilter.remove')}>
                      <X className="size-3" />
                    </Button>
                  </div>

                  {!isUnary && (
                    <div className="space-y-2">
                      {isBetween && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type={inputType}
                            placeholder={t('common.reportBuilder.from')}
                            value={String(f.from ?? '')}
                            onChange={(e) => updateFilter(i, { from: e.target.value })}
                            className="h-8"
                          />
                          <Input
                            type={inputType}
                            placeholder={t('common.reportBuilder.to')}
                            value={String(f.to ?? '')}
                            onChange={(e) => updateFilter(i, { to: e.target.value })}
                            className="h-8"
                          />
                        </div>
                      )}

                      {isList && (
                        <Input
                          placeholder={t('common.reportBuilder.valuesListCompactPlaceholder')}
                          value={Array.isArray(f.values) ? f.values.map((item) => String(item ?? '')).join(', ') : ''}
                          onChange={(e) =>
                            updateFilter(i, {
                              values: e.target.value
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean),
                            })
                          }
                          className="h-8"
                        />
                      )}

                      {!isBetween && !isList && (
                        <Input
                          type={inputType}
                          placeholder={t('common.reportBuilder.value')}
                          value={String(f.value ?? '')}
                          onChange={(e) => updateFilter(i, { value: e.target.value })}
                          className="h-8"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div>
          <Label>{t('common.reportBuilder.governance')}</Label>
          <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.governanceDescription')}</p>
        </div>
        <Input
          placeholder={t('common.reportBuilder.category')}
          value={governance.category ?? ''}
          onChange={(e) => setGovernanceMetadata({ category: e.target.value })}
        />
        <Input
          placeholder={t('common.reportBuilder.owner')}
          value={governance.owner ?? ''}
          onChange={(e) => setGovernanceMetadata({ owner: e.target.value })}
        />
        <Input
          placeholder={t('common.reportBuilder.tagsPlaceholder')}
          value={(governance.tags ?? []).join(', ')}
          onChange={(e) =>
            setGovernanceMetadata({
              tags: e.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={governance.audience ?? 'private'} onValueChange={(value) => setGovernanceMetadata({ audience: value as 'private' | 'team' | 'organization' })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">{t('common.reportBuilder.audiences.private')}</SelectItem>
              <SelectItem value="team">{t('common.reportBuilder.audiences.team')}</SelectItem>
              <SelectItem value="organization">{t('common.reportBuilder.audiences.organization')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={governance.refreshCadence ?? 'manual'} onValueChange={(value) => setGovernanceMetadata({ refreshCadence: value as 'manual' | 'hourly' | 'daily' | 'weekly' })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{t('common.reportBuilder.refreshCadences.manual')}</SelectItem>
              <SelectItem value="hourly">{t('common.reportBuilder.refreshCadences.hourly')}</SelectItem>
              <SelectItem value="daily">{t('common.reportBuilder.refreshCadences.daily')}</SelectItem>
              <SelectItem value="weekly">{t('common.reportBuilder.refreshCadences.weekly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={governance.certified ? 'default' : 'outline'}
            onClick={() =>
              setGovernanceMetadata({
                certified: !governance.certified,
                lastReviewedAt: !governance.certified ? new Date().toISOString() : governance.lastReviewedAt,
              })
            }
          >
            {governance.certified ? t('common.reportBuilder.certified') : t('common.reportBuilder.markCertified')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setGovernanceMetadata({ lastReviewedAt: new Date().toISOString() })}
          >
            {t('common.reportBuilder.stampReview')}
          </Button>
        </div>
        <div className="space-y-3 rounded-xl border border-dashed p-3">
          <div className="space-y-1">
            <Label>{t('common.reportBuilder.sharedWith')}</Label>
            <p className="text-muted-foreground text-xs">{t('common.reportBuilder.sharedWithDescription')}</p>
          </div>
          <div className="bg-muted/40 rounded-lg border px-3 py-2 text-xs">
            <div className="font-medium">{t('common.reportBuilder.sharedWithHelpTitle')}</div>
            <div className="text-muted-foreground mt-1">{t('common.reportBuilder.sharedWithHelpDescription')}</div>
          </div>
          <Combobox
            options={userOptions.filter((option) => !assignedUserIds.includes(Number(option.value)))}
            onValueChange={handleAddAssignedUser}
            placeholder={t('common.reportBuilder.sharedWithSelect')}
            searchPlaceholder={t('common.reportBuilder.sharedWithSearch')}
            emptyText={t('common.reportBuilder.sharedWithEmpty')}
          />
          <div className="flex flex-wrap gap-2">
            {selectedAssignedUserOptions.length > 0 ? (
              selectedAssignedUserOptions.map((user) => (
                <Badge key={user.userId} variant="secondary" className="gap-2 pr-1">
                  <span className="max-w-[240px] truncate">{user.label}</span>
                  <button
                    type="button"
                    className="rounded-sm p-0.5 hover:bg-black/10"
                    onClick={() => handleRemoveAssignedUser(user.userId)}
                    aria-label={t('common.reportBuilder.removeAssignedUser')}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground text-xs">{t('common.reportBuilder.sharedWithNone')}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={governance.subscriptionEnabled ? 'default' : 'outline'}
            onClick={() => setGovernanceMetadata({ subscriptionEnabled: !governance.subscriptionEnabled })}
          >
            {governance.subscriptionEnabled ? t('common.reportBuilder.subscriptionOn') : t('common.reportBuilder.subscriptionOff')}
          </Button>
          <Select
            value={governance.subscriptionFrequency ?? 'weekly'}
            onValueChange={(value) => setGovernanceMetadata({ subscriptionFrequency: value as 'manual' | 'daily' | 'weekly' | 'monthly' })}
            disabled={!governance.subscriptionEnabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{t('common.reportBuilder.subscriptionFrequencies.manual')}</SelectItem>
              <SelectItem value="daily">{t('common.reportBuilder.subscriptionFrequencies.daily')}</SelectItem>
              <SelectItem value="weekly">{t('common.reportBuilder.subscriptionFrequencies.weekly')}</SelectItem>
              <SelectItem value="monthly">{t('common.reportBuilder.subscriptionFrequencies.monthly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select
          value={governance.subscriptionChannel ?? 'email'}
          onValueChange={(value) => setGovernanceMetadata({ subscriptionChannel: value as 'email' | 'inbox' | 'webhook' })}
          disabled={!governance.subscriptionEnabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">{t('common.reportBuilder.subscriptionChannels.email')}</SelectItem>
            <SelectItem value="inbox">{t('common.reportBuilder.subscriptionChannels.inbox')}</SelectItem>
            <SelectItem value="webhook">{t('common.reportBuilder.subscriptionChannels.webhook')}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant={governance.favorite ? 'default' : 'outline'} onClick={() => setGovernanceMetadata({ favorite: !governance.favorite })}>
          {governance.favorite ? t('common.reportBuilder.favorite') : t('common.reportBuilder.markFavorite')}
      </Button>
      </div>

      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div>
          <Label>{t('common.reportBuilder.releaseManagement')}</Label>
          <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.releaseManagementDescription')}</p>
        </div>
        <Input
          placeholder={t('common.reportBuilder.releaseNote')}
          value={lifecycle.releaseNote ?? ''}
          onChange={(e) => setLifecycleReleaseNote(e.target.value)}
        />
        {(config.history?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {config.history?.slice().reverse().map((entry) => (
              <div key={entry.version} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2 text-sm">
                <div>
                  <div className="font-medium">v{entry.version}</div>
                  <div className="text-muted-foreground text-xs">{entry.releaseNote || t('common.reportBuilder.noReleaseNote')}</div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => rollbackToHistory(entry.version)}>
                  {t('common.reportBuilder.rollback')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-primary" />
            <Label>{t('common.reportBuilder.calculatedFields')}</Label>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.calculatedFieldsDescription')}</p>
        </div>
        <div className="grid gap-2">
          <Input placeholder={t('common.reportBuilder.fieldNamePlaceholder')} value={calcName} onChange={(e) => setCalcName(e.target.value)} />
          <Input placeholder={t('common.reportBuilder.displayLabel')} value={calcLabel} onChange={(e) => setCalcLabel(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={calcLeftField} onValueChange={setCalcLeftField}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.reportBuilder.leftField')} />
              </SelectTrigger>
              <SelectContent>
                {numericFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.displayName || field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={calcRightField} onValueChange={setCalcRightField}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.reportBuilder.rightField')} />
              </SelectTrigger>
              <SelectContent>
                {numericFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.displayName || field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={calcOperation} onValueChange={(value) => setCalcOperation(value as CalculatedFieldOperation)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALCULATED_FIELD_OPERATIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {t(`common.reportBuilder.calculatedOperations.${item.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={handleAddCalculatedField}>
            {t('common.reportBuilder.addCalculatedField')}
          </Button>
        </div>

        {(config.calculatedFields?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {config.calculatedFields?.map((field) => (
              <div key={field.name} className="rounded-md bg-muted/50 p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{field.label || field.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {field.leftField} {field.operation} {field.rightField}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => addToSlot('values', field.name, { aggregation: 'sum' })}>
                      {t('common.reportBuilder.use')}
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeCalculatedField(field.name)}>
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
