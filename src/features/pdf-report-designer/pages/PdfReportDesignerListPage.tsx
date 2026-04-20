import type { ReactElement } from 'react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Search,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { usePdfReportTemplateList } from '../hooks/usePdfReportTemplateList';
import { useDeletePdfReportTemplate } from '../hooks/useDeletePdfReportTemplate';
import { useGeneratePdfReportDocument } from '../hooks/useGeneratePdfReportDocument';
import { pdfReportTemplateApi, type ReportTemplateListItemDto } from '@/features/pdf-report';
import { DocumentRuleType } from '@/features/pdf-report';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const RULE_TYPE_LABEL_KEYS: Record<DocumentRuleType, string> = {
  [DocumentRuleType.Demand]: 'reportDesigner.ruleType.demand',
  [DocumentRuleType.Quotation]: 'reportDesigner.ruleType.quotation',
  [DocumentRuleType.Order]: 'reportDesigner.ruleType.order',
  [DocumentRuleType.FastQuotation]: 'reportDesigner.ruleType.fastQuotation',
  [DocumentRuleType.Activity]: 'reportDesigner.ruleType.activity',
};

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
  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedRuleType, setSelectedRuleType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const deferredSearch = useDeferredValue(searchTerm.trim());
  const { data, isLoading, isFetching } = usePdfReportTemplateList({
    pageNumber,
    pageSize,
    search: deferredSearch || undefined,
    ruleType:
      selectedRuleType === 'all'
        ? undefined
        : (Number(selectedRuleType) as DocumentRuleType),
    isActive:
      selectedStatus === 'all'
        ? undefined
        : selectedStatus === 'active',
  });
  const templates = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, data?.totalPages ?? Math.ceil(totalCount / pageSize || 1));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
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
  }, [deferredSearch, pageSize, selectedRuleType, selectedStatus]);

  const hasActiveFilters = deferredSearch.length > 0 || selectedRuleType !== 'all' || selectedStatus !== 'all';
  const summaryText = useMemo(
    () =>
      t('pdfReportDesigner.listSummary', {
        from: startRow,
        to: endRow,
        total: totalCount,
      }),
    [endRow, startRow, t, totalCount]
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
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {t('pdfReportDesigner.templatesTitle')}
          </h1>
          <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            {t('pdfReportDesigner.listDescription')}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50 lg:grid-cols-[minmax(0,1fr),220px,220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('pdfReportDesigner.searchPlaceholder')}
          />
        </div>
        <Select value={selectedRuleType} onValueChange={setSelectedRuleType}>
          <SelectTrigger>
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
          <SelectTrigger>
            <SelectValue placeholder={t('pdfReportDesigner.filterAllStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('pdfReportDesigner.filterAllStatuses')}</SelectItem>
            <SelectItem value="active">{t('pdfReportDesigner.statusActive')}</SelectItem>
            <SelectItem value="inactive">{t('pdfReportDesigner.statusInactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('common.loading')}
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {hasActiveFilters ? t('common.noResults') : t('pdfReportDesigner.noTemplates')}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">{t('reportDesigner.list.id')}</TableHead>
                  <TableHead>{t('pdfReportDesigner.title')}</TableHead>
                  <TableHead>{t('pdfReportDesigner.layoutPreset.label')}</TableHead>
                  <TableHead>{t('pdfReportDesigner.documentType')}</TableHead>
                  <TableHead className="w-[80px]">{t('pdfReportDesigner.active')}</TableHead>
                  <TableHead className="w-[100px]">{t('pdfReportDesigner.default')}</TableHead>
                  <TableHead className="w-[180px]">{t('pdfReportDesigner.updatedDate')}</TableHead>
                  <TableHead className="w-[100px] text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-mono text-slate-500">{template.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{template.title}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {t('pdfReportDesigner.detailHint')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-500">{t('pdfReportDesigner.layoutPreset.customTitle')}</span>
                    </TableCell>
                    <TableCell>{t(RULE_TYPE_LABEL_KEYS[template.ruleType] ?? String(template.ruleType))}</TableCell>
                    <TableCell>{template.isActive ? t('common.yes') : t('common.no')}</TableCell>
                    <TableCell>
                      {template.default === true ? (
                        <Badge variant="secondary">{t('pdfReportDesigner.defaultBadge')}</Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {template.updatedDate
                        ? new Date(template.updatedDate).toLocaleString(i18n.language)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-slate-500 dark:text-slate-400">{summaryText}</div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">{t('pdfReportDesigner.pageSizeLabel')}</Label>
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="h-9 w-[88px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  {t('pdfReportDesigner.pageLabel', { current: pageNumber, total: totalPages })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
                  disabled={pageNumber <= 1 || isFetching}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
                  disabled={pageNumber >= totalPages || isFetching}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

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
