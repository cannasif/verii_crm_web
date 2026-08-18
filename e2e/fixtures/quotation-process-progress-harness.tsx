import { StrictMode, useEffect, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n, { ensureI18nReady, ensureNamespacesReady } from '../../src/lib/i18n';
import type { ProcessProgressStatus } from '../../src/components/shared';
import {
  SalesDocumentProcessProgressModal,
  resolveApprovalDecisionOutcome,
  resolveStartApprovalOutcome,
  type SalesDocumentKind,
  type SalesDocumentProcessKind,
  type SalesDocumentProcessOutcome,
} from '../../src/features/sales-documents/process-progress/SalesDocumentProcessProgressModal';
import '../../src/index.css';

interface HarnessApi {
  succeed: (erpNumber?: string) => void;
  continueApproval: () => void;
  fail: () => void;
  retryCount: () => number;
}

declare global {
  interface Window {
    quotationProcessHarness: HarnessApi;
  }
}

function Harness(): ReactElement {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ProcessProgressStatus>('running');
  const [processKind, setProcessKind] = useState<SalesDocumentProcessKind>('start-approval');
  const [documentKind, setDocumentKind] = useState<SalesDocumentKind>('quotation');
  const [erpNumber, setErpNumber] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SalesDocumentProcessOutcome | null>(null);
  const [retries, setRetries] = useState(0);

  const begin = (nextProcessKind: SalesDocumentProcessKind, nextDocumentKind: SalesDocumentKind = 'quotation'): void => {
    setProcessKind(nextProcessKind);
    setDocumentKind(nextDocumentKind);
    setStatus('running');
    setErpNumber(null);
    setOutcome(null);
    setOpen(true);
  };

  useEffect(() => {
    window.quotationProcessHarness = {
      succeed: (nextErpNumber) => {
        setErpNumber(nextErpNumber ?? null);
        const snapshot = {
          status: processKind === 'start-approval' ? 1 : 2,
          isERPIntegrated: Boolean(nextErpNumber),
          erpIntegrationNumber: nextErpNumber ?? null,
        };
        setOutcome(processKind === 'start-approval'
          ? resolveStartApprovalOutcome(snapshot)
          : resolveApprovalDecisionOutcome(snapshot));
        setStatus('success');
      },
      continueApproval: () => {
        setErpNumber(null);
        setOutcome(resolveApprovalDecisionOutcome({ status: 1 }));
        setStatus('success');
      },
      fail: () => setStatus('error'),
      retryCount: () => retries,
    };
  }, [processKind, retries]);

  const documentConfig = {
    demand: { id: 501, no: 'TLP202600000501' },
    quotation: { id: 40361, no: 'GEN2026000000000000250' },
    order: { id: 701, no: 'SIP202600000701' },
  }[documentKind];

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <h1>Quotation process progress test harness</h1>
      <div className="mt-4 flex gap-3">
        <button type="button" disabled={open && status === 'running'} onClick={() => begin('start-approval')}>
          Onaya Gönder
        </button>
        <button type="button" disabled={open && status === 'running'} onClick={() => begin('approve-and-sync')}>
          Onayla
        </button>
        <button type="button" disabled={open && status === 'running'} onClick={() => begin('start-approval', 'demand')}>
          Talebi Onaya Gönder
        </button>
        <button type="button" disabled={open && status === 'running'} onClick={() => begin('approve-and-sync', 'demand')}>
          Talebi Onayla
        </button>
        <button type="button" disabled={open && status === 'running'} onClick={() => begin('start-approval', 'order')}>
          Siparişi Onaya Gönder
        </button>
        <button type="button" disabled={open && status === 'running'} onClick={() => begin('approve-and-sync', 'order')}>
          Siparişi Onayla
        </button>
      </div>

      <SalesDocumentProcessProgressModal
        open={open}
        status={status}
        documentKind={documentKind}
        processKind={processKind}
        processKey={`quotation-test-${retries}`}
        documentId={documentConfig.id}
        documentNo={documentConfig.no}
        erpNumber={erpNumber}
        outcome={outcome}
        errorMessage={status === 'error' ? 'Netsis bağlantısı zaman aşımına uğradı.' : null}
        technicalDetails={status === 'error' ? 'CODE: netsis_timeout\nTRACE: quotation-test-trace' : null}
        stepIntervalMs={120}
        onOpenChange={setOpen}
        onRetry={() => {
          setRetries((value) => value + 1);
          setStatus('running');
        }}
        onViewDocument={() => setOpen(false)}
      />
    </main>
  );
}

await ensureI18nReady();
await i18n.changeLanguage('tr');
await ensureNamespacesReady(['quotation', 'common'], 'tr');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <Harness />
    </I18nextProvider>
  </StrictMode>,
);
