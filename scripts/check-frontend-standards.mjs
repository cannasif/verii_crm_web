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

    if (/search:\s*(?:params|request)\.search/.test(line)) {
      const requestObjectTail = lines.slice(index, index + 8).join('\n');
      const requestContext = lines.slice(Math.max(0, index - 5), index + 8).join('\n');
      const isNonPagedFacetQuery = requestContext.includes('/code-filter-options/query');
      if (!requestObjectTail.includes('searchFields') && !isNonPagedFacetQuery) {
        addViolation(
          file,
          lineNumber,
          'paged search serializer must forward searchFields together with search.'
        );
      }
    }
  });

  for (const match of content.matchAll(/interface\s+\w*(?:PagedParams|PagedRequest)\w*\s*(?:extends[^\{]+)?\{([\s\S]*?)\n\}/g)) {
    const body = match[1];
    if (body.includes('search?:') && !body.includes('searchFields?:')) {
      const lineNumber = content.slice(0, match.index).split(/\r?\n/).length;
      addViolation(file, lineNumber, 'paged request type has search but no searchFields.');
    }
  }
}

const files = await walk(srcDir);

for (const file of files) {
  checkFile(file, await readFile(file, 'utf8'));
}

const sharedAxiosFile = path.join(srcDir, 'lib', 'axios.ts');
const sharedAxiosSource = await readFile(sharedAxiosFile, 'utf8');

if (!/originalMethod === 'put'[\s\S]*?config\.method = 'post'[\s\S]*?appendPathSegment\(config\.url, 'update'\)/.test(sharedAxiosSource)) {
  addViolation(
    sharedAxiosFile,
    1,
    'shared Axios client must tunnel every PUT as POST with the canonical /update suffix.'
  );
}

if (!/originalMethod === 'delete'[\s\S]*?config\.method = 'post'[\s\S]*?appendPathSegment\(config\.url, 'delete'\)/.test(sharedAxiosSource)) {
  addViolation(
    sharedAxiosFile,
    1,
    'shared Axios client must tunnel every DELETE as POST with the canonical /delete suffix.'
  );
}

if (/isPutActionAlreadyInPath/.test(sharedAxiosSource)) {
  addViolation(
    sharedAxiosFile,
    1,
    'PUT route exceptions bypass the canonical /update contract and are not allowed.'
  );
}

if (violations.length > 0) {
  console.error('Frontend standard check failed:\n');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('Frontend standard check passed.');
