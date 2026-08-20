import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { AiAssistantCapabilityStrip } from '../../src/features/ai-assistant/components/AiAssistantCapabilityStrip';
import { AiAssistantEvidencePanel } from '../../src/features/ai-assistant/components/AiAssistantEvidencePanel';
import type { AiAssistantCapabilitiesDto, AiAssistantStructuredResultDto } from '../../src/features/ai-assistant/types/ai-assistant.types';
import { exportAiAssistantResultToExcel, exportAiAssistantResultToPdf } from '../../src/features/ai-assistant/utils/ai-assistant-export';
import i18n, { ensureI18nReady, ensureNamespacesReady } from '../../src/lib/i18n';
import '../../src/index.css';

const capabilities: AiAssistantCapabilitiesDto = {
  assistantVersion: '3.0.0',
  routingMode: 'Hybrid',
  semanticRoutingAvailable: true,
  semanticProvider: 'test-provider',
  canRunCompoundQueries: true,
  canUseVision: true,
  canTranslateResponses: true,
  canConfirmActions: true,
  canPersistConversations: true,
  canExportStructuredResults: true,
  canUsePageContext: true,
  canUseErrorContext: true,
  maximumQueriesPerMessage: 3,
  maximumAttachmentCount: 1,
  maximumAttachmentBytes: 4 * 1024 * 1024,
  readOnlyToolCount: 14,
  confirmationToolCount: 5,
  scopeLabel: 'Active branch and user permission scope',
  supportedAttachmentTypes: ['image/png'],
  exampleQuestions: [],
};

const structuredResult: AiAssistantStructuredResultDto = {
  type: 'compound-read',
  title: 'Birleşik CRM sonuçları',
  columns: [],
  rows: [],
  sections: [
    {
      type: 'customer-search',
      title: 'Müşteri sonuçları',
      columns: [
        { key: 'name', label: 'Müşteri', dataType: 'text' },
        { key: 'url', label: 'CRM bağlantısı', dataType: 'text' },
      ],
      rows: [{ name: 'Ege Metal', url: '/customer-360/42' }],
    },
    {
      type: 'quotation-search',
      title: 'Teklif sonuçları',
      columns: [
        { key: 'offerNo', label: 'Teklif No', dataType: 'text' },
        { key: 'amount', label: 'Tutar', dataType: 'currency' },
      ],
      rows: [{ offerNo: '40361', amount: 125000.5 }],
    },
  ],
};

declare global {
  interface Window {
    aiAssistantEvidenceHarness: {
      exportExcel: () => Promise<void>;
      exportPdf: () => Promise<void>;
    };
  }
}

async function bootstrap(): Promise<void> {
  await ensureI18nReady();
  await ensureNamespacesReady(['ai-assistant'], 'tr');
  const exportParams = {
    result: structuredResult,
    question: 'müşteri ara Ege Metal; stok ara OVAL-01',
    answer: 'Birleşik CRM sorgusu tamamlandı.',
    language: 'tr',
  };
  window.aiAssistantEvidenceHarness = {
    exportExcel: () => exportAiAssistantResultToExcel(exportParams),
    exportPdf: () => exportAiAssistantResultToPdf(exportParams),
  };
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <main className="mx-auto min-h-screen max-w-5xl bg-background p-3 text-foreground sm:p-8">
            <h1 className="mb-4 text-lg font-black">AI assistant evidence test harness</h1>
            <AiAssistantCapabilityStrip capabilities={capabilities} />
            <div className="mt-4">
              <AiAssistantEvidencePanel
                intent="compound-read"
                context={{
                  currentPath: '/quotations/40361',
                  routeTitle: 'Teklif detayı',
                  module: 'Quotation',
                  entityType: 'quotation',
                  entityId: 40361,
                  hasPageFilters: false,
                  hasErrorContext: false,
                  attachmentCount: 0,
                }}
                interpretations={[
                  {
                    order: 1,
                    question: 'müşteri ara Ege Metal',
                    intent: 'customer-search',
                    routingMode: 'Deterministic',
                    toolName: 'search_customer',
                    status: 'Completed',
                    isGrounded: true,
                    sourceCount: 1,
                    resultCount: 1,
                  },
                  {
                    order: 2,
                    question: 'stok ara OVAL-01',
                    intent: 'stock-search',
                    routingMode: 'Deterministic',
                    toolName: 'search_stock',
                    status: 'Failed',
                    isGrounded: false,
                    sourceCount: 0,
                    resultCount: 0,
                    failureMessage: 'Stok servisine ulaşılamadı.',
                  },
                ]}
                result={structuredResult}
                sources={[
                  {
                    label: 'CRM Customers',
                    description: 'Aktif şube ve kullanıcı yetkileriyle filtrelendi.',
                    module: 'Customer',
                    period: 'Güncel',
                  },
                ]}
              />
            </div>
          </main>
        </MemoryRouter>
      </I18nextProvider>
    </StrictMode>
  );
}

void bootstrap();
