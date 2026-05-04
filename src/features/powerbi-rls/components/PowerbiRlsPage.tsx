import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plus, ShieldAlert } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { PowerbiRlsList } from './PowerbiRlsList';
import type { PowerBIReportRoleMapping } from '../types/powerbiRls.types';

export function PowerbiRlsPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PowerBIReportRoleMapping | null>(null);

  useEffect(() => {
    setPageTitle(t('powerbiRls.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <ShieldAlert className="h-7 w-7 text-pink-600 dark:text-pink-400 relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
              {t('powerbiRls.title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
              {t('powerbiRls.description')}
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] h-11 px-6 gap-2
          opacity-90 grayscale-[0] 
          dark:opacity-100 dark:grayscale-0"
        >
          <Plus className="h-4 w-4" />
          {t('powerbiRls.new')}
        </Button>
      </div>
      <PowerbiRlsList
        formOpen={formOpen}
        setFormOpen={setFormOpen}
        editing={editing}
        setEditing={setEditing}
      />
    </div>
  );
}
