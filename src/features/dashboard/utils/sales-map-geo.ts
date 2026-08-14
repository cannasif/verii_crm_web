import type { RankedSalesMapLocation } from './sales-map-metrics';
import { getSalesMapMetricValue } from './sales-map-metrics';
import type {
  SalesMapCountriesGeoJson,
  SalesMapCountryFeature,
  SalesMapCountryLabel,
  SalesMapCountryProperties,
} from '../types/sales-map-geo';
import type { SalesMapMetric, SalesMapMetricState } from '../types/dashboard-sales-map';

const NAME_BY_LANGUAGE: Record<string, keyof SalesMapCountryProperties> = {
  tr: 'NAME_TR',
  en: 'NAME_EN',
  de: 'NAME_DE',
  fr: 'NAME_FR',
  es: 'NAME_ES',
  it: 'NAME_IT',
  ar: 'NAME_AR',
};

export const POLITICAL_OCEAN = '#9ec5e8';
export const POLITICAL_LAND = '#ebe7df';
export const POLITICAL_BORDER = '#7b8490';
export const POLITICAL_BORDER_ACTIVE = '#3f4a57';
export const POLITICAL_LABEL = '#1f2933';
export const POLITICAL_LABEL_MUTED = '#4b5563';

export function getSalesMapCountryIso(properties: SalesMapCountryProperties): string {
  const primary = (properties.ISO_A2 || '').toUpperCase();
  if (/^[A-Z]{2}$/.test(primary)) return primary;
  const fallback = (properties.ISO_A2_EH || '').toUpperCase();
  if (/^[A-Z]{2}$/.test(fallback)) return fallback;
  return '';
}

const COUNTRY_CODE_ALIASES: Record<string, string> = {
  USA: 'US',
  AMERICA: 'US',
  AMERIKA: 'US',
  UNITEDSTATES: 'US',
  UNITEDSTATESOFAMERICA: 'US',
  UK: 'GB',
  GBR: 'GB',
  UAE: 'AE',
  RUS: 'RU',
  RUSSIA: 'RU',
  RUSYA: 'RU',
  TUR: 'TR',
  TURKEY: 'TR',
  TURKIYE: 'TR',
  ITALY: 'IT',
  ITALYA: 'IT',
  DEU: 'DE',
  GERMANY: 'DE',
  ALMANYA: 'DE',
  FRA: 'FR',
  FRANCE: 'FR',
  FRANSA: 'FR',
  ESP: 'ES',
  SPAIN: 'ES',
  ISPANYA: 'ES',
  NLD: 'NL',
  CHN: 'CN',
  JPN: 'JP',
};

function stripCountryKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('en-US')
    .replace(/İ/g, 'I')
    .replace(/I/g, 'I')
    .replace(/[^A-Z]/g, '');
}

export function normalizeSalesMapCountryCode(
  countryCode?: string | null,
  countryName?: string | null,
  cityName?: string | null,
): string {
  const rawCode = stripCountryKey(countryCode || '');
  if (COUNTRY_CODE_ALIASES[rawCode]) return COUNTRY_CODE_ALIASES[rawCode];
  if (/^[A-Z]{2}$/.test(rawCode)) return rawCode;

  const nameKey = stripCountryKey(countryName || cityName || '');
  if (COUNTRY_CODE_ALIASES[nameKey]) return COUNTRY_CODE_ALIASES[nameKey];
  if (/AMERIKA|UNITEDSTATES|USA/.test(nameKey)) return 'US';
  if (/ITALYA|ITALY/.test(nameKey)) return 'IT';
  if (/TURKIYE|TURKEY/.test(nameKey)) return 'TR';
  if (/ALMANYA|GERMANY/.test(nameKey)) return 'DE';
  if (/FRANSA|FRANCE/.test(nameKey)) return 'FR';
  if (/ISPANYA|SPAIN/.test(nameKey)) return 'ES';
  if (/RUSYA|RUSSIA/.test(nameKey)) return 'RU';
  if (/BIRLESIKKRALLIK|UNITEDKINGDOM|ENGLAND/.test(nameKey)) return 'GB';
  return '';
}

export function getSalesMapCountryName(
  properties: SalesMapCountryProperties,
  language: string,
): string {
  const key = NAME_BY_LANGUAGE[language.split('-')[0]] ?? 'NAME_EN';
  const localized = properties[key];
  if (typeof localized === 'string' && localized.trim()) return localized;
  return properties.NAME_EN || properties.NAME || '';
}

export function projectEquirectangular(
  longitude: number,
  latitude: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: ((longitude + 180) / 360) * width,
    y: ((90 - latitude) / 180) * height,
  };
}

function ringToSvgPath(ring: number[][], width: number, height: number): string {
  if (ring.length === 0) return '';
  const parts = ring.map((coordinate, index) => {
    const point = projectEquirectangular(coordinate[0], coordinate[1], width, height);
    return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  });
  return `${parts.join(' ')} Z`;
}

export function countryGeometryToSvgPath(
  feature: SalesMapCountryFeature,
  width: number,
  height: number,
): string {
  const { geometry } = feature;
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates as number[][][])
      .map((ring) => ringToSvgPath(ring, width, height))
      .join(' ');
  }
  return (geometry.coordinates as number[][][][])
    .map((polygon) => polygon.map((ring) => ringToSvgPath(ring, width, height)).join(' '))
    .join(' ');
}

export function buildCountryColorMap(locations: RankedSalesMapLocation[]): Map<string, string> {
  const buckets = new Map<string, { color: string; score: number }>();
  locations.forEach((location) => {
    const code = normalizeSalesMapCountryCode(
      location.countryCode,
      location.countryName,
      location.cityName,
    );
    if (!code) return;
    const current = buckets.get(code);
    if (!current || location.score > current.score) {
      buckets.set(code, { color: location.color, score: location.score });
    }
  });
  return new Map(Array.from(buckets, ([code, value]) => [code, value.color]));
}

export function findSalesMapLocationForCountry(
  locations: RankedSalesMapLocation[],
  countryCode: string,
): RankedSalesMapLocation | undefined {
  const code = normalizeSalesMapCountryCode(countryCode);
  if (!code) return undefined;
  const matches = locations.filter((location) => (
    normalizeSalesMapCountryCode(location.countryCode, location.countryName, location.cityName) === code
  ));
  if (matches.length === 0) return undefined;
  const countryLevel = matches.find((location) => location.administrativeAreaType === 'country');
  if (countryLevel) return countryLevel;
  return matches.reduce((best, location) => (location.score > best.score ? location : best));
}

const PROVINCE_NAME_ALIASES: Record<string, string> = {
  afyon: 'afyonkarahisar',
  afyonkarahisar: 'afyonkarahisar',
  icel: 'mersin',
  mersin: 'mersin',
  maras: 'kahramanmaras',
  kahramanmaras: 'kahramanmaras',
  urfa: 'sanliurfa',
  sanliurfa: 'sanliurfa',
  hakkari: 'hakkari',
};

export function normalizeSalesMapProvinceKey(value: string): string {
  const mappedChars = value
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .replace(/Â/g, 'a')
    .replace(/â/g, 'a')
    .replace(/Î/g, 'i')
    .replace(/î/g, 'i')
    .replace(/Û/g, 'u')
    .replace(/û/g, 'u')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
  return PROVINCE_NAME_ALIASES[mappedChars] ?? mappedChars;
}

export function buildProvinceColorMap(locations: RankedSalesMapLocation[]): Map<string, string> {
  const buckets = new Map<string, { color: string; score: number }>();
  locations.forEach((location) => {
    if (normalizeSalesMapCountryCode(location.countryCode, location.countryName, location.cityName) !== 'TR') return;
    if (location.administrativeAreaType === 'country') return;
    const key = normalizeSalesMapProvinceKey(location.cityName);
    if (!key) return;
    const current = buckets.get(key);
    if (!current || location.score > current.score) {
      buckets.set(key, { color: location.color, score: location.score });
    }
  });
  return new Map(Array.from(buckets, ([key, value]) => [key, value.color]));
}

export function findSalesMapLocationForProvince(
  locations: RankedSalesMapLocation[],
  provinceName: string,
): RankedSalesMapLocation | undefined {
  const target = normalizeSalesMapProvinceKey(provinceName);
  if (!target) return undefined;
  const matches = locations.filter((location) => {
    if (normalizeSalesMapCountryCode(location.countryCode, location.countryName, location.cityName) !== 'TR') return false;
    if (location.administrativeAreaType === 'country') return false;
    return normalizeSalesMapProvinceKey(location.cityName) === target;
  });
  if (matches.length === 0) return undefined;
  return matches.reduce((best, location) => (location.score > best.score ? location : best));
}

export function buildCountryLabels(
  geo: SalesMapCountriesGeoJson,
  colorMap: Map<string, string>,
  language: string,
): SalesMapCountryLabel[] {
  return geo.features
    .map((feature) => {
      const code = getSalesMapCountryIso(feature.properties);
      if (!code) return null;
      const longitude = feature.properties.LABEL_X;
      const latitude = feature.properties.LABEL_Y;
      if (typeof longitude !== 'number' || typeof latitude !== 'number') return null;
      const name = getSalesMapCountryName(feature.properties, language);
      if (!name) return null;
      return {
        code,
        name,
        longitude,
        latitude,
        color: colorMap.get(code) ?? POLITICAL_LABEL,
      };
    })
    .filter((label): label is SalesMapCountryLabel => label != null)
    .sort((left, right) => left.name.localeCompare(right.name, language));
}

function politicalFontSize(labelRank?: number, highlighted = false): number {
  const base = labelRank == null
    ? 11
    : labelRank <= 1
      ? 20
      : labelRank <= 2
        ? 16
        : labelRank <= 3
          ? 13
          : labelRank <= 5
            ? 11
            : labelRank <= 6
              ? 9
              : 0;
  if (base === 0) return 0;
  return highlighted ? base + 1 : base;
}

export function paintPoliticalTexture(
  geo: SalesMapCountriesGeoJson,
  colorMap: Map<string, string>,
  language: string,
  width = 4096,
  height = 2048,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  context.fillStyle = POLITICAL_OCEAN;
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  geo.features.forEach((feature) => {
    const code = getSalesMapCountryIso(feature.properties);
    const highlight = colorMap.get(code);
    context.fillStyle = highlight ?? POLITICAL_LAND;
    context.strokeStyle = highlight ? POLITICAL_BORDER_ACTIVE : POLITICAL_BORDER;
    context.lineWidth = highlight ? 1.8 : 1.05;
    const path = new Path2D(countryGeometryToSvgPath(feature, width, height));
    context.fill(path);
    context.stroke(path);
  });

  geo.features.forEach((feature) => {
    const code = getSalesMapCountryIso(feature.properties);
    const longitude = feature.properties.LABEL_X;
    const latitude = feature.properties.LABEL_Y;
    if (typeof longitude !== 'number' || typeof latitude !== 'number') return;
    const name = getSalesMapCountryName(feature.properties, language);
    if (!name) return;
    const highlighted = colorMap.has(code);
    const fontSize = politicalFontSize(feature.properties.LABELRANK, highlighted);
    if (fontSize < 8) return;
    const point = projectEquirectangular(longitude, latitude, width, height);
    context.font = `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = Math.max(2.2, fontSize * 0.18);
    context.strokeStyle = 'rgba(255,255,255,0.92)';
    context.fillStyle = highlighted ? POLITICAL_LABEL : POLITICAL_LABEL_MUTED;
    context.strokeText(name, point.x, point.y);
    context.fillText(name, point.x, point.y);
  });

  return canvas;
}

export function formatSalesMapPinLabel(
  location: RankedSalesMapLocation,
  language: string,
  metrics: SalesMapMetricState,
): string {
  const activeMetrics = (Object.keys(metrics) as SalesMapMetric[]).filter((metric) => metrics[metric]);
  if (activeMetrics.length === 0) return '0';

  const countMetrics = activeMetrics.filter((metric) => metric !== 'tlAmount');
  const tlEnabled = activeMetrics.includes('tlAmount');
  const compactNumber = new Intl.NumberFormat(language, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 0,
  });
  const compactCurrency = new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'TRY',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  });

  if (tlEnabled && countMetrics.length === 0) {
    return compactCurrency.format(getSalesMapMetricValue(location, 'tlAmount'));
  }

  const countValue = countMetrics.reduce(
    (total, metric) => total + getSalesMapMetricValue(location, metric),
    0,
  );

  if (!tlEnabled) {
    return compactNumber.format(Math.max(0, countValue));
  }

  const tlValue = getSalesMapMetricValue(location, 'tlAmount');
  if (tlValue > 0) {
    return compactCurrency.format(tlValue);
  }
  return compactNumber.format(Math.max(0, countValue));
}

export function getSalesMapPinValue(
  location: RankedSalesMapLocation,
  metrics: SalesMapMetricState,
): number {
  const activeMetrics = (Object.keys(metrics) as SalesMapMetric[]).filter((metric) => metrics[metric]);
  if (activeMetrics.length === 0) return 0;
  return activeMetrics.reduce((total, metric) => total + getSalesMapMetricValue(location, metric), 0);
}
