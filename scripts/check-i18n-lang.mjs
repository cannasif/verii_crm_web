import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');
const localesRoot = path.join(srcRoot, 'locales');

function parseArgs(argv) {
  const args = new Map();
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args.set(key, next);
        i++;
      } else {
        args.set(key, 'true');
      }
    }
  }
  return args;
}

const argv = parseArgs(process.argv);
const lang = argv.get('lang');
if (!lang) {
  console.error('Usage: node scripts/check-i18n-lang.mjs --lang <ar|de|en|es|fr|it|tr> [--write] [--refLang en]');
  process.exit(1);
}
const write = argv.get('write') === 'true';
const refLang = argv.get('refLang') || 'en';
const fallbackLang = argv.get('fallbackLang') || 'tr';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flattenKeys(value, prefix = '', out = new Map()) {
  if (value === null || value === undefined) return out;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    out.set(prefix, String(value));
    return out;
  }
  if (Array.isArray(value)) return out;
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const nextPrefix = prefix ? `${prefix}.${k}` : k;
      flattenKeys(v, nextPrefix, out);
    }
  }
  return out;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function withNamespaceCompatibility(ns, bundle) {
  const camelNs = toCamelCase(ns);
  const nsScopedBundle =
    typeof bundle?.[ns] === 'object' && bundle[ns] !== null ? bundle[ns] : bundle;
  const camelScopedBundle =
    typeof bundle?.[camelNs] === 'object' && bundle[camelNs] !== null ? bundle[camelNs] : nsScopedBundle;

  return {
    ...nsScopedBundle,
    ...bundle,
    [ns]: nsScopedBundle,
    [camelNs]: camelScopedBundle,
  };
}

function listFilesRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...listFilesRecursive(full));
    else files.push(full);
  }
  return files;
}

function getNsDefaultFromUseTranslation(fileContent) {
  const arrayMatch = fileContent.match(/useTranslation\s*\(\s*\[\s*([^\]]+?)\s*\]\s*\)/s);
  if (arrayMatch) {
    const inside = arrayMatch[1];
    const firstNsMatch = inside.match(/['"]([^'"]+)['"]/);
    if (firstNsMatch) return firstNsMatch[1];
  }
  const singleMatch = fileContent.match(/useTranslation\s*\(\s*['"]([^'"]+)['"]\s*\)/s);
  if (singleMatch) return singleMatch[1];
  return undefined;
}

function parseNsFromOptionsObject(optionsObjSource) {
  const nsMatch = optionsObjSource ? optionsObjSource.match(/ns\s*:\s*['"]([^'"]+)['"]/) : null;
  return nsMatch ? nsMatch[1] : undefined;
}

function extractDefaultValueLiteral(optionsObjSource) {
  if (!optionsObjSource) return undefined;
  const m = optionsObjSource.match(/defaultValue\s*:\s*(['"`])([\s\S]*?)\1/);
  if (!m) return undefined;
  return m[2];
}

function skipSpaces(source, i) {
  while (i < source.length && /\s/.test(source[i])) i++;
  return i;
}

function parseTCalls(fileContent) {
  const results = [];
  const tRe = /\bt\s*\(\s*(['"`])/g;
  let match;
  while ((match = tRe.exec(fileContent))) {
    const quote = match[1];
    const keyStart = tRe.lastIndex;
    let keyEnd = keyStart;
    while (keyEnd < fileContent.length) {
      if (fileContent[keyEnd] === '\\') {
        keyEnd += 2;
        continue;
      }
      if (fileContent[keyEnd] === quote) break;
      keyEnd++;
    }
    if (fileContent[keyEnd] !== quote) continue;
    const rawKey = fileContent.slice(keyStart, keyEnd);

    let cursor = keyEnd + 1;
    cursor = skipSpaces(fileContent, cursor);

    let optionsObjSource = undefined;
    if (fileContent[cursor] === ',') {
      cursor++;
      cursor = skipSpaces(fileContent, cursor);
      if (fileContent[cursor] === '{') {
        const start = cursor;
        let depth = 0;
        let j = cursor;
        while (j < fileContent.length) {
          const ch = fileContent[j];
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              j++;
              optionsObjSource = fileContent.slice(start, j);
              cursor = j;
              break;
            }
          } else if (ch === '"' || ch === "'" || ch === '`') {
            const q = ch;
            j++;
            while (j < fileContent.length && fileContent[j] !== q) {
              if (fileContent[j] === '\\') j += 2;
              else j++;
            }
          }
          j++;
        }
      }
    }

    results.push({
      rawKey,
      optionsObjSource,
      index: match.index,
    });
  }
  return results;
}

function resolveKeyAndNs(rawKey, optionsObjSource, defaultNs) {
  if (rawKey.includes(':')) {
    const [maybeNs, ...rest] = rawKey.split(':');
    const key = rest.join(':');
    return { ns: maybeNs, key };
  }

  const nsFromOptions = optionsObjSource ? parseNsFromOptionsObject(optionsObjSource) : undefined;
  if (!nsFromOptions && rawKey.startsWith('common.')) {
    return { ns: 'common', key: rawKey };
  }

  return { ns: nsFromOptions ?? defaultNs, key: rawKey };
}

function setPath(obj, pathParts, value) {
  let cur = obj;
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    const isLast = i === pathParts.length - 1;
    if (isLast) {
      cur[part] = value;
      return;
    }
    if (typeof cur[part] !== 'object' || cur[part] === null || Array.isArray(cur[part])) {
      cur[part] = {};
    }
    cur = cur[part];
  }
}

function loadLocaleMaps(localeLang) {
  const trRoot = path.join(localesRoot, localeLang);
  if (!fs.existsSync(trRoot)) {
    throw new Error(`Locale folder not found: ${trRoot}`);
  }

  const localeNsToFlatKeys = new Map();
  const nsFiles = fs.readdirSync(trRoot);
  for (const fileName of nsFiles) {
    if (!fileName.endsWith('.json')) continue;
    const ns = fileName.replace(/\.json$/, '');
    const json = readJson(path.join(trRoot, fileName));
    const compatible = withNamespaceCompatibility(ns, json);
    const flat = flattenKeys(compatible);
    localeNsToFlatKeys.set(ns, flat);
  }
  return { localeLangRoot: trRoot, localeNsToFlatKeys };
}

function main() {
  const targetRoot = path.join(localesRoot, lang);
  if (!fs.existsSync(targetRoot)) {
    console.error(`Missing locale directory: ${targetRoot}`);
    process.exit(1);
  }

  const { localeNsToFlatKeys } = loadLocaleMaps(lang);
  const { localeNsToFlatKeys: refFlat } = loadLocaleMaps(refLang);
  const { localeNsToFlatKeys: fallbackFlat } = loadLocaleMaps(fallbackLang);

  const srcFiles = listFilesRecursive(srcRoot).filter((f) => /\.(ts|tsx)$/.test(f));
  const missing = [];

  for (const filePath of srcFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const defaultNs = getNsDefaultFromUseTranslation(content);
    const calls = parseTCalls(content);

    for (const call of calls) {
      if (!call.rawKey || call.rawKey.includes('${')) continue;

      const { ns, key } = resolveKeyAndNs(call.rawKey, call.optionsObjSource, defaultNs);
      if (!ns && !key) continue;

      let presentInAnyNs = false;
      for (const nsFlat of localeNsToFlatKeys.values()) {
        if (nsFlat.has(key)) {
          presentInAnyNs = true;
          break;
        }
      }

      if (!presentInAnyNs) {
        missing.push({
          filePath,
          ns: ns ?? '(any)',
          key,
          defaultValue: extractDefaultValueLiteral(call.optionsObjSource),
        });
      }
    }
  }

  const grouped = new Map();
  for (const m of missing) {
    const gKey = `${m.ns}::${m.key}`;
    const existing = grouped.get(gKey);
    if (existing) {
      existing.count++;
      if (!existing.defaultValue && m.defaultValue) existing.defaultValue = m.defaultValue;
    } else {
      grouped.set(gKey, { ...m, count: 1 });
    }
  }

  const missingArr = [...grouped.values()].sort((a, b) => b.count - a.count);
  console.log(`[${lang}] checkedFiles=${srcFiles.length} trueMissingGrouped=${missingArr.length}`);
  if (missingArr.length > 0) {
    for (const item of missingArr.slice(0, 20)) {
      const dv = item.defaultValue ? ` defaultValue=${JSON.stringify(item.defaultValue)}` : '';
      console.log(`- ${item.count} ${item.ns} :: ${item.key}${dv}`);
    }
  }

  if (!write || missingArr.length === 0) return;

  for (const item of missingArr) {
    const key = item.key;
    const ns = item.ns === '(any)' ? undefined : item.ns;

    let nsToWrite = ns;
    let writeValue = undefined;

    const refNsFound = (() => {
      if (nsToWrite && refFlat.has(nsToWrite) && refFlat.get(nsToWrite).has(key)) return nsToWrite;
      for (const [refNs, flat] of refFlat.entries()) {
        if (flat.has(key)) return refNs;
      }
      return undefined;
    })();

    if (refNsFound) {
      nsToWrite = nsToWrite ?? refNsFound;
      writeValue = refFlat.get(nsToWrite)?.get(key);
    }

    if (!writeValue) {
      const fbNsFound = (() => {
        if (nsToWrite && fallbackFlat.has(nsToWrite) && fallbackFlat.get(nsToWrite).has(key)) return nsToWrite;
        for (const [fbNs, flat] of fallbackFlat.entries()) {
          if (flat.has(key)) return fbNs;
        }
        return undefined;
      })();
      if (fbNsFound) {
        nsToWrite = nsToWrite ?? fbNsFound;
        writeValue = fallbackFlat.get(nsToWrite)?.get(key);
      }
    }

    if (!writeValue) writeValue = item.defaultValue ?? key;
    if (!nsToWrite) {
      console.error(`Cannot infer namespace to write for key=${key} lang=${lang}`);
      continue;
    }

    const filePath = path.join(localesRoot, lang, `${nsToWrite}.json`);
    const json = fs.existsSync(filePath) ? readJson(filePath) : {};

    const partsRaw = key.split('.').filter(Boolean);
    const hasWrapper = typeof json?.[nsToWrite] === 'object' && json[nsToWrite] !== null;
    const parts = !hasWrapper && partsRaw[0] === nsToWrite ? partsRaw.slice(1) : partsRaw;

    setPath(json, parts, writeValue);

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  }
}

main();

