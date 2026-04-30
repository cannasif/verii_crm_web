#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const LANG = process.env.I18N_CHECK_LANG ?? 'tr';

const EXPLICIT_NS_KEY_RE =
  /['"`]([a-z][a-z0-9-]*):([a-zA-Z][a-zA-Z0-9_.]*)['"`]/g;

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
      if (f.endsWith('.json')) {
        set.add(f.slice(0, -5));
      }
    }
  }
  const featuresRoot = path.join(SRC, 'features');
  if (fs.existsSync(featuresRoot)) {
    for (const name of fs.readdirSync(featuresRoot, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const loc = path.join(featuresRoot, name.name, 'localization', `${LANG}.json`);
      if (fs.existsSync(loc)) {
        set.add(name.name);
      }
    }
  }
  return set;
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
  return bundle;
}

function isLikelyPerfOrInstrumentationKey(key) {
  return (
    /mount.*paint|_to_paint|branches_ready|data_ready|preview_ready|mount:start|mount:end/i.test(
      key
    ) || /^perf[A-Z]/.test(key)
  );
}

function walkFiles(dir, acc, extTest) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith('.')) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walkFiles(full, acc, extTest);
    else if (extTest(name.name)) acc.push(full);
  }
}

const validNamespaces = collectValidNamespaces();
const used = new Map();
const srcFiles = [];
walkFiles(SRC, srcFiles, (n) => n.endsWith('.tsx') || n.endsWith('.ts'));

for (const file of srcFiles) {
  const text = fs.readFileSync(file, 'utf8');
  let m;
  EXPLICIT_NS_KEY_RE.lastIndex = 0;
  while ((m = EXPLICIT_NS_KEY_RE.exec(text)) !== null) {
    const ns = m[1];
    const key = m[2];
    if (ns === 'http' || ns === 'https') continue;
    if (!validNamespaces.has(ns)) continue;
    if (isLikelyPerfOrInstrumentationKey(key)) continue;
    const rel = path.relative(ROOT, file);
    if (!used.has(ns)) used.set(ns, new Map());
    const byNs = used.get(ns);
    if (!byNs.has(key)) byNs.set(key, new Set());
    byNs.get(key).add(rel);
  }
}

const bundles = new Map();
const missing = [];

for (const ns of used.keys()) {
  bundles.set(ns, loadNamespaceBundle(ns));
}

for (const [ns, keys] of used.entries()) {
  const bundle = bundles.get(ns);
  const empty = Object.keys(bundle).length === 0;
  for (const key of keys.keys()) {
    if (empty || !hasNestedKey(bundle, key)) {
      const files = [...keys.get(key)].sort();
      missing.push({ ns, key, files });
    }
  }
}

missing.sort((a, b) => `${a.ns}:${a.key}`.localeCompare(`${b.ns}:${b.key}`));

if (missing.length > 0) {
  console.error(
    `i18n check (${LANG}): ${missing.length} explicit namespace key(s) missing from locale bundles:\n`
  );
  for (const row of missing) {
    console.error(`  ${row.ns}:${row.key}`);
    for (const f of row.files.slice(0, 3)) console.error(`    — ${f}`);
    if (row.files.length > 3) console.error(`    — … +${row.files.length - 3} files`);
  }
  console.error(
    `\nFix: add keys under src/locales/${LANG}/<namespace>.json and/or feature localization, or preload the namespace in route-namespaces.`
  );
  console.error(
    `Run with a second language: I18N_CHECK_LANG=en node scripts/check-i18n-explicit-namespaces.mjs`
  );
  process.exit(1);
}

console.log(
  `i18n check (${LANG}): OK — ${used.size} namespace(s) with explicit ns:key references resolved.`
);
