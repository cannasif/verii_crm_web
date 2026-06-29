import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const allowedAxiosFiles = new Set([path.join(srcDir, 'lib', 'axios.ts')]);
const sourceExtensions = new Set(['.ts', '.tsx']);

const violations = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function addViolation(file, lineNumber, message) {
  violations.push(`${path.relative(rootDir, file)}:${lineNumber} ${message}`);
}

function checkFile(file, content) {
  const isAllowedAxiosFile = allowedAxiosFiles.has(file);
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (/\bconsole\.(log|debug|info|trace)\s*\(/.test(line)) {
      addViolation(
        file,
        lineNumber,
        'debug console usage is not allowed in production code; use state, telemetry, or console.warn/error for actionable failures.'
      );
    }

    if (!isAllowedAxiosFile && /import\s+axios\s+from\s+['"]axios['"]/.test(line)) {
      addViolation(
        file,
        lineNumber,
        'default axios import is only allowed in src/lib/axios.ts; use the shared api client or named helpers like isAxiosError.'
      );
    }

    if (!isAllowedAxiosFile && /\baxios\./.test(line)) {
      addViolation(
        file,
        lineNumber,
        'direct axios instance usage is only allowed in src/lib/axios.ts; route HTTP through feature api files and the shared client.'
      );
    }
  });
}

const files = await walk(srcDir);

for (const file of files) {
  checkFile(file, await readFile(file, 'utf8'));
}

if (violations.length > 0) {
  console.error('Frontend standard check failed:\n');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('Frontend standard check passed.');
