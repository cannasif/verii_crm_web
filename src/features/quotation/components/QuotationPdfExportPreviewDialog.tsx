import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FileDown,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  X,
} from 'lucide-react';

export interface QuotationPdfExportPreviewDialogLabels {
  title: string;
  subtitle: string;
  close: string;
  loading: string;
  error: string;
  download: string;
  errorDismiss: string;
  shareWhatsapp: string;
  shareMail: string;
}

export interface QuotationPdfExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildPdfBlob: () => Promise<Blob>;
  fileName: string;
  labels: QuotationPdfExportPreviewDialogLabels;
  onShareWhatsapp: () => void;
  onShareMail: () => void;
}

export function QuotationPdfExportPreviewDialog({
  open,
  onOpenChange,
  buildPdfBlob,
  fileName,
  labels,
  onShareWhatsapp,
  onShareMail,
}: QuotationPdfExportPreviewDialogProps): ReactElement {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const loadIdRef = useRef(0);

  const revokeBlobUrl = useCallback((url: string | null): void => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setBlobUrl((prev) => {
        revokeBlobUrl(prev);
        return null;
      });
      setError(false);
      setLoading(false);
      return;
    }

    const id = ++loadIdRef.current;
    setLoading(true);
    setError(false);
    setBlobUrl((prev) => {
      revokeBlobUrl(prev);
      return null;
    });

    void (async (): Promise<void> => {
      try {
        const blob = await buildPdfBlob();
        if (loadIdRef.current !== id) return;
        setBlobUrl(URL.createObjectURL(blob));
      } catch {
        if (loadIdRef.current !== id) return;
        setError(true);
      } finally {
        if (loadIdRef.current === id) {
          setLoading(false);
        }
      }
    })();
  }, [open, buildPdfBlob, revokeBlobUrl]);

  const handleDownload = (): void => {
    if (!blobUrl) return;
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    anchor.click();
  };

  const handleShareWhatsapp = (): void => {
    handleDownload();
    onShareWhatsapp();
  };

  const handleShareMail = (): void => {
    handleDownload();
    onShareMail();
  };

  const actionBtnClass = cn(
    'flex min-h-[3rem] w-full flex-col items-center justify-center gap-1 px-2 py-2.5 sm:min-h-11 sm:flex-row sm:gap-2 sm:px-3',
    'whitespace-normal text-center text-xs font-semibold leading-snug sm:text-sm',
    'rounded-xl border shadow-sm transition-colors duration-200',
    'disabled:pointer-events-none disabled:opacity-40',
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex max-h-[min(94dvh,980px)] flex-col gap-0 overflow-hidden p-0',
          'w-[min(calc(100vw-1rem),920px)] max-w-[min(calc(100vw-1rem),920px)]',
          'sm:w-[min(calc(100vw-2rem),920px)] sm:max-w-[min(calc(100vw-2rem),920px)]',
          'lg:!max-w-[min(92vw,920px)]',
          'border border-slate-200/90 bg-white text-slate-900 shadow-2xl',
          'dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[state=open]:slide-in-from-bottom-4',
          'data-[state=open]:duration-300 data-[state=closed]:duration-200',
          'ease-[cubic-bezier(0.22,1,0.36,1)]',
        )}
      >
        <div className="relative shrink-0 overflow-hidden border-b border-slate-200/80 dark:border-white/10">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-800 to-indigo-950 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-rose-500/80 via-indigo-400/50 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_10%_-20%,rgba(255,255,255,0.12),transparent_55%)]"
            aria-hidden
          />

          <DialogClose
            type="button"
            aria-label={labels.close}
            className={cn(
              'absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-xl sm:right-4 sm:top-4',
              'border-2 border-white/45 bg-white/12 text-white shadow-lg backdrop-blur-md',
              'transition-all hover:border-white/80 hover:bg-white/22 hover:shadow-xl',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
            )}
          >
            <X className="size-5 shrink-0 stroke-[2.5]" aria-hidden />
            <span className="sr-only">{labels.close}</span>
          </DialogClose>

          <DialogHeader className="relative z-10 gap-2 px-5 pb-4 pt-5 pr-16 text-left sm:px-7 sm:pb-5 sm:pt-6 sm:pr-20">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-white sm:h-12 sm:w-12',
                )}
              >
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-lg font-bold tracking-tight text-white sm:text-xl">
                    {labels.title}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs font-medium leading-relaxed text-slate-200/95 sm:text-sm">
                  {labels.subtitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div
          className={cn(
            'relative min-h-0 min-w-0 flex-1 overflow-hidden',
            'bg-slate-100/95 dark:bg-zinc-950/95',
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col p-2 sm:p-4 md:p-5">
            {loading ? (
              <div
                className={cn(
                  'flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border p-8',
                  'border-slate-200/90 bg-white/90 dark:border-white/10 dark:bg-zinc-900/80',
                )}
              >
                <Loader2
                  className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400"
                  aria-hidden
                />
                <p className="text-center text-sm font-semibold text-slate-600 dark:text-zinc-300">
                  {labels.loading}
                </p>
              </div>
            ) : null}

            {error && !loading ? (
              <div
                className={cn(
                  'flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center',
                  'border-red-200/80 bg-red-50/90 text-red-900 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-100',
                )}
              >
                <p className="max-w-md text-sm font-medium">{labels.error}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-800 hover:bg-red-100 dark:border-red-500/40 dark:text-red-100 dark:hover:bg-red-950/60"
                  onClick={() => onOpenChange(false)}
                >
                  {labels.errorDismiss}
                </Button>
              </div>
            ) : null}

            {!loading && !error && blobUrl ? (
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
                <div
                  className={cn(
                    'flex w-full max-w-[min(100%,720px)] flex-col overflow-hidden rounded-lg border-2 border-slate-200/90 bg-slate-200/50 shadow-inner',
                    'dark:border-white/15 dark:bg-zinc-900/80',
                    'aspect-[210/297]',
                    'max-h-[min(78dvh,calc(min(100vw,720px)*297/210))]',
                  )}
                >
                  <iframe
                    title={labels.title}
                    src={`${blobUrl}#toolbar=1&navpanes=0`}
                    className="h-full min-h-0 w-full flex-1 bg-white dark:bg-zinc-950"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            'shrink-0 border-t px-2 py-3 sm:px-4 sm:py-3.5 md:px-5',
            'border-slate-200/90 bg-slate-50 dark:border-white/10 dark:bg-zinc-900',
          )}
        >
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!blobUrl || loading || error}
              onClick={handleDownload}
              className={cn(
                actionBtnClass,
                'border-slate-200 bg-white text-slate-800',
                'hover:border-pink-200/90 hover:bg-pink-50/85 hover:text-pink-900',
                'dark:border-white/12 dark:bg-zinc-900 dark:text-zinc-100',
                'dark:hover:border-pink-400/35 dark:hover:bg-pink-950/45 dark:hover:text-pink-50',
              )}
            >
              <FileDown className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" aria-hidden />
              <span>{labels.download}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!blobUrl || loading || error}
              onClick={handleShareWhatsapp}
              className={cn(
                actionBtnClass,
                'border-slate-200 bg-white text-slate-800 ring-1 ring-emerald-600/15',
                'hover:border-emerald-200/90 hover:bg-emerald-50/90 hover:text-emerald-950',
                'dark:border-white/12 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-emerald-500/20',
                'dark:hover:border-emerald-500/35 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-50',
              )}
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span>{labels.shareWhatsapp}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!blobUrl || loading || error}
              onClick={handleShareMail}
              className={cn(
                actionBtnClass,
                'border-slate-200 bg-white text-slate-800 ring-1 ring-sky-600/15',
                'hover:border-sky-200/90 hover:bg-sky-50/90 hover:text-sky-950',
                'dark:border-white/12 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-sky-500/20',
                'dark:hover:border-sky-500/35 dark:hover:bg-sky-950/45 dark:hover:text-sky-50',
              )}
            >
              <Mail className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
              <span>{labels.shareMail}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
