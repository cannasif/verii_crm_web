import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const featuresRoot = path.join(repoRoot, 'src', 'features');
const LANGS = ['ar', 'de', 'es', 'fr', 'it'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

function mergeMissing(target, trRef, enRef) {
  if (trRef === null || trRef === undefined) return;
  if (typeof trRef !== 'object' || Array.isArray(trRef)) return;
  for (const key of Object.keys(trRef)) {
    const trVal = trRef[key];
    const enVal =
      enRef !== null &&
      enRef !== undefined &&
      typeof enRef === 'object' &&
      !Array.isArray(enRef) &&
      Object.prototype.hasOwnProperty.call(enRef, key)
        ? enRef[key]
        : undefined;
    if (typeof trVal === 'object' && trVal !== null && !Array.isArray(trVal)) {
      const enChild =
        enVal !== null && enVal !== undefined && typeof enVal === 'object' && !Array.isArray(enVal)
          ? enVal
          : undefined;
      if (
        !Object.prototype.hasOwnProperty.call(target, key) ||
        target[key] === null ||
        typeof target[key] !== 'object' ||
        Array.isArray(target[key])
      ) {
        target[key] = {};
      }
      mergeMissing(target[key], trVal, enChild);
    } else if (!Object.prototype.hasOwnProperty.call(target, key)) {
      if (enVal !== undefined && typeof enVal !== 'object') {
        target[key] = enVal;
      } else {
        target[key] = trVal;
      }
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
    if (!fs.existsSync(trPath)) continue;
    const tr = readJson(trPath);
    const en = fs.existsSync(enPath) ? readJson(enPath) : {};

    for (const lang of LANGS) {
      const p = path.join(loc, `${lang}.json`);
      const target = fs.existsSync(p) ? readJson(p) : {};
      mergeMissing(target, tr, en);
      writeJson(p, target);
    }
  }
}

main();
