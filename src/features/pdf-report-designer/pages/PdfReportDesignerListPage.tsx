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
import { usePdfReportTemplateList } from '../hooks/usePdfReportTemplateList';
import { useDeletePdfReportTemplate } from '../hooks/useDeletePdfReportTemplate';
import { useGeneratePdfReportDocument } from '../hooks/useGeneratePdfReportDocument';
import type { ReportTemplateGetDto } from '@/features/pdf-report';
import { DocumentRuleType } from '@/features/pdf-report';

const RULE_TYPE_LABELS: Record<DocumentRuleType, string> = {
  [DocumentRuleType.Demand]: 'Talep',
  [DocumentRuleType.Quotation]: 'Teklif',
  [DocumentRuleType.Order]: 'Sipariş',
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
      toast.success(t('pdfReportDesigner.templateDeleted', 'Şablon silindi'));
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      toast.error(t('pdfReportDesigner.templateDeleteFailed', 'Şablon silinemedi'), {
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
      toast.error(t('pdfReportDesigner.enterValidDocumentId', 'Geçerli bir belge ID girin'));
      return;
    }
    try {
      const blob = await generatePdfMutation.mutateAsync({
        templateId: pdfTemplate.id,
        entityId: id,
      });
      downloadBlobAsPdf(blob, `rapor-${pdfTemplate.title}-${id}.pdf`);
      toast.success(t('pdfReportDesigner.pdfGenerated', 'PDF oluşturuldu'));
      setPdfDialogOpen(false);
      setPdfTemplate(null);
      setEntityId('');
    } catch (err) {
      toast.error(t('pdfReportDesigner.pdfGenerateFailed', 'PDF oluşturulamadı'), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {t('pdfReportDesigner.templatesTitle', 'Rapor Şablonları')}
        </h1>
        <Button asChild>
          <Link to="/report-designer/create" className="inline-flex items-center gap-2">
            <Plus className="size-4" />
            {t('pdfReportDesigner.createNew', 'Yeni Oluştur')}
          </Link>
        </Button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('common.loading', 'Yükleniyor…')}
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('pdfReportDesigner.noTemplates', 'Henüz şablon yok. Yeni Oluştur ile ekleyebilirsiniz.')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">ID</TableHead>
                <TableHead>{t('pdfReportDesigner.title', 'Başlık')}</TableHead>
                <TableHead>{t('pdfReportDesigner.documentType', 'Belge tipi')}</TableHead>
                <TableHead className="w-[80px]">{t('pdfReportDesigner.active', 'Aktif')}</TableHead>
                <TableHead className="w-[100px]">{t('pdfReportDesigner.default', 'Varsayılan')}</TableHead>
                <TableHead className="w-[100px] text-right">{t('common.actions', 'İşlem')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-mono text-slate-500">{template.id}</TableCell>
                  <TableCell className="font-medium">{template.title}</TableCell>
                  <TableCell>{RULE_TYPE_LABELS[template.ruleType] ?? template.ruleType}</TableCell>
                  <TableCell>{template.isActive ? t('common.yes', 'Evet') : t('common.no', 'Hayır')}</TableCell>
                  <TableCell>
                    {template.default === true ? (
                      <Badge variant="secondary">{t('pdfReportDesigner.defaultBadge', 'Varsayılan')}</Badge>
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
                            {t('common.edit', 'Düzenle')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyClick(template)}>
                          <Copy className="size-4" />
                          {t('pdfReportDesigner.copy', 'Kopyala')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePdfClick(template)}>
                          <FileDown className="size-4" />
                          {t('pdfReportDesigner.generatePdf', 'PDF oluştur')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(template)}
                        >
                          <Trash2 className="size-4" />
                          {t('common.delete', 'Sil')}
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
            <DialogTitle>{t('pdfReportDesigner.deleteTemplateTitle', 'Şablonu sil')}</DialogTitle>
            <DialogDescription>
              &quot;{templateToDelete?.title}&quot; {t('pdfReportDesigner.deleteTemplateConfirm', 'şablonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel', 'İptal')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {t('common.delete', 'Sil')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pdfReportDesigner.generatePdfTitle', 'PDF oluştur')}</DialogTitle>
            <DialogDescription>
              {t('pdfReportDesigner.generatePdfDescription', 'Şablon:')} {pdfTemplate?.title}. {t('pdfReportDesigner.enterDocumentId', 'Belge ID (Teklif / Sipariş / Talep ID) girin.')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="entityId">{t('pdfReportDesigner.documentId', 'Belge ID')}</Label>
              <Input
                id="entityId"
                type="number"
                min={1}
                placeholder="Örn. 123"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>
              {t('common.cancel', 'İptal')}
            </Button>
            <Button
              onClick={handlePdfGenerate}
              disabled={generatePdfMutation.isPending || !entityId.trim()}
            >
              {generatePdfMutation.isPending
                ? t('pdfReportDesigner.generating', 'Oluşturuluyor…')
                : t('pdfReportDesigner.generatePdf', 'PDF oluştur')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
