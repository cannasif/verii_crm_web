export const BRAND_THEME_STORAGE_KEY = 'vite-ui-brand-theme';

export const BRAND_THEME_LIST_ENABLED_STORAGE_KEY = 'vite-ui-brand-theme-list-enabled';

export const BRAND_THEME_LIST_SELECTION_STORAGE_KEY = 'vite-ui-brand-theme-list-selection';

export const APPEARANCE_BEFORE_BRAND_LIST_STORAGE_KEY = 'vite-ui-appearance-before-brand-list';

export const V3RII_APPEARANCE_OVERRIDE_STORAGE_KEY = 'vite-ui-v3rii-appearance-override';

export const BRAND_THEME_CLASS_PREFIX = 'theme-';

export type BrandThemeAppearance = 'light' | 'dark';

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
  'warmSand',
  'skyMist',
  'softRose',
] as const;

export type BrandTheme = (typeof brandThemeIds)[number];

export type BrandThemeDefinition = {
  id: BrandTheme;
  label: string;
  description: string;
  className: string;
  appearance: BrandThemeAppearance;
  swatches: readonly [string, string, string];
};

export const brandThemes: readonly BrandThemeDefinition[] = [
  {
    id: 'v3rii',
    label: 'V3RII Neon',
    description: 'Mevcut pembe/turuncu marka enerjisi',
    className: 'theme-v3rii',
    appearance: 'dark',
    swatches: ['#ec007a', '#7c3aed', '#ff4b00'],
  },
  {
    id: 'corporateBlue',
    label: 'Kurumsal Lacivert',
    description: 'Finans, üretim ve B2B müşteriler için güven veren mavi',
    className: 'theme-corporate-blue',
    appearance: 'light',
    swatches: ['#1e3a8a', '#2563eb', '#06b6d4'],
  },
  {
    id: 'graphite',
    label: 'Grafit Gri',
    description: 'Sade, operasyonel ve az dikkat dağıtan tema',
    className: 'theme-graphite',
    appearance: 'dark',
    swatches: ['#111827', '#64748b', '#94a3b8'],
  },
  {
    id: 'emerald',
    label: 'Finans Yeşili',
    description: 'Güven, onay ve finans ekranları için yumuşak ton',
    className: 'theme-emerald',
    appearance: 'light',
    swatches: ['#065f46', '#10b981', '#2dd4bf'],
  },
  {
    id: 'executive',
    label: 'Premium Koyu',
    description: 'Lacivert, mor ve altın aksanlı üst seviye his',
    className: 'theme-executive',
    appearance: 'dark',
    swatches: ['#111827', '#6d28d9', '#f59e0b'],
  },
  {
    id: 'burgundy',
    label: 'Bordo Kurumsal',
    description: 'ERP ekranlarına yakın, ağır ve kurumsal his',
    className: 'theme-burgundy',
    appearance: 'dark',
    swatches: ['#7f1d1d', '#b91c1c', '#f97316'],
  },
  {
    id: 'industrialSteel',
    label: 'Endüstriyel Çelik',
    description: 'Üretim, stok ve fabrika operasyonları için metalik yapı',
    className: 'theme-industrial-steel',
    appearance: 'dark',
    swatches: ['#0f172a', '#475569', '#38bdf8'],
  },
  {
    id: 'cleanLight',
    label: 'Sade Açık',
    description: 'Gündüz kullanım ve yoğun veri girişi için göz yormayan yapı',
    className: 'theme-clean-light',
    appearance: 'light',
    swatches: ['#f8fafc', '#2563eb', '#14b8a6'],
  },
  {
    id: 'highContrast',
    label: 'Yüksek Kontrast',
    description: 'Net metin, belirgin sınırlar ve erişilebilir odak hissi',
    className: 'theme-high-contrast',
    appearance: 'dark',
    swatches: ['#020617', '#f8fafc', '#facc15'],
  },
  {
    id: 'minimalCrm',
    label: 'Minimal CRM',
    description: 'Daha az neon, daha çok operasyonel SaaS görünümü',
    className: 'theme-minimal-crm',
    appearance: 'light',
    swatches: ['#155e75', '#0f766e', '#64748b'],
  },
  {
    id: 'flatNavy',
    label: 'Düz Lacivert',
    description: 'Gradientsiz, net ve kurumsal lacivert arayüz',
    className: 'theme-flat-navy',
    appearance: 'dark',
    swatches: ['#1e3a8a', '#1e3a8a', '#1e3a8a'],
  },
  {
    id: 'flatSlate',
    label: 'Düz Grafit',
    description: 'Gradientsiz, sakin ve operasyonel yönetim paneli',
    className: 'theme-flat-slate',
    appearance: 'dark',
    swatches: ['#334155', '#334155', '#334155'],
  },
  {
    id: 'flatWhite',
    label: 'Düz Açık',
    description: 'Gradientsiz, aydınlık ve yoğun veri girişi odaklı tema',
    className: 'theme-flat-white',
    appearance: 'light',
    swatches: ['#f8fafc', '#2563eb', '#e2e8f0'],
  },
  {
    id: 'warmSand',
    label: 'Sıcak Kum',
    description: 'Sıcak bej tonlu, sakin ve ofis dostu açık arayüz',
    className: 'theme-warm-sand',
    appearance: 'light',
    swatches: ['#faf8f5', '#d97706', '#f59e0b'],
  },
  {
    id: 'skyMist',
    label: 'Gökyüzü Sisi',
    description: 'Hafif mavi-beyaz, ferah ve modern SaaS görünümü',
    className: 'theme-sky-mist',
    appearance: 'light',
    swatches: ['#f0f9ff', '#0ea5e9', '#7dd3fc'],
  },
  {
    id: 'softRose',
    label: 'Yumuşak Gül',
    description: 'Pembe-krem tonlu, yumuşak ve davetkar açık tema',
    className: 'theme-soft-rose',
    appearance: 'light',
    swatches: ['#fff1f2', '#ec4899', '#fda4af'],
  },
] as const;

const brandThemeIdSet = new Set<string>(brandThemeIds);

const brandThemeAppearanceMap = new Map<BrandTheme, BrandThemeAppearance>(
  brandThemes.map((item) => [item.id, item.appearance]),
);

export function isBrandTheme(value: string | null | undefined): value is BrandTheme {
  return Boolean(value && brandThemeIdSet.has(value));
}

export function getBrandThemeClass(theme: BrandTheme): string {
  return brandThemes.find((item) => item.id === theme)?.className ?? brandThemes[0].className;
}

export function readV3riiAppearanceOverride(): BrandThemeAppearance | null {
  const stored = localStorage.getItem(V3RII_APPEARANCE_OVERRIDE_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return null;
}

export function getBrandThemeAppearance(theme: BrandTheme): BrandThemeAppearance {
  if (theme === 'v3rii') {
    const override = readV3riiAppearanceOverride();
    if (override) {
      return override;
    }
  }
  return brandThemeAppearanceMap.get(theme) ?? 'light';
}

export function getBrandThemeBaseAppearance(theme: BrandTheme): BrandThemeAppearance {
  return brandThemeAppearanceMap.get(theme) ?? 'light';
}

export function toggleV3riiAppearanceOverride(): BrandThemeAppearance {
  const nextAppearance: BrandThemeAppearance = getBrandThemeAppearance('v3rii') === 'dark' ? 'light' : 'dark';
  localStorage.setItem(V3RII_APPEARANCE_OVERRIDE_STORAGE_KEY, nextAppearance);
  return nextAppearance;
}

export const darkBrandThemes = brandThemes.filter((item) => item.appearance === 'dark');

export const lightBrandThemes = brandThemes.filter((item) => item.appearance === 'light');
