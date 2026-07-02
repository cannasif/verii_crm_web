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
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-primary ring-1 ring-inset ring-primary/15 dark:border-primary/25 dark:bg-primary/10">
            <ShieldAlert className="h-7 w-7" />
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
          className="rounded-xl bg-[image:var(--crm-brand-gradient)] text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] h-11 px-6 gap-2
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
