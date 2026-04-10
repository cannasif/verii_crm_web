import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');

function flattenKeys(obj, prefix = '') {
  const keys = [];
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    keys.push(prefix);
    return keys;
  }
  for (const k of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, p));
    } else {
      keys.push(p);
    }
  }
  return keys;
}

function getPath(obj, dotted) {
  const parts = dotted.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setPath(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in cur) || typeof cur[p] !== 'object' || cur[p] === null) {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function orderLikeTemplate(source, template) {
  if (template === null || typeof template !== 'object' || Array.isArray(template)) {
    return source;
  }
  if (source === null || typeof source !== 'object' || Array.isArray(source)) {
    return source;
  }
  const out = {};
  for (const k of Object.keys(template)) {
    if (!(k in source)) continue;
    const sv = source[k];
    const tv = template[k];
    if (sv !== null && typeof sv === 'object' && !Array.isArray(sv) && tv !== null && typeof tv === 'object' && !Array.isArray(tv)) {
      out[k] = orderLikeTemplate(sv, tv);
    } else {
      out[k] = sv;
    }
  }
  return out;
}

function stripKeys(obj, keysToRemove) {
  const copy = { ...obj };
  for (const k of keysToRemove) {
    delete copy[k];
  }
  return copy;
}

function main() {
  const feature = process.argv[2];
  const lang = process.argv[3];
  if (!feature || !lang) {
    console.error('Usage: node normalize-feature-locale.mjs <feature> <lang>');
    process.exit(1);
  }
  const dir = path.join(ROOT, 'src/features', feature, 'localization');
  const trPath = path.join(dir, 'tr.json');
  const targetPath = path.join(dir, `${lang}.json`);
  const tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));
  let data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  const removeNs = feature === 'demand' ? ['demand'] : feature === 'quotation' ? ['quotation'] : [];
  data = stripKeys(data, removeNs);
  const beforeFlat = new Map(flattenKeys(data).map((k) => [k, getPath(data, k)]));
  let ordered = orderLikeTemplate(data, tr);
  const trKeys = flattenKeys(tr);
  for (const k of trKeys) {
    if (getPath(ordered, k) === undefined && beforeFlat.has(k)) {
      setPath(ordered, k, beforeFlat.get(k));
    }
  }
  for (const k of trKeys) {
    if (getPath(ordered, k) === undefined) {
      console.error(`Missing after normalize: ${feature}/${lang}: ${k}`);
      process.exit(1);
    }
  }
  const extra = flattenKeys(ordered).filter((k) => !trKeys.includes(k));
  if (extra.length) {
    console.error(`Extra keys: ${extra.join(', ')}`);
    process.exit(1);
  }
  fs.writeFileSync(targetPath, `${JSON.stringify(ordered, null, 2)}\n`);
  console.log(`OK ${feature}/${lang}.json`);
}

main();
