import { type ChangeEvent, type FormEvent, type ReactElement, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StockCreateDto } from '../types';
import { useCreateMirrorStock } from '../hooks/useCreateMirrorStock';

const INITIAL_FORM: StockCreateDto = {
  erpStockCode: '',
  stockName: '',
  unit: 'AD',
  ureticiKodu: '',
  grupKodu: '',
  grupAdi: '',
  kod1: '',
  kod1Adi: '',
  kod2: '',
  kod2Adi: '',
  kod3: '',
  kod3Adi: '',
  kod4: '',
  kod4Adi: '',
  kod5: '',
  kod5Adi: '',
  branchCode: 0,
};

const optionalTextKeys = [
  'unit',
  'ureticiKodu',
  'grupKodu',
  'grupAdi',
  'kod1',
  'kod1Adi',
  'kod2',
  'kod2Adi',
  'kod3',
  'kod3Adi',
  'kod4',
  'kod4Adi',
  'kod5',
  'kod5Adi',
] as const;

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildPayload(form: StockCreateDto): StockCreateDto {
  const payload: StockCreateDto = {
    erpStockCode: form.erpStockCode.trim(),
    stockName: form.stockName.trim(),
    branchCode: Number.isFinite(Number(form.branchCode)) ? Number(form.branchCode) : 0,
  };

  optionalTextKeys.forEach((key) => {
    const value = normalizeText(form[key]);
    if (value) {
      payload[key] = value;
    }
  });

  return payload;
}

type TextField = {
  key: keyof StockCreateDto;
  labelKey: string;
  required?: boolean;
  placeholder?: string;
};

const mainFields: TextField[] = [
  { key: 'erpStockCode', labelKey: 'mirrorCreate.erpStockCode', required: true, placeholder: 'MIR-001' },
  { key: 'stockName', labelKey: 'mirrorCreate.stockName', required: true, placeholder: 'Mirror stok adı' },
  { key: 'unit', labelKey: 'mirrorCreate.unit', required: true, placeholder: 'AD' },
  { key: 'ureticiKodu', labelKey: 'mirrorCreate.ureticiKodu', placeholder: 'Opsiyonel' },
];

const groupFields: TextField[] = [
  { key: 'grupKodu', labelKey: 'mirrorCreate.grupKodu' },
  { key: 'grupAdi', labelKey: 'mirrorCreate.grupAdi' },
  { key: 'kod1', labelKey: 'mirrorCreate.kod1' },
  { key: 'kod1Adi', labelKey: 'mirrorCreate.kod1Adi' },
  { key: 'kod2', labelKey: 'mirrorCreate.kod2' },
  { key: 'kod2Adi', labelKey: 'mirrorCreate.kod2Adi' },
  { key: 'kod3', labelKey: 'mirrorCreate.kod3' },
  { key: 'kod3Adi', labelKey: 'mirrorCreate.kod3Adi' },
];

export function StockMirrorCreateDialog(): ReactElement {
  const { t } = useTranslation(['stock', 'common']);
  const createMirrorStock = useCreateMirrorStock();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StockCreateDto>(INITIAL_FORM);

  const isValid = useMemo(
    () => form.erpStockCode.trim().length > 0 && form.stockName.trim().length > 0 && (form.unit ?? '').trim().length > 0,
    [form.erpStockCode, form.stockName, form.unit]
  );

  const setField = (key: keyof StockCreateDto) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = key === 'branchCode' ? Number(event.target.value) : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (!nextOpen && !createMirrorStock.isPending) {
      setForm(INITIAL_FORM);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!isValid || createMirrorStock.isPending) {
      return;
    }

    createMirrorStock.mutate(buildPayload(form), {
      onSuccess: () => handleOpenChange(false),
    });
  };

  const renderTextField = (field: TextField): ReactElement => (
    <div key={field.key} className="space-y-2">
      <Label htmlFor={`mirror-stock-${field.key}`} className="text-xs font-bold text-slate-600 dark:text-slate-300">
        {t(field.labelKey)}
        {field.required ? <span className="ml-1 text-primary">*</span> : null}
      </Label>
      <Input
        id={`mirror-stock-${field.key}`}
        value={String(form[field.key] ?? '')}
        onChange={setField(field.key)}
        placeholder={field.placeholder ?? t('mirrorCreate.optional')}
        className="h-11 rounded-xl bg-white dark:bg-white/5"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-xl bg-gradient-to-r from-primary to-orange-500 px-4 text-white shadow-lg shadow-primary/20 hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" />
          {t('list.createMirrorStock')}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] !max-w-[860px] max-h-[90vh] overflow-y-auto rounded-3xl border-slate-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-[#130822]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left dark:border-white/10">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {t('mirrorCreate.title')}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              {t('mirrorCreate.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-6 py-6">
            <section className="grid gap-4 md:grid-cols-2">
              {mainFields.map(renderTextField)}
              <div className="space-y-2">
                <Label htmlFor="mirror-stock-branchCode" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t('mirrorCreate.branchCode')}
                </Label>
                <Input
                  id="mirror-stock-branchCode"
                  type="number"
                  value={form.branchCode}
                  onChange={setField('branchCode')}
                  className="h-11 rounded-xl bg-white dark:bg-white/5"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('mirrorCreate.groupTitle')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('mirrorCreate.groupDescription')}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">{groupFields.map(renderTextField)}</div>
            </section>
          </div>

          <DialogFooter className="border-t border-slate-100 px-6 py-5 dark:border-white/10">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={createMirrorStock.isPending}>
              {t('detail.cancel')}
            </Button>
            <Button type="submit" disabled={!isValid || createMirrorStock.isPending}>
              {createMirrorStock.isPending ? t('detail.saving') : t('detail.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
