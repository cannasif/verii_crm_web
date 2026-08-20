import { StrictMode, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { Button } from '../../src/components/ui/button';
import { ClonePermissionGroupDialog } from '../../src/features/access-control/components/ClonePermissionGroupDialog';
import type { ClonePermissionGroupSchema } from '../../src/features/access-control/schemas/permission-group-schema';
import type { PermissionGroupDto } from '../../src/features/access-control/types/access-control.types';
import i18n, { ensureI18nReady, ensureNamespacesReady } from '../../src/lib/i18n';
import '../../src/index.css';

declare global {
  interface Window {
    clonePermissionGroupHarness: {
      lastPayload: () => ClonePermissionGroupSchema | null;
    };
  }
}

const source: PermissionGroupDto = {
  id: 101,
  createdDate: new Date().toISOString(),
  isDeleted: false,
  name: '[Sistem] Satış Temsilcisi',
  description: 'Talep, teklif ve sipariş oluşturma/güncelleme yetkileri.',
  isSystemAdmin: false,
  isSystemTemplate: true,
  systemKey: 'sales-representative',
  isActive: true,
  permissionDefinitionIds: [1, 2, 3],
  permissionCodes: ['sales.demands.view', 'sales.quotations.view', 'sales.orders.view'],
};

function Harness(): ReactElement {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<ClonePermissionGroupSchema | null>(null);
  window.clonePermissionGroupHarness = { lastPayload: () => payload };

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <h1 className="mb-6 text-2xl font-bold">Permission group clone harness</h1>
      <Button onClick={() => setOpen(true)}>Kopyalama Penceresini Aç</Button>
      <ClonePermissionGroupDialog
        source={source}
        open={open}
        onOpenChange={setOpen}
        isLoading={false}
        onSubmit={async (data) => {
          setPayload(data);
          setOpen(false);
        }}
      />
    </main>
  );
}

async function bootstrap(): Promise<void> {
  await ensureI18nReady();
  await ensureNamespacesReady(['common', 'access-control'], 'tr');
  await i18n.changeLanguage('tr');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <Harness />
      </I18nextProvider>
    </StrictMode>
  );
}

void bootstrap();
