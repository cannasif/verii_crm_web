export const BRAND_THEME_STORAGE_KEY = 'vite-ui-brand-theme';

export const BRAND_THEME_CLASS_PREFIX = 'theme-';

export const brandThemeIds = [
  'v3rii',
  'corporateBlue',
  'graphite',
  'emerald',
  'executive',
  'burgundy',
  'industrialSteel',
  'cleanLight',
  'highContrast',
  'minimalCrm',
  'flatNavy',
  'flatSlate',
  'flatWhite',
] as const;

export type BrandTheme = (typeof brandThemeIds)[number];

export type BrandThemeDefinition = {
  id: BrandTheme;
  label: string;
  description: string;
  className: string;
  swatches: readonly [string, string, string];
};

export const brandThemes: readonly BrandThemeDefinition[] = [
  {
    id: 'v3rii',
    label: 'V3RII Neon',
    description: 'Mevcut pembe/turuncu marka enerjisi',
    className: 'theme-v3rii',
    swatches: ['#ec007a', '#7c3aed', '#ff4b00'],
  },
  {
    id: 'corporateBlue',
    label: 'Kurumsal Lacivert',
    description: 'Finans, üretim ve B2B müşteriler için güven veren mavi',
    className: 'theme-corporate-blue',
    swatches: ['#1e3a8a', '#2563eb', '#06b6d4'],
  },
  {
    id: 'graphite',
    label: 'Grafit Gri',
    description: 'Sade, operasyonel ve az dikkat dağıtan tema',
    className: 'theme-graphite',
    swatches: ['#111827', '#64748b', '#94a3b8'],
  },
  {
    id: 'emerald',
    label: 'Finans Yeşili',
    description: 'Güven, onay ve finans ekranları için yumuşak ton',
    className: 'theme-emerald',
    swatches: ['#065f46', '#10b981', '#2dd4bf'],
  },
  {
    id: 'executive',
    label: 'Premium Koyu',
    description: 'Lacivert, mor ve altın aksanlı üst seviye his',
    className: 'theme-executive',
    swatches: ['#111827', '#6d28d9', '#f59e0b'],
  },
  {
    id: 'burgundy',
    label: 'Bordo Kurumsal',
    description: 'ERP ekranlarına yakın, ağır ve kurumsal his',
    className: 'theme-burgundy',
    swatches: ['#7f1d1d', '#b91c1c', '#f97316'],
  },
  {
    id: 'industrialSteel',
    label: 'Endüstriyel Çelik',
    description: 'Üretim, stok ve fabrika operasyonları için metalik yapı',
    className: 'theme-industrial-steel',
    swatches: ['#0f172a', '#475569', '#38bdf8'],
  },
  {
    id: 'cleanLight',
    label: 'Sade Açık',
    description: 'Gündüz kullanım ve yoğun veri girişi için göz yormayan yapı',
    className: 'theme-clean-light',
    swatches: ['#f8fafc', '#2563eb', '#14b8a6'],
  },
  {
    id: 'highContrast',
    label: 'Yüksek Kontrast',
    description: 'Net metin, belirgin sınırlar ve erişilebilir odak hissi',
    className: 'theme-high-contrast',
    swatches: ['#020617', '#f8fafc', '#facc15'],
  },
  {
    id: 'minimalCrm',
    label: 'Minimal CRM',
    description: 'Daha az neon, daha çok operasyonel SaaS görünümü',
    className: 'theme-minimal-crm',
    swatches: ['#155e75', '#0f766e', '#64748b'],
  },
  {
    id: 'flatNavy',
    label: 'Düz Lacivert',
    description: 'Gradientsiz, net ve kurumsal lacivert arayüz',
    className: 'theme-flat-navy',
    swatches: ['#1e3a8a', '#1e3a8a', '#1e3a8a'],
  },
  {
    id: 'flatSlate',
    label: 'Düz Grafit',
    description: 'Gradientsiz, sakin ve operasyonel yönetim paneli',
    className: 'theme-flat-slate',
    swatches: ['#334155', '#334155', '#334155'],
  },
  {
    id: 'flatWhite',
    label: 'Düz Açık',
    description: 'Gradientsiz, aydınlık ve yoğun veri girişi odaklı tema',
    className: 'theme-flat-white',
    swatches: ['#f8fafc', '#2563eb', '#e2e8f0'],
  },
] as const;

const brandThemeIdSet = new Set<string>(brandThemeIds);

export function isBrandTheme(value: string | null | undefined): value is BrandTheme {
  return Boolean(value && brandThemeIdSet.has(value));
}

export function getBrandThemeClass(theme: BrandTheme): string {
  return brandThemes.find((item) => item.id === theme)?.className ?? brandThemes[0].className;
}
