import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const featuresRoot = path.join(repoRoot, 'src', 'features');
const LANGS = ['ar', 'de', 'es', 'fr', 'it'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

function replaceWhenSameAsTr(target, trNode, enNode) {
  if (target === null || target === undefined) return;
  if (typeof target !== 'object' || Array.isArray(target)) return;
  for (const key of Object.keys(target)) {
    const tv = target[key];
    const trv = trNode !== null && trNode !== undefined && typeof trNode === 'object' ? trNode[key] : undefined;
    const env = enNode !== null && enNode !== undefined && typeof enNode === 'object' ? enNode[key] : undefined;
    if (tv !== null && typeof tv === 'object' && !Array.isArray(tv) && trv !== null && typeof trv === 'object') {
      replaceWhenSameAsTr(tv, trv, env && typeof env === 'object' ? env : undefined);
    } else if (
      typeof tv === 'string' &&
      typeof trv === 'string' &&
      tv === trv &&
      typeof env === 'string' &&
      env !== trv
    ) {
      target[key] = env;
    }
  }
}

function main() {
  const feats = fs
    .readdirSync(featuresRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const feat of feats) {
    const loc = path.join(featuresRoot, feat, 'localization');
    if (!fs.existsSync(loc)) continue;
    const trPath = path.join(loc, 'tr.json');
    const enPath = path.join(loc, 'en.json');
    if (!fs.existsSync(trPath) || !fs.existsSync(enPath)) continue;
    const tr = readJson(trPath);
    const en = readJson(enPath);
    for (const lang of LANGS) {
      const p = path.join(loc, `${lang}.json`);
      if (!fs.existsSync(p)) continue;
      const target = readJson(p);
      replaceWhenSameAsTr(target, tr, en);
      writeJson(p, target);
    }
  }
}

main();
