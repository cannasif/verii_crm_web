import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');
const localesRoot = path.join(srcRoot, 'locales');
const trRoot = path.join(localesRoot, 'tr');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flattenKeys(value, prefix = '', out = new Map()) {
  if (value === null || value === undefined) return out;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    out.set(prefix, String(value));
    return out;
  }
  if (Array.isArray(value)) {
    // Arrays are not expected as translation leaves; ignore for now.
    return out;
  }
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
  const nsScopedBundle = typeof bundle?.[ns] === 'object' && bundle[ns] !== null ? bundle[ns] : bundle;
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
  // Handles: useTranslation('namespace') and useTranslation(['a','b'])
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
  const nsMatch = optionsObjSource.match(/ns\s*:\s*['"]([^'"]+)['"]/);
  return nsMatch ? nsMatch[1] : undefined;
}

function extractDefaultValueLiteral(optionsObjSource) {
  if (!optionsObjSource) return undefined;
  // Supports: defaultValue: '...' or "..."
  const m = optionsObjSource.match(/defaultValue\s*:\s*(['"`])([\s\S]*?)\1/);
  if (!m) return undefined;
  const quote = m[1];
  const value = m[2];
  // Avoid accidental captures that contain braces from neighboring objects.
  // This is best-effort only; if it looks empty/very short, still return.
  if (value === undefined) return undefined;
  return value;
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
    let i = tRe.lastIndex; // after opening quote
    // key literal
    const keyStart = i;
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

    let cursor = keyEnd + 1; // after closing quote
    cursor = skipSpaces(fileContent, cursor);

    // Optional options object as 2nd argument.
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
            // skip string literals inside options
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
  // Case: 'ns:key'
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

function main() {
  if (!fs.existsSync(trRoot)) {
    console.error(`Missing tr locale folder: ${trRoot}`);
    process.exit(1);
  }

  const localeNsToFlatKeys = new Map();
  const trFiles = fs.readdirSync(trRoot);
  for (const fileName of trFiles) {
    if (!fileName.endsWith('.json')) continue;
    const ns = fileName.replace(/\.json$/, '');
    const json = readJson(path.join(trRoot, fileName));
    const compatible = withNamespaceCompatibility(ns, json);
    const flat = flattenKeys(compatible);
    localeNsToFlatKeys.set(ns, flat);
  }

  const srcFiles = listFilesRecursive(srcRoot).filter((f) => /\.(ts|tsx)$/.test(f));
  const missing = [];

  for (const filePath of srcFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const defaultNs = getNsDefaultFromUseTranslation(content);
    const calls = parseTCalls(content);
    for (const call of calls) {
      // Skip obviously non-static keys.
      if (!call.rawKey || call.rawKey.includes('${')) continue;

      const { ns, key } = resolveKeyAndNs(call.rawKey, call.optionsObjSource, defaultNs);

      if (!ns) {
        // Namespace belirsiz: key herhangi bir tr namespace'inde var mı kontrol et.
        let foundInAny = false;
        for (const nsFlat of localeNsToFlatKeys.values()) {
          if (nsFlat.has(key)) {
            foundInAny = true;
            break;
          }
        }
        if (!foundInAny) {
          const defaultValue = extractDefaultValueLiteral(call.optionsObjSource);
          missing.push({
            filePath,
            ns: '(any)',
            key,
            reason: `Key not found in any tr namespace`,
            defaultValue,
          });
        }
        continue;
      }

      const nsFlat = localeNsToFlatKeys.get(ns);
      if (!nsFlat) {
        missing.push({
          filePath,
          ns,
          key,
          reason: `Namespace not found in tr locales`,
          defaultValue: extractDefaultValueLiteral(call.optionsObjSource),
        });
        continue;
      }

      if (!nsFlat.has(key)) {
        const defaultValue = extractDefaultValueLiteral(call.optionsObjSource);
        missing.push({
          filePath,
          ns,
          key,
          reason: `Key not found in tr/${ns}.json`,
          defaultValue,
        });
      }
    }
  }

  // Reduce noise: group by ns+key.
  const grouped = new Map();
  for (const m of missing) {
    const gKey = `${m.ns}::${m.key}`;
    const existing = grouped.get(gKey);
    if (existing) {
      existing.count++;
      if (!existing.defaultValue && m.defaultValue) existing.defaultValue = m.defaultValue;
      if (!existing.sampleFile) existing.sampleFile = m.filePath;
    } else {
      grouped.set(gKey, { ...m, count: 1, sampleFile: m.filePath });
    }
  }

  const missingArr = [...grouped.values()].sort((a, b) => b.count - a.count);
  console.log(`Checked ${srcFiles.length} source files.`);
  console.log(`Missing keys (grouped): ${missingArr.length}`);
  console.log(`Top 50:`);
  for (const item of missingArr.slice(0, 50)) {
    const dv = item.defaultValue ? ` defaultValue="${item.defaultValue}"` : '';
    console.log(
      `- [${item.count}] ${item.ns} :: ${item.key} (${item.reason}) @ ${path.relative(repoRoot, item.filePath)}${dv}`,
    );
  }

  if (missingArr.length > 0) process.exitCode = 1;

  if (process.env.I18N_WRITE_REPORT === '1') {
    const reportPath = path.join(repoRoot, 'scripts', 'i18n-missing-tr-report.json');
    const report = {
      checkedFiles: srcFiles.length,
      missingGroupedCount: missingArr.length,
      missing: missingArr,
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  }
}

main();

