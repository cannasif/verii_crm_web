import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  FileDown,
  TableProperties,
  Loader2,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DataTableActionBar,
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableGridColumn,
} from '@/components/shared';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { loadColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { usePdfReportTemplateList } from '../hooks/usePdfReportTemplateList';
import { useDeletePdfReportTemplate } from '../hooks/useDeletePdfReportTemplate';
import { useGeneratePdfReportDocument } from '../hooks/useGeneratePdfReportDocument';
import {
  pdfReportTemplateApi,
  pdfReportTemplateQueryKeys,
  DocumentRuleType,
  type ReportTemplateListItemDto,
} from '@/features/pdf-report';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const PAGE_KEY = 'pdf-report-designer-list';

const RULE_TYPE_LABEL_KEYS: Record<DocumentRuleType, string> = {
  [DocumentRuleType.Demand]: 'reportDesigner.ruleType.demand',
  [DocumentRuleType.Quotation]: 'reportDesigner.ruleType.quotation',
  [DocumentRuleType.Order]: 'reportDesigner.ruleType.order',
  [DocumentRuleType.FastQuotation]: 'reportDesigner.ruleType.fastQuotation',
  [DocumentRuleType.Activity]: 'reportDesigner.ruleType.activity',
};

type PdfReportTemplateColumnKey =
  | 'id'
  | 'title'
  | 'layoutPreset'
  | 'ruleType'
  | 'isActive'
  | 'default'
  | 'updatedDate';

const TABLE_COLUMNS: Array<{ key: PdfReportTemplateColumnKey; labelKey: string; className?: string; sortable?: boolean }> = [
  { key: 'id', labelKey: 'reportDesigner.list.id', className: 'w-[80px] font-mono text-slate-500', sortable: true },
  { key: 'title', labelKey: 'pdfReportDesigner.title', className: 'min-w-[260px]', sortable: true },
  { key: 'layoutPreset', labelKey: 'pdfReportDesigner.layoutPreset.label', className: 'w-[180px]', sortable: false },
  { key: 'ruleType', labelKey: 'pdfReportDesigner.documentType', className: 'w-[180px]', sortable: true },
  { key: 'isActive', labelKey: 'pdfReportDesigner.active', className: 'w-[120px]', sortable: true },
  { key: 'default', labelKey: 'pdfReportDesigner.default', className: 'w-[120px]', sortable: true },
  { key: 'updatedDate', labelKey: 'pdfReportDesigner.updatedDate', className: 'w-[200px]', sortable: true },
] as const;

const FILTER_COLUMNS = [
  { value: 'ruleType', type: 'number', labelKey: 'pdfReportDesigner.documentType' },
  { value: 'isActive', type: 'boolean', labelKey: 'pdfReportDesigner.active' },
] as const;

function parseRuleTypeFilter(rows: FilterRow[]): DocumentRuleType | undefined {
  const row = rows.find((item) => item.column === 'ruleType' && item.operator === 'Equals');
  if (!row) return undefined;
  const parsed = Number(row.value);
  if (!Number.isInteger(parsed)) return undefined;
  if (parsed < DocumentRuleType.Demand || parsed > DocumentRuleType.Activity) return undefined;
  return parsed as DocumentRuleType;
}

function parseStatusFilter(rows: FilterRow[]): boolean | undefined {
  const row = rows.find((item) => item.column === 'isActive' && item.operator === 'Equals');
  if (!row) return undefined;
  const normalized = row.value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

function downloadBlobAsPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PdfReportDesignerListPage(): ReactElement {
  const { t, i18n } = useTranslation(['report-designer', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedRuleType, setSelectedRuleType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<PdfReportTemplateColumnKey>('updatedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const defaultColumnKeys = useMemo(() => TABLE_COLUMNS.map((column) => column.key as string), []);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('pdfReportDesigner.templatesTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [defaultColumnKeys, user?.id]);

  const filterRuleType = parseRuleTypeFilter(appliedFilterRows);
  const filterStatus = parseStatusFilter(appliedFilterRows);
  const effectiveRuleType =
    selectedRuleType === 'all'
      ? filterRuleType
      : (Number(selectedRuleType) as DocumentRuleType);
  const effectiveStatus =
    selectedStatus === 'all'
      ? filterStatus
      : selectedStatus === 'active';

  const { data, isLoading, isFetching } = usePdfReportTemplateList({
    pageNumber,
    pageSize,
    search: searchTerm.trim() || undefined,
    sortBy,
    sortDirection,
    ruleType: effectiveRuleType,
    isActive: effectiveStatus,
  });
  const templates = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, data?.totalPages ?? Math.ceil(totalCount / pageSize || 1));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as PdfReportTemplateColumnKey[];
  const deleteMutation = useDeletePdfReportTemplate();
  const generatePdfMutation = useGeneratePdfReportDocument();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ReportTemplateListItemDto | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfTemplate, setPdfTemplate] = useState<ReportTemplateListItemDto | null>(null);
  const [entityId, setEntityId] = useState('');
  const [copyingTemplateId, setCopyingTemplateId] = useState<number | null>(null);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, selectedRuleType, selectedStatus, appliedFilterRows, sortBy, sortDirection]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedRuleType !== 'all' ||
    selectedStatus !== 'all' ||
    appliedFilterRows.some((row) => row.value.trim().length > 0);
  const summaryText = useMemo(
    () =>
      t('pdfReportDesigner.listSummary', {
        from: startRow,
        to: endRow,
        total: totalCount,
      }),
    [endRow, startRow, t, totalCount]
  );
  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((row) => row.value.trim()).length,
    [appliedFilterRows]
  );

  const columns = useMemo<DataTableGridColumn<PdfReportTemplateColumnKey>[]>(
    () =>
      TABLE_COLUMNS.map((column) => ({
        key: column.key,
        label: t(column.labelKey),
        cellClassName: column.className,
        sortable: column.sortable,
      })),
    [t]
  );

  const baseColumns = useMemo(
    () =>
      columns.map((column) => ({
        key: column.key as string,
        label: column.label,
      })),
    [columns]
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => ({
        key,
        label: columns.find((column) => column.key === key)?.label ?? key,
      })),
    [columns, orderedVisibleColumns]
  );

  const mapRow = useCallback(
    (template: ReportTemplateListItemDto): Record<string, unknown> => ({
      id: template.id,
      title: template.title,
      layoutPreset: t('pdfReportDesigner.layoutPreset.customTitle'),
      ruleType: t(RULE_TYPE_LABEL_KEYS[template.ruleType] ?? String(template.ruleType)),
      isActive: template.isActive ? t('common.yes') : t('common.no'),
      default: template.default === true ? t('pdfReportDesigner.defaultBadge') : '',
      updatedDate: template.updatedDate
        ? new Date(template.updatedDate).toLocaleString(i18n.language)
        : '—',
    }),
    [i18n.language, t]
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () => templates.map(mapRow),
    [mapRow, templates]
  );

  const handleRefresh = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: pdfReportTemplateQueryKeys.list({
        pageNumber,
        pageSize,
        search: searchTerm.trim() || undefined,
        sortBy,
        sortDirection,
        ruleType: effectiveRuleType,
        isActive: effectiveStatus,
      }),
    });
  }, [effectiveRuleType, effectiveStatus, pageNumber, pageSize, queryClient, searchTerm, sortBy, sortDirection]);

  const getExportData = useCallback(async () => {
    return {
      columns: exportColumns,
      rows: templates.map(mapRow),
    };
  }, [exportColumns, mapRow, templates]);

  const renderSortIcon = useCallback(
    (key: PdfReportTemplateColumnKey): ReactElement => {
      if (sortBy !== key) return <ArrowUpDown className="ml-1 h-4 w-4 opacity-60" />;
      return sortDirection === 'asc' ? (
        <ArrowUp className="ml-1 h-4 w-4" />
      ) : (
        <ArrowDown className="ml-1 h-4 w-4" />
      );
    },
    [sortBy, sortDirection]
  );

  const handleDeleteClick = (template: ReportTemplateListItemDto): void => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleCopyClick = async (template: ReportTemplateListItemDto): Promise<void> => {
    setCopyingTemplateId(template.id);
    try {
      const detail = await pdfReportTemplateApi.getById(template.id);
      navigate('/pdf-report-designer/create', { state: { copyFrom: detail } });
    } catch (err) {
      toast.error(t('pdfReportDesigner.templateLoadFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCopyingTemplateId(null);
    }
  };

  const handlePdfClick = (template: ReportTemplateListItemDto): void => {
    setPdfTemplate(template);
    setEntityId('');
    setPdfDialogOpen(true);
  };

  const handleRowDeleteClick = (template: ReportTemplateListItemDto): void => {
    handleDeleteClick(template);
  };

  const handleCopyAction = (template: ReportTemplateListItemDto): void => {
    void handleCopyClick(template);
  };

  const handlePdfAction = (template: ReportTemplateListItemDto): void => {
    handlePdfClick(template);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!templateToDelete) return;
    try {
      await deleteMutation.mutateAsync(templateToDelete.id);
      toast.success(t('pdfReportDesigner.templateDeleted'));
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      toast.error(t('pdfReportDesigner.templateDeleteFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handlePdfGenerate = async (): Promise<void> => {
    if (!pdfTemplate) return;
    const id = Number(entityId);
    if (!Number.isInteger(id) || id < 1) {
      toast.error(t('pdfReportDesigner.enterValidDocumentId'));
      return;
    }
    try {
      const blob = await generatePdfMutation.mutateAsync({
        templateId: pdfTemplate.id,
        entityId: id,
      });
      downloadBlobAsPdf(blob, `rapor-${pdfTemplate.title}-${id}.pdf`);
      toast.success(t('pdfReportDesigner.pdfGenerated'));
      setPdfDialogOpen(false);
      setPdfTemplate(null);
      setEntityId('');
    } catch (err) {
      toast.error(t('pdfReportDesigner.pdfGenerateFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('pdfReportDesigner.templatesTitle')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('pdfReportDesigner.listDescription')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Badge variant="outline">{summaryText}</Badge>
            <Badge variant="outline">{t('pdfReportDesigner.detailLoadedOnDemand')}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link to="/pdf-report-designer/table-presets" className="inline-flex items-center gap-2">
              <TableProperties className="size-4" />
              Table Presets
            </Link>
          </Button>
          <Button asChild>
            <Link to="/pdf-report-designer/create" className="inline-flex items-center gap-2">
              <Plus className="size-4" />
              {t('pdfReportDesigner.createNew')}
            </Link>
          </Button>
        </div>
      </div>
      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
            {t('pdfReportDesigner.templatesTitle')}
          </CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="pdf-report-templates"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={FILTER_COLUMNS}
            defaultFilterColumn="ruleType"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="report-designer"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('pdfReportDesigner.searchPlaceholder')}
            onSearchChange={setSearchTerm}
            leftSlot={
              <>
                <Select value={selectedRuleType} onValueChange={setSelectedRuleType}>
                  <SelectTrigger className="h-9 w-[220px] border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-transparent dark:shadow-none">
                    <SelectValue placeholder={t('pdfReportDesigner.filterAllDocumentTypes')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('pdfReportDesigner.filterAllDocumentTypes')}</SelectItem>
                    {Object.entries(RULE_TYPE_LABEL_KEYS).map(([value, labelKey]) => (
                      <SelectItem key={value} value={value}>
                        {t(labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-9 w-[200px] border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-transparent dark:shadow-none">
                    <SelectValue placeholder={t('pdfReportDesigner.filterAllStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('pdfReportDesigner.filterAllStatuses')}</SelectItem>
                    <SelectItem value="active">{t('pdfReportDesigner.statusActive')}</SelectItem>
                    <SelectItem value="inactive">{t('pdfReportDesigner.statusInactive')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                  onClick={() => void handleRefresh()}
                  disabled={isLoading || isFetching}
                >
                  {isLoading || isFetching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {t('common.refresh')}
                </Button>
              </>
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <ManagementDataTableChrome>
              <DataTableGrid<ReportTemplateListItemDto, PdfReportTemplateColumnKey>
                columns={columns}
                visibleColumnKeys={orderedVisibleColumns}
                rows={templates}
                rowKey={(row) => row.id}
                renderCell={(template, key) => {
                  if (key === 'id') return template.id;
                  if (key === 'title') {
                    return (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{template.title}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {t('pdfReportDesigner.detailHint')}
                        </span>
                      </div>
                    );
                  }
                  if (key === 'layoutPreset') {
                    return (
                      <span className="text-slate-500">
                        {t('pdfReportDesigner.layoutPreset.customTitle')}
                      </span>
                    );
                  }
                  if (key === 'ruleType') {
                    return t(RULE_TYPE_LABEL_KEYS[template.ruleType] ?? String(template.ruleType));
                  }
                  if (key === 'isActive') {
                    return template.isActive ? t('common.yes') : t('common.no');
                  }
                  if (key === 'default') {
                    return template.default === true ? (
                      <Badge variant="secondary">{t('pdfReportDesigner.defaultBadge')}</Badge>
                    ) : (
                      '—'
                    );
                  }
                  if (key === 'updatedDate') {
                    return template.updatedDate
                      ? new Date(template.updatedDate).toLocaleString(i18n.language)
                      : '—';
                  }
                  return '—';
                }}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={(key) => {
                  if (sortBy === key) {
                    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                    return;
                  }
                  setSortBy(key);
                  setSortDirection('asc');
                }}
                renderSortIcon={renderSortIcon}
                isLoading={isLoading}
                isError={false}
                loadingText={t('common.loading')}
                emptyText={hasActiveFilters ? t('common.noResults') : t('pdfReportDesigner.noTemplates')}
                minTableWidthClassName="min-w-[1100px]"
                showActionsColumn
                actionsHeaderLabel={t('common.actions')}
                renderActionsCell={(template) => (
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          {copyingTemplateId === template.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="size-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/pdf-report-designer/edit/${template.id}`} className="flex items-center gap-2">
                            <Pencil className="size-4" />
                            {t('common.edit')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyAction(template)}>
                          <Copy className="size-4" />
                          {t('pdfReportDesigner.copy')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePdfAction(template)}>
                          <FileDown className="size-4" />
                          {t('pdfReportDesigner.generatePdf')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleRowDeleteClick(template)}
                        >
                          <Trash2 className="size-4" />
                          {t('common.delete.action')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                onRowDoubleClick={(template) => navigate(`/pdf-report-designer/edit/${template.id}`)}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={setPageSize}
                pageNumber={pageNumber}
                totalPages={totalPages}
                hasPreviousPage={pageNumber > 1}
                hasNextPage={pageNumber < totalPages}
                onPreviousPage={() => setPageNumber((current) => Math.max(1, current - 1))}
                onNextPage={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
                previousLabel={t('common.previous')}
                nextLabel={t('common.next')}
                paginationInfoText={summaryText}
                disablePaginationButtons={isFetching}
              />
            </ManagementDataTableChrome>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pdfReportDesigner.deleteTemplateTitle')}</DialogTitle>
            <DialogDescription>
              &quot;{templateToDelete?.title}&quot; {t('pdfReportDesigner.deleteTemplateConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pdfReportDesigner.generatePdfTitle')}</DialogTitle>
            <DialogDescription>
              {t('pdfReportDesigner.generatePdfDescription')} {pdfTemplate?.title}. {t('pdfReportDesigner.enterDocumentId')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="entityId">{t('pdfReportDesigner.documentId')}</Label>
              <Input
                id="entityId"
                type="number"
                min={1}
                placeholder={t('reportDesigner.form.documentIdPlaceholder')}
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handlePdfGenerate}
              disabled={generatePdfMutation.isPending || !entityId.trim()}
            >
              {generatePdfMutation.isPending
                ? t('pdfReportDesigner.generating')
                : t('pdfReportDesigner.generatePdf')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
