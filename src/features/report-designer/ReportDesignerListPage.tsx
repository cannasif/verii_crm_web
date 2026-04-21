import type { ReactElement } from 'react';
import { useState } from 'react';
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
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useReportTemplateList } from './hooks/useReportTemplateList';
import { useDeleteReportTemplate } from './hooks/useDeleteReportTemplate';
import { useGenerateReportPdf } from './hooks/useGenerateReportPdf';
import type { ReportTemplateGetDto } from './types/report-template-types';
import { DocumentRuleType } from './types/report-template-types';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';

function downloadBlobAsPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportDesignerListPage(): ReactElement {
  const { t } = useTranslation(['report-designer', 'common']);
  const { canCreate, canUpdate, canDelete } = useCrudPermissions('reports.designer.list.view');
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useReportTemplateList();
  const deleteMutation = useDeleteReportTemplate();
  const generatePdfMutation = useGenerateReportPdf();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ReportTemplateGetDto | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfTemplate, setPdfTemplate] = useState<ReportTemplateGetDto | null>(null);
  const [entityId, setEntityId] = useState('');

  const handleDeleteClick = (template: ReportTemplateGetDto): void => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!templateToDelete) return;
    try {
      await deleteMutation.mutateAsync(templateToDelete.id);
      toast.success(t('common.templateDeleted'));
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      toast.error(t('common.templateDeleteFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleCopyClick = (template: ReportTemplateGetDto): void => {
    navigate('/report-designer/create', { state: { copyFrom: template } });
  };

  const handlePdfClick = (template: ReportTemplateGetDto): void => {
    setPdfTemplate(template);
    setEntityId('');
    setPdfDialogOpen(true);
  };

  const handlePdfGenerate = async (): Promise<void> => {
    if (!pdfTemplate) return;
    const id = Number(entityId);
    if (!Number.isInteger(id) || id < 1) {
      toast.error(t('common.enterValidDocumentId'));
      return;
    }
    try {
      const blob = await generatePdfMutation.mutateAsync({
        templateId: pdfTemplate.id,
        entityId: id,
      });
      downloadBlobAsPdf(blob, `rapor-${pdfTemplate.title}-${id}.pdf`);
      toast.success(t('common.pdfGenerated'));
      setPdfDialogOpen(false);
      setPdfTemplate(null);
      setEntityId('');
    } catch (err) {
      toast.error(t('common.pdfGenerateFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {t('reportDesigner.list.title')}
        </h1>
        {canCreate ? (
          <Button asChild>
            <Link to="/report-designer/create" className="inline-flex items-center gap-2">
              <Plus className="size-4" />
              {t('reportDesigner.list.createNew')}
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('common.loading')}
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('reportDesigner.list.noTemplates')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">{t('reportDesigner.list.id')}</TableHead>
                <TableHead>{t('reportDesigner.form.title')}</TableHead>
                <TableHead>{t('reportDesigner.list.documentType')}</TableHead>
                <TableHead className="w-[80px]">{t('reportDesigner.list.active')}</TableHead>
                <TableHead className="w-[100px]">{t('reportDesigner.list.default')}</TableHead>
                <TableHead className="w-[100px] text-right">{t('reportDesigner.list.action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-mono text-slate-500">{template.id}</TableCell>
                  <TableCell className="font-medium">{template.title}</TableCell>
                  <TableCell>
                    {template.ruleType === DocumentRuleType.Demand
                      ? t('reportDesigner.ruleType.demand')
                      : template.ruleType === DocumentRuleType.Quotation
                        ? t('reportDesigner.ruleType.quotation')
                        : template.ruleType === DocumentRuleType.Order
                          ? t('reportDesigner.ruleType.order')
                          : template.ruleType === DocumentRuleType.FastQuotation
                            ? t('reportDesigner.ruleType.fastQuotation')
                            : template.ruleType === DocumentRuleType.Activity
                              ? t('reportDesigner.ruleType.activity')
                              : template.ruleType}
                  </TableCell>
                  <TableCell>{template.isActive ? t('common.yes') : t('common.no')}</TableCell>
                  <TableCell>
                    {template.default === true ? (
                      <Badge variant="secondary">{t('reportDesigner.list.defaultBadge')}</Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate ? (
                          <DropdownMenuItem asChild>
                            <Link to={`/report-designer/edit/${template.id}`} className="flex items-center gap-2">
                              <Pencil className="size-4" />
                              {t('common.edit')}
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        {canCreate ? (
                          <DropdownMenuItem onClick={() => handleCopyClick(template)}>
                            <Copy className="size-4" />
                            {t('pdfReportDesigner.copy')}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={() => handlePdfClick(template)}>
                          <FileDown className="size-4" />
                          {t('pdfReportDesigner.generatePdf')}
                        </DropdownMenuItem>
                        {canDelete ? (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteClick(template)}
                          >
                            <Trash2 className="size-4" />
                            {t('common.delete.action')}
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={canDelete && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
              {generatePdfMutation.isPending ? t('pdfReportDesigner.generating') : t('pdfReportDesigner.generatePdf')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
