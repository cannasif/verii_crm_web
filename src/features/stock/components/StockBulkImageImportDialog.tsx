import { type ChangeEvent, type ReactElement, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ImagePlus, Loader2, Upload, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { stockApi } from '../api/stock-api';

export function StockBulkImageImportDialog(): ReactElement {
  const { t } = useTranslation('stock');
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const helperLines = useMemo(
    () => [
      t('bulkImport.rule1', { defaultValue: 'ZIP içindeki klasörler ERP stok koduna göre gruplanmalıdır.' }),
      t('bulkImport.rule2', { defaultValue: 'Desteklenen örnekler: STK-001/resim1.jpg, STK-001/1/resim2.png, Resimler/STK-001/resim3.jpg' }),
      t('bulkImport.rule3', { defaultValue: 'Sistem stok kodunu bulursa görselleri o stoğa, sanki elle yüklenmiş gibi ekler; bulamazsa sadece o dosyayı atlar.' }),
      t('bulkImport.rule4', { defaultValue: 'Büyük arşivler arka planda Hangfire job olarak işlenir. Bu alan ZIP arşivi bekler.' }),
    ],
    [t]
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!file) {
      toast.error(t('bulkImport.fileRequired', { defaultValue: 'Önce bir ZIP dosyası seç.' }));
      return;
    }

    setSubmitting(true);
    try {
      const queued = await stockApi.queueBulkImageImport(file);
      toast.success(
        t('bulkImport.queued', {
          defaultValue: 'Toplu görsel içe aktarma kuyruğa alındı. Job: {{jobId}}',
          jobId: queued.jobId,
        })
      );
      setOpen(false);
      setFile(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('messages.error');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white"
      >
        <ImagePlus className="mr-2 h-4 w-4" />
        {t('bulkImport.button', { defaultValue: 'Toplu görsel yükle' })}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('bulkImport.title', { defaultValue: 'Toplu stok görsel yükleme' })}</DialogTitle>
            <DialogDescription>
              {t(
                'bulkImport.description',
                {
                  defaultValue:
                    'Tek ZIP yükle. Sistem klasör adından ERP stok kodunu okuyup görselleri ilgili stoğa arka planda eklesin.',
                }
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 p-5 dark:border-zinc-700 dark:bg-zinc-900/40">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-800">
                  <Archive className="h-5 w-5 text-pink-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {t('bulkImport.structureTitle', { defaultValue: 'ZIP yapısı' })}
                  </p>
                  <div className="space-y-2">
                    <code className="block rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-100">
                      STK-001/resim1.jpg
                    </code>
                    <code className="block rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-100">
                      STK-001/1/resim2.png
                    </code>
                    <code className="block rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-100">
                      Resimler/STK-001/resim3.jpg
                    </code>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-bulk-image-zip">
                {t('bulkImport.selectArchive', { defaultValue: 'ZIP arşivi seç' })}
              </Label>
              <Input id="stock-bulk-image-zip" type="file" accept=".zip,application/zip" onChange={handleFileChange} />
              {file ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900/40">
              <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
                {t('bulkImport.notesTitle', { defaultValue: 'Nasıl çalışır?' })}
              </p>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                {helperLines.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              {t('images.cancel', { defaultValue: 'İptal' })}
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !file}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('bulkImport.submitting', { defaultValue: 'Sıraya alınıyor...' })}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('bulkImport.submit', { defaultValue: 'ZIP yükle ve kuyruğa al' })}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
