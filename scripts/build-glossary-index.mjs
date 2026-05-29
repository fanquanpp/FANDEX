import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GLOSSARY_DIR = join(__dirname, '..', 'src', 'content', 'glossary');
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'glossary-index.json');

async function walkDir(dir, ext, fn) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walkDir(full, ext, fn);
    else if (entry.name.endsWith(ext)) await fn(full);
  }
}

function extractTerms(content, moduleId) {
  const terms = {};
  const lines = content.split('\n');
  let currentTerm = null;
  let state = 'seek_heading';
  let defLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const headingMatch = trimmed.match(/^###\s+\d+\.\d+\s+(.+)$/);
    if (headingMatch) {
      if (currentTerm && defLines.length > 0) {
        const def = defLines.join(' ').trim();
        if (def.length > 0 && def.length < 200) {
          terms[currentTerm] = { module: moduleId, def, slug: `${moduleId}/glossary` };
        }
      }
      let termName = headingMatch[1].trim();
      const parenMatch = termName.match(/^(.+?)\s*[（(]/);
      if (parenMatch) termName = parenMatch[1].trim();
      currentTerm = termName;
      state = 'seek_def';
      defLines = [];
      continue;
    }

    if (state === 'seek_def' && /(\*\*定义\*\*[：:]|定义[：:])\s*/.test(trimmed)) {
      state = 'capture_def';
      const afterDef = trimmed.replace(/.*?(?:\*\*定义\*\*[：:]|定义[：:])\s*/, '').trim();
      if (afterDef) defLines.push(afterDef);
      continue;
    }

    if (state === 'capture_def') {
      if (
        trimmed.startsWith('**详解') ||
        trimmed.startsWith('**名称') ||
        trimmed.startsWith('**首次') ||
        trimmed === '---' ||
        trimmed.startsWith('###')
      ) {
        state = 'seek_heading';
        if (trimmed.startsWith('###')) {
          i--;
        }
        continue;
      }
      if (trimmed && !trimmed.startsWith('**首次') && !trimmed.startsWith('**名称')) {
        defLines.push(trimmed);
      }
    }
  }

  if (currentTerm && defLines.length > 0) {
    const def = defLines.join(' ').trim();
    if (def.length > 0 && def.length < 200) {
      terms[currentTerm] = { module: moduleId, def, slug: `${moduleId}/glossary` };
    }
  }

  return terms;
}

async function main() {
  const allTerms = {};
  const dirs = await readdir(GLOSSARY_DIR, { withFileTypes: true });

  for (const entry of dirs) {
    if (!entry.isDirectory()) continue;
    const moduleId = entry.name;
    const moduleDir = join(GLOSSARY_DIR, moduleId);

    await walkDir(moduleDir, '.md', async (filePath) => {
      const content = await readFile(filePath, 'utf-8');
      const terms = extractTerms(content, moduleId);
      Object.assign(allTerms, terms);
    });
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const json = JSON.stringify(allTerms);
  await writeFile(OUTPUT_FILE, json, 'utf-8');

  const count = Object.keys(allTerms).length;
  console.log(`Glossary index: ${count} terms written to ${OUTPUT_FILE}`);
}

main().catch(console.error);
