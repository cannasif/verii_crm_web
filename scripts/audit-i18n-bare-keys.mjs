#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const LANG = process.env.I18N_CHECK_LANG ?? 'tr';

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
]);

function hasNestedKey(obj, dottedPath) {
  const parts = dottedPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, p)) {
      return false;
    }
    cur = cur[p];
  }
  return cur !== undefined && cur !== null;
}

function deepMerge(base, overlay) {
  const out = { ...base };
  for (const [k, v] of Object.entries(overlay)) {
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      out[k] !== null &&
      typeof out[k] === 'object' &&
      !Array.isArray(out[k])
    ) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function collectValidNamespaces() {
  const set = new Set();
  const locDir = path.join(SRC, 'locales', LANG);
  if (fs.existsSync(locDir)) {
    for (const f of fs.readdirSync(locDir)) {
      if (f.endsWith('.json')) set.add(f.slice(0, -5));
    }
  }
  const featuresRoot = path.join(SRC, 'features');
  if (fs.existsSync(featuresRoot)) {
    for (const name of fs.readdirSync(featuresRoot, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const loc = path.join(featuresRoot, name.name, 'localization', `${LANG}.json`);
      if (fs.existsSync(loc)) set.add(name.name);
    }
  }
  return set;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function withNamespaceCompatibility(ns, bundle) {
  const nsScoped =
    bundle[ns] !== null && typeof bundle[ns] === 'object' && !Array.isArray(bundle[ns])
      ? bundle[ns]
      : bundle;
  const camelNs = toCamelCase(ns);
  const camelScoped =
    bundle[camelNs] !== null && typeof bundle[camelNs] === 'object' && !Array.isArray(bundle[camelNs])
      ? bundle[camelNs]
      : nsScoped;
  return {
    ...nsScoped,
    ...bundle,
    [ns]: nsScoped,
    [camelNs]: camelScoped,
  };
}

function loadNamespaceBundle(ns) {
  let bundle = {};
  const shared = path.join(SRC, 'locales', LANG, `${ns}.json`);
  if (fs.existsSync(shared)) {
    const raw = JSON.parse(fs.readFileSync(shared, 'utf8'));
    const inner = raw[ns];
    if (inner !== null && typeof inner === 'object' && !Array.isArray(inner)) {
      bundle = deepMerge(bundle, inner);
    }
    bundle = deepMerge(bundle, raw);
  }
  const featuresRoot = path.join(SRC, 'features');
  if (fs.existsSync(featuresRoot)) {
    const featurePath = path.join(featuresRoot, ns, 'localization', `${LANG}.json`);
    if (fs.existsSync(featurePath)) {
      bundle = deepMerge(bundle, JSON.parse(fs.readFileSync(featurePath, 'utf8')));
    }
  }
  return withNamespaceCompatibility(ns, bundle);
}

function isLikelyPerfKey(key) {
  return /mount.*paint|_to_paint|branches_ready|data_ready|preview_ready|mount:start|mount:end/i.test(
    key
  );
}

function walkFiles(dir, acc) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.includes('_old')) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walkFiles(full, acc);
    else if (/\.(tsx|ts)$/.test(name.name)) acc.push(full);
  }
}

function extractUseTranslationNamespaces(content) {
  const ns = new Set();
  if (/useTranslation\s*\(\s*\)/.test(content)) {
    ns.add('common');
  }
  const single = [...content.matchAll(/useTranslation\s*\(\s*['"]([a-zA-Z0-9_-]+)['"]\s*[\),]/g)];
  for (const m of single) ns.add(m[1]);

  const arrays = [...content.matchAll(/useTranslation\s*\(\s*\[([\s\S]*?)\]\s*[\),]/g)];
  for (const m of arrays) {
    const inner = m[1];
    const strings = [...inner.matchAll(/['"]([a-zA-Z0-9_-]+)['"]/g)];
    for (const s of strings) ns.add(s[1]);
  }
  if (ns.size === 0) ns.add('common');
  return [...ns];
}

function resolveBareKey(key, bundles, preferredNs) {
  const order = [...new Set([...preferredNs, ...[...bundles.keys()].sort()])];
  for (const ns of order) {
    const b = bundles.get(ns);
    if (b && hasNestedKey(b, key)) return ns;
  }
  return null;
}

const validNs = collectValidNamespaces();
const bundles = new Map();
for (const ns of validNs) {
  bundles.set(ns, loadNamespaceBundle(ns));
}

const files = [];
walkFiles(SRC, files);

const T_FIRST_ARG =
  /\b(?:i18n\.t|t)\s*\(\s*(['"])([^'"\\]*(\\.[^'"\\]*)*)\1/g;

const missing = [];

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  const preferred = extractUseTranslationNamespaces(content);
  const featMatch = rel.match(/features\/([^/]+)/);
  const featureFolder = featMatch ? featMatch[1] : null;

  let m;
  T_FIRST_ARG.lastIndex = 0;
  const re = new RegExp(T_FIRST_ARG.source, 'g');
  while ((m = re.exec(content)) !== null) {
    let key = m[2].replace(/\\\//g, '/');
    if (key.includes('${')) continue;
    if (key.includes(':')) continue;
    if (!/^[a-zA-Z]/.test(key)) continue;
    if (key.length < 2) continue;
    if (isLikelyPerfKey(key)) continue;
    const before = content.slice(Math.max(0, m.index - 80), m.index);
    if (/\b(console\.|describe\(|it\(|test\()/.test(before)) continue;

    const pref = featureFolder && validNs.has(featureFolder) ? [featureFolder, ...preferred] : preferred;
    const foundNs = resolveBareKey(key, bundles, pref);
    if (!foundNs) {
      missing.push({ key, file: rel, preferred: pref.slice(0, 5).join(',') });
    }
  }
}

missing.sort((a, b) => a.key.localeCompare(b.key) || a.file.localeCompare(b.file));

if (missing.length > 0) {
  console.error(`audit (${LANG}): ${missing.length} bare t() key(s) not found in any namespace:\n`);
  const byKey = new Map();
  for (const row of missing) {
    if (!byKey.has(row.key)) byKey.set(row.key, []);
    byKey.get(row.key).push(row.file);
  }
  for (const [key, files] of [...byKey.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.error(`  ${key}`);
    for (const f of [...new Set(files)].slice(0, 5)) console.error(`    — ${f}`);
    if (files.length > 5) console.error(`    — … (${files.length} refs)`);
  }
  process.exit(1);
}

console.log(`audit (${LANG}): OK — no missing bare t() keys across namespaces (${files.length} files scanned).`);
