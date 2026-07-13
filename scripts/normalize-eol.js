// scripts/normalize-eol.js
// Force LF line endings on all tracked .tsx/.ts/.js/.mjs files.
// Idempotent — safe to run multiple times.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walkDir(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.next', 'node_modules', '.git', 'docs', 'JapaneseD', '.cursor'].includes(entry.name)) continue;
      results.push(...walkDir(full, exts));
    } else if (exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const exts = ['.tsx', '.ts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.md', '.mdx'];
const dirs = ['app', 'components', 'hooks', 'lib', 'scripts', 'types', 'tests', 'supabase'];
let converted = 0;
let checked = 0;

for (const dir of dirs) {
  for (const f of walkDir(dir, exts)) {
    checked++;
    const buf = fs.readFileSync(f);
    // Detect CRLF (0D 0A sequence)
    if (buf.includes(0x0D) && buf.indexOf(0x0D) < buf.length - 1 && buf[buf.indexOf(0x0D) + 1] === 0x0A) {
      const normalized = buf.toString('utf8').replace(/\r\n/g, '\n');
      fs.writeFileSync(f, normalized, 'utf8');
      console.log(`  ${path.relative(process.cwd(), f)}: CRLF -> LF`);
      converted++;
    }
  }
}

// Also check top-level files
const topLevel = ['.cursorrules', '.gitignore', '.gitattributes', 'eslint.config.mjs', 'tailwind.config.ts', 'next.config.mjs', 'tsconfig.json', 'postcss.config.js'];
for (const f of topLevel) {
  if (!fs.existsSync(f)) continue;
  checked++;
  const buf = fs.readFileSync(f);
  if (buf.includes(0x0D) && buf.indexOf(0x0D) < buf.length - 1 && buf[buf.indexOf(0x0D) + 1] === 0x0A) {
    const normalized = buf.toString('utf8').replace(/\r\n/g, '\n');
    fs.writeFileSync(f, normalized, 'utf8');
    console.log(`  ${f}: CRLF -> LF`);
    converted++;
  }
}

console.log(`\nChecked ${checked} files, converted ${converted} to LF`);