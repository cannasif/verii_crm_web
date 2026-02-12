import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('powerbiRls.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('powerbiRls.description')}
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
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
