import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, CheckCircle2, PlusCircle, ArrowUpCircle, RotateCcw, Trash2 } from 'lucide-react';
import { usePowerbiReportSyncMutation } from '../hooks/usePowerbiSync';
import type { PowerBIReportSyncResultDto } from '../types/powerbiSync.types';

export function PowerbiReportSyncCard(): ReactElement {
  const { t } = useTranslation();
  const [workspaceId, setWorkspaceId] = useState('');
  const [lastResult, setLastResult] = useState<PowerBIReportSyncResultDto | null>(null);
  const mutation = usePowerbiReportSyncMutation();

  const handleSync = (): void => {
    setLastResult(null);
    mutation.mutate(workspaceId.trim() || undefined, {
      onSuccess: (data) => {
        setLastResult(data);
      },
    });
  };

  return (
    <Card className=" bg-white/70 dark:bg-[#180F22] backdrop-blur-xl border-white/60 dark:border-white/5 shadow-sm rounded-2xl transition-all duration-300 ">

      <CardContent className="space-y-5">
        <div>
          <label className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white-400 " htmlFor="powerbi-sync-workspace">
            {t('powerbiSync.workspaceId')}
          </label>

        </div>
        <div>
          <Input
            id="powerbi-sync-workspace"
            placeholder={t('powerbiSync.workspaceIdPlaceholder')}
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSync}
            disabled={mutation.isPending}
            className="rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] disabled:opacity-50 disabled:hover:scale-100 h-11 px-8 gap-2
            opacity-90 grayscale-[0] 
                dark:opacity-100 dark:grayscale-0"
          >
            {mutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
            {t('powerbiSync.sync')}
          </Button>
          {mutation.isSuccess && lastResult && (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              {t('powerbiSync.syncSuccess', { defaultValue: 'Senkronizasyon tamamlandı' })}
            </div>
          )}
        </div>

        {mutation.isError && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400 font-medium">
            {mutation.error?.message ?? t('powerbiSync.error')}
          </div>
        )}

        {lastResult && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-4 text-center space-y-1 transition-all hover:border-pink-500/30 hover:shadow-sm">
              <p className="text-2xl font-black text-slate-700 dark:text-white">{lastResult.totalRemote}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('powerbiSync.totalRemote')}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-4 text-center space-y-1 transition-all hover:shadow-sm">
              <div className="flex justify-center mb-1"><PlusCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" /></div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{lastResult.created}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-500/80 dark:text-emerald-500">{t('powerbiSync.created')}</p>
            </div>
            <div className="rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-4 text-center space-y-1 transition-all hover:shadow-sm">
              <div className="flex justify-center mb-1"><ArrowUpCircle className="h-4 w-4 text-blue-500 dark:text-blue-400" /></div>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{lastResult.updated}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-500/80 dark:text-blue-500">{t('powerbiSync.updated')}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4 text-center space-y-1 transition-all hover:shadow-sm">
              <div className="flex justify-center mb-1"><RotateCcw className="h-4 w-4 text-amber-500 dark:text-amber-400" /></div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{lastResult.reactivated}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-500/80 dark:text-amber-500">{t('powerbiSync.reactivated')}</p>
            </div>
            <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4 text-center space-y-1 transition-all hover:shadow-sm">
              <div className="flex justify-center mb-1"><Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" /></div>
              <p className="text-2xl font-black text-red-600 dark:text-red-400">{lastResult.deleted}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-red-500/80 dark:text-red-500">{t('powerbiSync.deleted')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
