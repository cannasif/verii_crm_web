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
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, FileDown, TableProperties } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { usePdfReportTemplateList } from '../hooks/usePdfReportTemplateList';
import { useDeletePdfReportTemplate } from '../hooks/useDeletePdfReportTemplate';
import { useGeneratePdfReportDocument } from '../hooks/useGeneratePdfReportDocument';
import type { ReportTemplateGetDto } from '@/features/pdf-report';
import { DocumentRuleType } from '@/features/pdf-report';

const RULE_TYPE_LABEL_KEYS: Record<DocumentRuleType, string> = {
  [DocumentRuleType.Demand]: 'reportDesigner.ruleType.demand',
  [DocumentRuleType.Quotation]: 'reportDesigner.ruleType.quotation',
  [DocumentRuleType.Order]: 'reportDesigner.ruleType.order',
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = usePdfReportTemplateList();
  const templates = data?.items ?? [];
  const deleteMutation = useDeletePdfReportTemplate();
  const generatePdfMutation = useGeneratePdfReportDocument();
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
      toast.success(t('pdfReportDesigner.templateDeleted'));
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      toast.error(t('pdfReportDesigner.templateDeleteFailed'), {
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {t('pdfReportDesigner.templatesTitle')}
        </h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link to="/report-designer/table-presets" className="inline-flex items-center gap-2">
              <TableProperties className="size-4" />
              Table Presets
            </Link>
          </Button>
          <Button asChild>
            <Link to="/report-designer/create" className="inline-flex items-center gap-2">
              <Plus className="size-4" />
              {t('pdfReportDesigner.createNew')}
            </Link>
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('common.loading')}
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('pdfReportDesigner.noTemplates')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">{t('reportDesigner.list.id')}</TableHead>
                <TableHead>{t('pdfReportDesigner.title')}</TableHead>
                <TableHead>{t('pdfReportDesigner.layoutPreset.label')}</TableHead>
                <TableHead>{t('pdfReportDesigner.documentType')}</TableHead>
                <TableHead className="w-[80px]">{t('pdfReportDesigner.active')}</TableHead>
                <TableHead className="w-[100px]">{t('pdfReportDesigner.default')}</TableHead>
                <TableHead className="w-[100px] text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-mono text-slate-500">{template.id}</TableCell>
                  <TableCell className="font-medium">{template.title}</TableCell>
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
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/report-designer/edit/${template.id}`} className="flex items-center gap-2">
                            <Pencil className="size-4" />
                            {t('common.edit')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyClick(template)}>
                          <Copy className="size-4" />
                          {t('pdfReportDesigner.copy')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePdfClick(template)}>
                          <FileDown className="size-4" />
                          {t('pdfReportDesigner.generatePdf')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(template)}
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
