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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Table Preset Library
          </h1>
          <p className="text-sm text-slate-500">
            Builder tablolari icin server-side tekrar kullanilabilir preset kaynagi.
          </p>
        </div>
        <Button onClick={openCreate} className="inline-flex items-center gap-2">
          <Plus className="size-4" />
          Yeni preset
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50">
        {isLoading ? (
          <div className="p-8 text-sm text-slate-500">Yukleniyor...</div>
        ) : presets.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">Henuz preset yok.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Belge tipi</TableHead>
                <TableHead>Sutun</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presets.map((preset) => (
                <TableRow key={preset.id}>
                  <TableCell className="font-mono text-slate-500">{preset.id}</TableCell>
                  <TableCell className="font-medium">{preset.name}</TableCell>
                  <TableCell className="font-mono text-xs">{preset.key}</TableCell>
                  <TableCell>{RULE_TYPE_LABELS[preset.ruleType] ?? String(preset.ruleType)}</TableCell>
                  <TableCell>{preset.columns.length}</TableCell>
                  <TableCell>
                    {preset.isActive ? <Badge>Aktif</Badge> : <Badge variant="outline">Pasif</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(preset)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(preset)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Kolonlari ve table options alanini JSON olarak duzenleyebilirsin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Ad</Label>
                <Input value={formState.name} onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Key</Label>
                <Input value={formState.key} onChange={(e) => setFormState((s) => ({ ...s, key: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Belge tipi</Label>
                <Select
                  value={String(formState.ruleType)}
                  onValueChange={(value) => setFormState((s) => ({ ...s, ruleType: Number(value) as DocumentRuleType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(DocumentRuleType.Demand)}>Demand</SelectItem>
                    <SelectItem value={String(DocumentRuleType.Quotation)}>Quotation</SelectItem>
                    <SelectItem value={String(DocumentRuleType.Order)}>Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Durum</Label>
                <Select
                  value={formState.isActive ? 'active' : 'inactive'}
                  onValueChange={(value) => setFormState((s) => ({ ...s, isActive: value === 'active' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Pasif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Columns JSON</Label>
              <Textarea
                value={formState.columnsJson}
                onChange={(e) => setFormState((s) => ({ ...s, columnsJson: e.target.value }))}
                rows={12}
                className="font-mono text-xs"
              />
            </div>
            <div className="grid gap-2">
              <Label>Table Options JSON</Label>
              <Textarea
                value={formState.optionsJson}
                onChange={(e) => setFormState((s) => ({ ...s, optionsJson: e.target.value }))}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgec
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
