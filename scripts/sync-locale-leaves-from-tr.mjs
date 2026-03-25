import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const localesRoot = path.join(repoRoot, 'src', 'locales');
const sourceLang = 'tr';
const targetLangs = ['en', 'ar', 'de', 'es', 'fr', 'it'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function flattenLeaves(value, prefix = '', out = new Map()) {
  if (value === null || value === undefined) return out;
  if (typeof value === 'string') {
    out.set(prefix, value);
    return out;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    out.set(prefix, String(value));
    return out;
  }
  if (Array.isArray(value)) return out;
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const nextPrefix = prefix ? `${prefix}.${k}` : k;
      flattenLeaves(v, nextPrefix, out);
    }
  }
  return out;
}

function setPath(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
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

function main() {
  const srcDir = path.join(localesRoot, sourceLang);
  if (!fs.existsSync(srcDir)) throw new Error(`Missing src dir: ${srcDir}`);

  const nsFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith('.json'));
  for (const nsFile of nsFiles) {
    const ns = nsFile.replace(/\.json$/, '');
    const srcJsonPath = path.join(srcDir, nsFile);
    const srcJson = readJson(srcJsonPath);
    const srcLeaves = flattenLeaves(srcJson);

    for (const targetLang of targetLangs) {
      const targetJsonPath = path.join(localesRoot, targetLang, `${ns}.json`);
      const targetJson = fs.existsSync(targetJsonPath) ? readJson(targetJsonPath) : {};
      const targetLeaves = flattenLeaves(targetJson);

      let changed = false;
      for (const [key, val] of srcLeaves.entries()) {
        if (!targetLeaves.has(key)) {
          const parts = key.split('.').filter(Boolean);
          setPath(targetJson, parts, val);
          changed = true;
        }
      }

      if (changed) writeJson(targetJsonPath, targetJson);
    }
  }
}

main();

