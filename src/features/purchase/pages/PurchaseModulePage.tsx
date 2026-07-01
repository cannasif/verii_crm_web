import { File01Icon, ShoppingBag03Icon } from 'hugeicons-react';
import { HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const sections = [
  {
    title: 'Satınalma Talepleri',
    description: 'İç ihtiyaçları ayrı satınalma talebi sürecinde toplayın.',
    help: 'Cari/tedarikçi zorunlu değildir. Talep, hangi ürün/hizmetin ne zaman ve ne kadar gerektiğini anlatan iç ihtiyaç kaydıdır.',
    href: '/purchase/requests',
  },
  {
    title: 'Tedarikçi Teklif İstekleri',
    description: 'Satınalma taleplerini birden fazla tedarikçiye RFQ/e-posta olarak gönderin.',
    help: 'Bir veya birden fazla talep, bir RFQ altında birden fazla tedarikçiye gönderilebilir. Talep kopyalanmaz; tedarikçiler RFQ aşamasında çoğalır.',
    href: '/purchase/rfqs',
  },
  {
    title: 'Tedarikçi Teklifleri',
    description: 'Tedarikçi tekliflerini ve karşılaştırma hazırlığını yönetin.',
    help: 'Her tedarikçiden gelen cevap ayrı teklif olarak izlenir. Fiyat, teslim süresi ve ödeme şartları burada karşılaştırılır.',
    href: '/purchase/supplier-quotations',
  },
  {
    title: 'Satınalma Siparişleri',
    description: 'Onaylanan satınalma siparişlerini ERP ve WMS durumlarıyla izleyin.',
    help: 'Sipariş aşamasında cari/tedarikçi artık netleşmiş olmalıdır; satınalma siparişi seçilen tedarikçiye kesilir.',
    href: '/purchase/orders',
  },
];

export function PurchaseModulePage() {
  return (
    <div className="min-h-screen bg-[var(--crm-page-bg)] px-6 py-8 text-[var(--crm-text-primary)]">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] shadow-sm">
            <ShoppingBag03Icon size={28} className="text-[var(--crm-brand-primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Satınalma Yönetimi</h1>
            <p className="mt-1 text-sm text-[var(--crm-text-muted)]">
              Talep, tedarikçi teklifi ve satınalma siparişi süreçleri satıştan bağımsız yönetilir.
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              to={section.href}
              className="rounded-[8px] border border-[var(--crm-border)] bg-[var(--crm-card-bg)] p-5 shadow-sm transition hover:border-[var(--crm-brand-primary)]"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--crm-brand-soft)]">
                <File01Icon size={22} className="text-[var(--crm-brand-primary)]" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--crm-border)] text-[var(--crm-text-muted)] transition hover:border-[var(--crm-brand-primary)] hover:text-[var(--crm-brand-primary)]"
                      aria-label={`${section.title} bilgisi`}
                      onClick={(event) => event.preventDefault()}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm leading-5">
                    {section.help}
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--crm-text-muted)]">{section.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
