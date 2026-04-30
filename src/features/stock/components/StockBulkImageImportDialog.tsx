import { type ChangeEvent, type ReactElement, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ImagePlus, Loader2, Upload, X, Archive } from 'lucide-react';
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
        className="h-11 bg-linear-to-r from-pink-600 to-orange-600 px-6 font-bold text-white shadow-lg shadow-pink-500/20 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] rounded-xl opacity-75 grayscale-[0] dark:opacity-100 dark:grayscale-0"
      >
        <ImagePlus className="mr-2 h-4 w-4" />
        {t('bulkImport.button', { defaultValue: 'Toplu görsel yükle' })}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-1rem)] sm:w-[calc(50vw-2rem)] !max-w-[96vw] xl:max-w-[800px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 dark:bg-[#130822]/90 border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2.5rem]"
        >
          <DialogHeader className="px-6 sm:px-8 py-3 border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
                <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                  <ImagePlus size={24} className="text-pink-600 dark:text-pink-400" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('bulkImport.title', { defaultValue: 'Toplu stok görsel yükleme' })}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                  {t('bulkImport.description', { defaultValue: 'Tek ZIP yükle. Sistem klasör adından ERP stok kodunu okuyup görselleri ilgili stoğa arka planda eklesin.' })}
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="group relative h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-pink-500 hover:text-white transition-all duration-300 hover:rotate-90 shadow-sm"
            >
              <X className="relative z-10 rotate-180" size={20} />
              <div className="absolute inset-0 rounded-full bg-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-4 space-y-4 custom-scrollbar">

            <div className="group relative rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-6 transition-all ">


              <div className="flex items-start gap-4 relative z-50">
                <div className="top-0 p-0 h-10 w-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center shrink-0">
                  <Archive size={20} className="text-pink-600 dark:text-pink-400" />
                </div>
                <div className="space-y-4 flex-1">
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {t('bulkImport.structureTitle', { defaultValue: 'ZIP Dosya Yapısı' })}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                    {[
                      'STK-001/resim1.jpg',
                      'STK-001/1/resim2.png',
                      'Görseller/STK-001/resim3.jpg'
                    ].map((path) => (
                      <div key={path} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                        <code className="text-xs font-mono text-slate-600 dark:text-slate-400">{path}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>


            <div className="space-y-4">
              <Label className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">
                {t('bulkImport.selectArchive', { defaultValue: 'ZIP Arşivi Seçin' })}
              </Label>

              <label
                htmlFor="stock-bulk-image-zip"
                className="relative group flex flex-col items-center justify-center w-full h-40 rounded-[2rem] border-2 border-dashed border-pink-500 dark:border-white/10 bg-slate-50/30 dark:bg-white/[0.01] hover:bg-white dark:hover:bg-white/[0.03] hover:border-pink-500 transition-all cursor-pointer overflow-hidden"
              >
                <Input
                  id="stock-bulk-image-zip"
                  type="file"
                  accept=".zip,application/zip"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <div className="h-14 w-14 rounded-2xl bg-white dark:bg-white/5 shadow-sm group-hover:shadow-pink-500/10 group-hover:scale-110 transition-all flex items-center justify-center">
                    {submitting ? (
                      <Loader2 className="h-6 w-6 text-pink-600 animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6 text-pink-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {file ? file.name : t('bulkImport.uploadHint', { defaultValue: 'ZIP dosyasını buraya sürükleyin veya seçin' })}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : t('bulkImport.uploadLimit', { defaultValue: 'Maksimum 500MB (Arka planda işlenir)' })}
                    </p>
                  </div>
                </div>

                {file && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100 dark:bg-white/5">
                    <div className="h-full bg-pink-500 w-full animate-in slide-in-from-left duration-500" />
                  </div>
                )}
              </label>
            </div>


            <div className="rounded-[2rem] border border-slate-100 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] p-8">
              <p className="mb-6 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span className="h-1.5 w-4 bg-pink-500 rounded-full" />
                {t('bulkImport.notesTitle', { defaultValue: 'Dikkat Edilmesi Gerekenler' })}
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm text-slate-600 dark:text-slate-400">
                {helperLines.map((line, idx) => (
                  <li key={idx} className="flex gap-3 items-start group">
                    <div className="mt-1 h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter className="px-6 sm:px-8 py-6 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-row justify-end gap-4 backdrop-blur-sm">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="h-12 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all"
            >
              {t('images.cancel', { defaultValue: 'İptal' })}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !file}
              className="h-12 bg-linear-to-r from-pink-600 to-orange-600 px-10 font-black text-white shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] rounded-2xl opacity-75 grayscale-[0] dark:opacity-100 dark:grayscale-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('bulkImport.submitting', { defaultValue: 'Sıraya alınıyor...' })}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('bulkImport.submit', { defaultValue: 'ZIP Yükle ve Başlat' })}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
