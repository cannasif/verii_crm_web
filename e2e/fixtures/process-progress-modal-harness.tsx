import { StrictMode, useEffect, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { CloudUpload } from 'lucide-react';
import {
  ProcessProgressModal,
  useProcessStepPacer,
  type ProcessProgressStatus,
  type ProcessProgressStep,
} from '../../src/components/shared/ProcessProgressModal';
import '../../src/index.css';

const stepLabels = [
  'CRM alanları doğrulanıyor',
  'Zorunlu bilgiler kontrol ediliyor',
  'Mükerrer müşteri kontrolü yapılıyor',
  'Firma ve yetkili ilişkileri hazırlanıyor',
  'ERP veri formatı oluşturuluyor',
  'Kayıt ERP sistemine gönderiliyor',
  'ERP kayıt numarası alınıyor',
  'CRM senkronizasyon durumu güncelleniyor',
];

interface HarnessApi {
  start: () => void;
  succeed: () => void;
  fail: () => void;
  fastSuccess: () => void;
  retryCount: () => number;
}

declare global {
  interface Window {
    processProgressHarness: HarnessApi;
  }
}

function Harness(): ReactElement {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ProcessProgressStatus>('running');
  const [retries, setRetries] = useState(0);
  const activeStepIndex = useProcessStepPacer({
    running: open && status === 'running',
    stepCount: stepLabels.length,
    resetKey: retries,
    intervalMs: 120,
  });

  useEffect(() => {
    window.processProgressHarness = {
      start: () => {
        setStatus('running');
        setOpen(true);
      },
      succeed: () => setStatus('success'),
      fail: () => setStatus('error'),
      fastSuccess: () => {
        setStatus('running');
        setOpen(true);
        window.setTimeout(() => setStatus('success'), 100);
      },
      retryCount: () => retries,
    };
  }, [retries]);

  const steps: ProcessProgressStep[] = stepLabels.map((label, index) => ({
    id: String(index),
    label,
    status: status === 'success'
      ? 'completed'
      : status === 'error' && index === 5
        ? 'error'
        : status === 'error' && index < 5
          ? 'completed'
          : status === 'running' && index < activeStepIndex
            ? 'completed'
            : status === 'running' && index === activeStepIndex
          ? 'active'
          : 'pending',
  }));

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <h1>Process progress test harness</h1>
      <ProcessProgressModal
        open={open}
        status={status}
        route="CRM://ERP/SYNC/CUSTOMER"
        eyebrow="ERP SENKRONİZASYONU"
        title={status === 'success'
          ? 'ERP AKTARIMI TAMAMLANDI'
          : status === 'error'
            ? 'ERP AKTARIMI TAMAMLANAMADI'
            : "KAYIT ERP'YE AKTARILIYOR"}
        description="Müşteri kaydı doğrulanıyor ve ERP sistemine hazırlanıyor."
        operationLabel="İŞLEM NO"
        operationId="CRM-2026-001284"
        icon={<CloudUpload />}
        progress={status === 'success' ? 100 : null}
        steps={steps}
        resultLabel="ERP CARİ KODU"
        resultValue={status === 'success' ? '120.01.0458' : null}
        errorMessage={status === 'error' ? 'ERP servisine ulaşılamadı.' : null}
        technicalDetails={status === 'error' ? 'CODE: netsis_customer_create_failed\nHTTP: 502\nTRACE: test-trace-id' : null}
        labels={{
          runStatus: 'ÇALIŞIYOR',
          successStatus: 'TAMAMLANDI',
          errorStatus: 'HATA',
          technicalDetails: 'Teknik Detay',
          retry: 'Tekrar Dene',
          saveDraft: "CRM'de Taslak Olarak Sakla",
          viewRecord: 'Kaydı Görüntüle',
          close: 'Kapat',
          continueInBackground: 'Arka Planda Devam Et',
          progressLabel: 'ERP aktarım ilerlemesi',
        }}
        onOpenChange={setOpen}
        onRetry={() => {
          setRetries((value) => value + 1);
          setStatus('running');
        }}
        onSaveDraft={() => setOpen(false)}
        onViewRecord={() => setOpen(false)}
      />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
