export const BRAND_THEME_STORAGE_KEY = 'vite-ui-brand-theme';

export const BRAND_THEME_CLASS_PREFIX = 'theme-';

export const brandThemeIds = [
  'v3rii',
  'corporateBlue',
  'graphite',
  'emerald',
  'executive',
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
    description: 'Daha ciddi, finans ve yönetim odaklı görünüm',
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
] as const;

const brandThemeIdSet = new Set<string>(brandThemeIds);

export function isBrandTheme(value: string | null | undefined): value is BrandTheme {
  return Boolean(value && brandThemeIdSet.has(value));
}

export function getBrandThemeClass(theme: BrandTheme): string {
  return brandThemes.find((item) => item.id === theme)?.className ?? brandThemes[0].className;
}
