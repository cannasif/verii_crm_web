import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ArrowLeft, TableProperties, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { DocumentRuleType, type PdfTablePresetCreateDto, type PdfTablePresetDto } from '@/features/pdf-report';
import { usePdfTablePresetList } from '../hooks/usePdfTablePresetList';
import { useCreatePdfTablePreset } from '../hooks/useCreatePdfTablePreset';
import { useUpdatePdfTablePreset } from '../hooks/useUpdatePdfTablePreset';
import { useDeletePdfTablePreset } from '../hooks/useDeletePdfTablePreset';

const EMPTY_COLUMNS_JSON = JSON.stringify(
  [{ label: 'Aciklama', path: 'Lines.ProductName', align: 'left', format: 'text' }],
  null,
  2
);

const EMPTY_OPTIONS_JSON = JSON.stringify(
  { repeatHeader: true, dense: true, showBorders: true },
  null,
  2
);

interface PresetFormState {
  name: string;
  key: string;
  ruleType: DocumentRuleType;
  columnsJson: string;
  optionsJson: string;
  isActive: boolean;
}

const RULE_TYPE_LABELS: Record<DocumentRuleType, string> = {
  [DocumentRuleType.Demand]: 'Demand',
  [DocumentRuleType.Quotation]: 'Quotation',
  [DocumentRuleType.Order]: 'Order',
  [DocumentRuleType.FastQuotation]: 'Fast Quotation',
  [DocumentRuleType.Activity]: 'Activity',
};

function toFormState(preset?: PdfTablePresetDto | null): PresetFormState {
  if (!preset) {
    return {
      name: '',
      key: '',
      ruleType: DocumentRuleType.Quotation,
      columnsJson: EMPTY_COLUMNS_JSON,
      optionsJson: EMPTY_OPTIONS_JSON,
      isActive: true,
    };
  }

  return {
    name: preset.name,
    key: preset.key,
    ruleType: preset.ruleType,
    columnsJson: JSON.stringify(preset.columns, null, 2),
    optionsJson: JSON.stringify(preset.tableOptions ?? {}, null, 2),
    isActive: preset.isActive,
  };
}

export function PdfTablePresetManagementPage(): ReactElement {
  const { data, isLoading } = usePdfTablePresetList();
  const presets = data?.items ?? [];
  const createMutation = useCreatePdfTablePreset();
  const updateMutation = useUpdatePdfTablePreset();
  const deleteMutation = useDeletePdfTablePreset();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PdfTablePresetDto | null>(null);
  const [formState, setFormState] = useState<PresetFormState>(() => toFormState());

  const dialogTitle = useMemo(
    () => (editingPreset ? 'Table preset duzenle' : 'Table preset olustur'),
    [editingPreset]
  );

  const openCreate = (): void => {
    setEditingPreset(null);
    setFormState(toFormState());
    setDialogOpen(true);
  };

  const openEdit = (preset: PdfTablePresetDto): void => {
    setEditingPreset(preset);
    setFormState(toFormState(preset));
    setDialogOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      const columns = JSON.parse(formState.columnsJson) as PdfTablePresetCreateDto['columns'];
      const tableOptions = JSON.parse(formState.optionsJson) as PdfTablePresetCreateDto['tableOptions'];

      const payload: PdfTablePresetCreateDto = {
        name: formState.name.trim(),
        key: formState.key.trim(),
        ruleType: formState.ruleType,
        columns,
        tableOptions,
        isActive: formState.isActive,
      };

      if (editingPreset) {
        await updateMutation.mutateAsync({ id: editingPreset.id, data: payload });
        toast.success('Preset guncellendi');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Preset olusturuldu');
      }

      setDialogOpen(false);
    } catch (error) {
      toast.error('Preset kaydedilemedi', {
        description: error instanceof Error ? error.message : 'JSON veya alanlar gecersiz',
      });
    }
  };

  const handleDelete = async (preset: PdfTablePresetDto): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(preset.id);
      toast.success('Preset silindi');
    } catch (error) {
      toast.error('Preset silinemedi', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 relative min-h-screen bg-stone-50/50 dark:bg-[#0f0a15]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="size-9 rounded-xl hover:bg-white dark:hover:bg-white/5">
            <Link to="/pdf-report-designer">
              <ArrowLeft className="size-5 text-slate-500" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <TableProperties className="size-5 text-pink-500" />
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Table Preset Library
              </h1>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Builder tablolari icin server-side tekrar kullanilabilir preset kaynagi.
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="h-10 bg-linear-to-r from-pink-600 to-orange-600 px-5 font-bold text-white shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.02] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0"
        >
          <Plus className="size-4 mr-2" />
          Yeni preset
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 shadow-xl ring-1 ring-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none dark:ring-0">
        <div className="absolute inset-0 pointer-events-none bg-linear-to-b from-pink-500/0 to-orange-500/0 dark:from-pink-500/5 dark:to-orange-500/5 opacity-30" />
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3">
            <Sparkles className="size-8 text-pink-400 animate-pulse" />
            <div className="text-sm font-medium text-slate-400">Yukleniyor...</div>
          </div>
        ) : presets.length === 0 ? (
          <div className="p-20 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
              <TableProperties className="size-6" />
            </div>
            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Henuz preset yok</div>
            <div className="mt-1 text-xs text-slate-400">Yeni bir tablo sablonu olusturarak basla.</div>
          </div>
        ) : (
          <div className="relative z-10 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200/60 bg-stone-50/50 hover:bg-stone-50/80 dark:border-white/10 dark:bg-white/5">
                  <TableHead className="w-[80px] font-bold text-slate-600 dark:text-slate-400">ID</TableHead>
                  <TableHead className="font-bold text-slate-600 dark:text-slate-400">Ad</TableHead>
                  <TableHead className="font-bold text-slate-600 dark:text-slate-400">Key</TableHead>
                  <TableHead className="font-bold text-slate-600 dark:text-slate-400">Belge tipi</TableHead>
                  <TableHead className="font-bold text-slate-600 dark:text-slate-400 text-center">Sutun</TableHead>
                  <TableHead className="font-bold text-slate-600 dark:text-slate-400">Durum</TableHead>
                  <TableHead className="text-right font-bold text-slate-600 dark:text-slate-400">Islem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presets.map((preset) => (
                  <TableRow key={preset.id} className="border-b border-slate-100/60 transition-colors hover:bg-slate-50/50 dark:border-white/5 dark:hover:bg-white/5">
                    <TableCell className="font-mono text-xs text-slate-400">#{preset.id}</TableCell>
                    <TableCell className="font-bold text-slate-700 dark:text-slate-200">{preset.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-white/10 dark:text-slate-400">
                        {preset.key}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-white/50 text-[10px] font-bold uppercase tracking-wider dark:bg-white/5">
                        {RULE_TYPE_LABELS[preset.ruleType] ?? String(preset.ruleType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-500">
                      {preset.columns.length}
                    </TableCell>
                    <TableCell>
                      {preset.isActive ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
                          Pasif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(preset)}
                          className="size-8 rounded-lg text-slate-400 hover:bg-white hover:text-pink-500 dark:hover:bg-white/5"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(preset)}
                          className="size-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton={false} className="max-w-3xl border-slate-300/80 bg-stone-50/95 p-0 shadow-2xl ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1025]/95 dark:ring-0">
          <div className="absolute inset-0 pointer-events-none bg-linear-to-b from-pink-500/0 to-orange-500/0 dark:from-pink-500/5 dark:to-orange-500/5 opacity-50" />
          
          <div className="relative z-10">
            <DialogClose className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-full border border-slate-200/60 bg-white/50 text-slate-400 transition-all duration-300 hover:bg-white hover:text-pink-500 hover:rotate-90 dark:border-white/10 dark:bg-white/5 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-pink-400">
              <X className="size-4" />
              <span className="sr-only">Kapat</span>
            </DialogClose>

            <DialogHeader className="px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500 ring-1 ring-pink-500/20 dark:bg-pink-500/20 dark:text-pink-400">
                  <TableProperties className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{dialogTitle}</DialogTitle>
                  <DialogDescription className="text-xs font-medium text-slate-500">
                    Kolonlari ve tablo ayarlari alanini JSON formatinda duzenleyin.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid gap-4 p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ad</Label>
                  <Input
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                    className="h-10 border-slate-200/60 bg-white transition-all focus:ring-pink-500/20 dark:border-white/10 dark:bg-white/5"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Key</Label>
                  <Input
                    value={formState.key}
                    onChange={(e) => setFormState((s) => ({ ...s, key: e.target.value }))}
                    className="h-10 border-slate-200/60 bg-white font-mono transition-all focus:ring-pink-500/20 dark:border-white/10 dark:bg-white/5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Belge tipi</Label>
                  <Select
                    value={String(formState.ruleType)}
                    onValueChange={(value) => setFormState((s) => ({ ...s, ruleType: Number(value) as DocumentRuleType }))}
                  >
                    <SelectTrigger className="h-10 border-slate-200/60 bg-white dark:border-white/10 dark:bg-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(DocumentRuleType.Demand)}>Demand</SelectItem>
                      <SelectItem value={String(DocumentRuleType.Quotation)}>Quotation</SelectItem>
                      <SelectItem value={String(DocumentRuleType.Order)}>Order</SelectItem>
                      <SelectItem value={String(DocumentRuleType.FastQuotation)}>Fast Quotation</SelectItem>
                      <SelectItem value={String(DocumentRuleType.Activity)}>Activity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Durum</Label>
                  <Select
                    value={formState.isActive ? 'active' : 'inactive'}
                    onValueChange={(value) => setFormState((s) => ({ ...s, isActive: value === 'active' }))}
                  >
                    <SelectTrigger className="h-10 border-slate-200/60 bg-white dark:border-white/10 dark:bg-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Columns JSON</Label>
                <Textarea
                  value={formState.columnsJson}
                  onChange={(e) => setFormState((s) => ({ ...s, columnsJson: e.target.value }))}
                  rows={10}
                  className="font-mono text-[11px] border-slate-200/60 bg-white transition-all focus:ring-pink-500/20 dark:border-white/10 dark:bg-white/5"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Table Options JSON</Label>
                <Textarea
                  value={formState.optionsJson}
                  onChange={(e) => setFormState((s) => ({ ...s, optionsJson: e.target.value }))}
                  rows={5}
                  className="font-mono text-[11px] border-slate-200/60 bg-white transition-all focus:ring-pink-500/20 dark:border-white/10 dark:bg-white/5"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-stone-100/50 dark:bg-white/5 border-t border-slate-200/60 dark:border-white/10">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="h-10 border-slate-200 bg-transparent px-6 font-bold text-slate-600 transition-all hover:bg-white dark:border-white/10 dark:text-slate-400"
              >
                Vazgec
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="h-10 bg-linear-to-r from-pink-600 to-orange-600 px-8 font-bold text-white shadow-lg shadow-pink-500/20 transition-all hover:scale-[1.02] hover:from-pink-500 active:scale-[0.98] opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
