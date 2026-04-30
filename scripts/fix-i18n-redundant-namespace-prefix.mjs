#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function kebabToCamelPrefix(ns) {
  return ns
    .split('-')
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

function extractFirstNamespace(content) {
  const empty = /useTranslation\s*\(\s*\)/;
  if (empty.test(content)) return 'common';

  const single = content.match(/useTranslation\s*\(\s*['"]([a-zA-Z0-9_-]+)['"]\s*[\),]/);
  if (single) return single[1];

  const arr = content.match(/useTranslation\s*\(\s*\[([\s\S]*?)\]\s*[\),]/);
  if (arr) {
    const first = arr[1].match(/['"]([a-zA-Z0-9_-]+)['"]/);
    if (first) return first[1];
  }
  return null;
}

function walkFiles(dir, acc) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith('.') || name.name === 'node_modules') continue;
    const full = path.join(dir, name.name);
    if (name.name.includes('_old')) continue;
    if (name.isDirectory()) walkFiles(full, acc);
    else if (/\.(tsx|ts)$/.test(name.name)) acc.push(full);
  }
}

const files = [];
walkFiles(SRC, files);

let changedFiles = 0;
let totalReplacements = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const ns = extractFirstNamespace(content);
  if (!ns || ns === 'common') continue;

  const useCount = (content.match(/\buseTranslation\s*\(/g) ?? []).length;
  if (useCount !== 1) continue;

  const prefix = kebabToCamelPrefix(ns) + '.';
  const needle = new RegExp(
    `\\b(t|i18n\\.t)\\(\\s*(['"])${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g'
  );

  let n = 0;
  const next = content.replace(needle, (_, fn, q) => {
    n += 1;
    return `${fn}(${q}`;
  });

  if (n > 0) {
    fs.writeFileSync(file, next, 'utf8');
    changedFiles += 1;
    totalReplacements += n;
    console.log(`${path.relative(ROOT, file)}: ${n} prefix(es) stripped (${ns} -> ${prefix.slice(0, -1)})`);
  }
}

console.log(`\nDone: ${changedFiles} files, ${totalReplacements} replacements.`);
