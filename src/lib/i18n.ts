import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

const i18n = i18next.createInstance();

type ResourceModule = { default: Record<string, unknown> };

const sharedModules = import.meta.glob('../locales/**/*.json');
const featureModules = import.meta.glob('../features/**/localization/*.json');

type LoaderMap = Record<string, Record<string, () => Promise<ResourceModule>>>;
const loaders: LoaderMap = {};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Özellik `localization/*.json` ile `src/locales` aynı namespace'i paylaştığında üstünü çizmek yerine birleştir. */
const deepMergeResource = (
  base: Record<string, unknown>,
  overlay: Record<string, unknown>
): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(overlay)) {
    const over = overlay[key];
    const prev = out[key];
    if (isPlainObject(over) && isPlainObject(prev)) {
      out[key] = deepMergeResource(prev, over);
    } else {
      out[key] = over;
    }
  }
  return out;
};

for (const [path, loader] of Object.entries(sharedModules)) {
  const match = path.match(/\.\.\/locales\/([a-z-]+)\/(.+)\.json$/);
  if (!match) continue;
  const lang = match[1];
  const ns = match[2];
  if (!loaders[lang]) loaders[lang] = {};
  loaders[lang][ns] = loader as () => Promise<ResourceModule>;
}

for (const [path, loader] of Object.entries(featureModules)) {
  const match = path.match(/\.\.\/features\/([^/]+)\/localization\/([a-z-]+)\.json$/);
  if (!match) continue;
  const ns = match[1];
  const lang = match[2];
  if (!loaders[lang]) loaders[lang] = {};
  const featureLoader = loader as () => Promise<ResourceModule>;
  const existing = loaders[lang][ns];
  if (existing) {
    const sharedLoader = existing;
    loaders[lang][ns] = async () => {
      const [sharedMod, featureMod] = await Promise.all([sharedLoader(), featureLoader()]);
      return {
        default: deepMergeResource(
          sharedMod.default as Record<string, unknown>,
          featureMod.default as Record<string, unknown>
        ),
      };
    };
  } else {
    loaders[lang][ns] = featureLoader;
  }
}

const DEFAULT_LANG = 'tr';
const fallbackLng = DEFAULT_LANG;
const supportedLngs = Object.keys(loaders);
const INITIAL_NAMESPACES = ['common', 'notification'] as const;
const loadedBundlesByLanguage: Record<string, Record<string, Record<string, unknown>>> = {};

const toCamelCase = (value: string): string =>
  value.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());

const formatMissingKey = (): string => {
  // Eksik çeviri durumunda kullanıcıya hiçbir İngilizce anahtar/kelime göstermemek için
  // sabit Türkçe bir placeholder kullanıyoruz.
  return 'Çeviri eksik';
};

const hoistFeatureRootsIntoBundle = (
  target: Record<string, unknown>,
  sourceFeatureNs: string,
  scoped: Record<string, unknown>
): void => {
  if (sourceFeatureNs === 'report-designer') {
    const innerReport = scoped.reportDesigner;
    const innerPdf = scoped.pdfReportDesigner;
    if (innerReport !== null && typeof innerReport === 'object' && !Array.isArray(innerReport)) {
      target.reportDesigner = innerReport;
    }
    if (innerPdf !== null && typeof innerPdf === 'object' && !Array.isArray(innerPdf)) {
      target.pdfReportDesigner = innerPdf;
    }
    return;
  }
  if (sourceFeatureNs === 'category-definitions') {
    const inner = scoped.categoryDefinitions;
    if (inner !== null && typeof inner === 'object' && !Array.isArray(inner)) {
      target.categoryDefinitions = inner;
    }
  }
};

const withNamespaceCompatibility = (
  ns: string,
  bundle: Record<string, unknown>
): Record<string, unknown> => {
  const camelNs = toCamelCase(ns);
  const nsScopedBundle =
    typeof bundle[ns] === 'object' && bundle[ns] !== null
      ? (bundle[ns] as Record<string, unknown>)
      : bundle;
  const camelScopedBundle =
    typeof bundle[camelNs] === 'object' && bundle[camelNs] !== null
      ? (bundle[camelNs] as Record<string, unknown>)
      : nsScopedBundle;

  return {
    ...nsScopedBundle,
    ...bundle,
    [ns]: nsScopedBundle,
    [camelNs]: camelScopedBundle,
  };
};

const normalizeLang = (lng?: string | null): string | undefined => {
  if (!lng) return undefined;
  const lower = lng.toLowerCase();
  const mapped = lower === 'sa' ? 'ar' : lower;
  if (supportedLngs.includes(mapped)) return mapped;
  const base = mapped.split('-')[0];
  if (supportedLngs.includes(base)) return base;
  return mapped;
};

const storedLng = typeof localStorage !== 'undefined' ? localStorage.getItem('i18nextLng') : null;
const initialLng = storedLng ? (normalizeLang(storedLng) ?? DEFAULT_LANG) : DEFAULT_LANG;
const resolvedLng = supportedLngs.includes(initialLng) ? initialLng : DEFAULT_LANG;

function rebuildLanguageResources(lang: string): void {
  const bundlesForLanguage = loadedBundlesByLanguage[lang] ?? {};
  const scopedBundleByNs: Record<string, Record<string, unknown>> = {};

  for (const [ns, bundle] of Object.entries(bundlesForLanguage)) {
    const scoped =
      typeof bundle[ns] === 'object' && bundle[ns] !== null
        ? (bundle[ns] as Record<string, unknown>)
        : bundle;
    scopedBundleByNs[ns] = scoped;
  }

  for (const [ns, bundle] of Object.entries(bundlesForLanguage)) {
    const baseCompatibility = withNamespaceCompatibility(ns, bundle);
    for (const [otherNs, scopedBundle] of Object.entries(scopedBundleByNs)) {
      if (otherNs === ns) continue;
      (baseCompatibility as Record<string, unknown>)[otherNs] = scopedBundle;
      (baseCompatibility as Record<string, unknown>)[toCamelCase(otherNs)] = scopedBundle;
      hoistFeatureRootsIntoBundle(baseCompatibility as Record<string, unknown>, otherNs, scopedBundle);
    }

    i18n.addResourceBundle(lang, ns, baseCompatibility, true, true);
  }
}

async function loadNamespace(lang: string, ns: string): Promise<void> {
  const target = normalizeLang(lang) ?? fallbackLng;
  const langLoaders = loaders[target] || {};
  const loader = langLoaders[ns];
  if (!loader) return;

  if (!loadedBundlesByLanguage[target]) {
    loadedBundlesByLanguage[target] = {};
  }
  if (loadedBundlesByLanguage[target][ns]) return;

  const mod = await loader();
  loadedBundlesByLanguage[target][ns] = mod.default;
  rebuildLanguageResources(target);
}

export async function ensureNamespacesReady(
  namespaces: readonly string[] | string[],
  lang?: string
): Promise<void> {
  const target = normalizeLang(lang ?? i18n.resolvedLanguage ?? i18n.language ?? fallbackLng) ?? fallbackLng;
  const uniqueNamespaces = [...new Set(namespaces.map((ns) => ns.trim()).filter(Boolean))];
  for (const ns of uniqueNamespaces) {
    await loadNamespace(target, ns);
  }
  if (target !== fallbackLng) {
    for (const ns of uniqueNamespaces) {
      await loadNamespace(fallbackLng, ns);
    }
  }
}

export async function loadLanguage(lang: string): Promise<void> {
  await ensureNamespacesReady(INITIAL_NAMESPACES, lang);
}

const initPromise = (async () => {
  const namespaces = Object.keys(loaders[fallbackLng] || {});
  const defaultNS = namespaces.includes('common') ? 'common' : namespaces[0] ?? 'translation';
  await i18n.use(initReactI18next).init({
    lng: resolvedLng,
    fallbackLng,
    supportedLngs,
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    ns: namespaces.length > 0 ? namespaces : [defaultNS],
    defaultNS,
    resources: {},
    interpolation: { escapeValue: false },
    parseMissingKeyHandler: () => formatMissingKey(),
    returnEmptyString: false,
    detection: {
      order: [],
      caches: [],
    },
  });
  await ensureNamespacesReady(INITIAL_NAMESPACES, fallbackLng);
  if (resolvedLng !== fallbackLng) {
    await ensureNamespacesReady(INITIAL_NAMESPACES, resolvedLng);
  }
})();

i18n.on('languageChanged', async (lng) => {
  await ensureNamespacesReady(INITIAL_NAMESPACES, lng);
});

export async function ensureI18nReady(): Promise<void> {
  await initPromise;
}

export default i18n;
