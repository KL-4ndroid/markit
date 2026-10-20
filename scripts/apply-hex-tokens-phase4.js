// scripts/apply-hex-tokens-phase4.js
// Phase 4: B-level replacements (use existing tokens)
const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
  // B級 — 用現有 token 替代
  // 格式: [oldHex, newToken, optionalPrefixFilter]
  { hex: '#FFE8C7', token: 'secondary/20', desc: '柔黃 hover state（接近 soft-yellow 加深）' },
  { hex: '#CFC7BA', token: 'neutral-stripe-dark', desc: '表單邊框（值相近）' },
];

const PREFIXES = ['bg', 'text', 'border', 'ring', 'shadow', 'fill', 'stroke', 'from', 'to', 'via', 'decoration', 'divide'];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|\\]/g, '\\$&');
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let modified = original;
  let totalReplacements = 0;
  const fileReplacements = [];

  for (const { hex, token, desc } of REPLACEMENTS) {
    for (const prefix of PREFIXES) {
      // Match: bg-[#FFE8C7] or bg-[#FFE8C7]/20
      // Build fresh regex inside the loop to avoid lastIndex state issues
      const buildRe = () => new RegExp(escapeRe(`${prefix}-[${hex}]`) + '(\\/(?:[0-9]{1,3}))?', 'g');
      let re = buildRe();
      const matches = [...modified.matchAll(re)];
      if (matches.length > 0) {
        re = buildRe();  // fresh instance for replace
        modified = modified.replace(re, (full, opacity) => {
          return `${prefix}-${token}${opacity || ''}`;
        });
        totalReplacements += matches.length;
        fileReplacements.push(`${prefix}-[${hex}] -> ${prefix}-${token} (${matches.length}x)`);
      }
    }
  }

  if (totalReplacements > 0) {
    fs.writeFileSync(filePath, modified, 'utf8');
    console.log(`  ${path.relative(process.cwd(), filePath)}:`);
    fileReplacements.forEach(r => console.log(`    ${r}`));
    return totalReplacements;
  }
  return 0;
}

function walkDir(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.next', 'node_modules', '.git', 'docs', 'JapaneseD'].includes(entry.name)) continue;
      results.push(...walkDir(full, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

console.log('=== Phase 4: B-level replacements (using existing tokens) ===\n');

const dirs = ['app', 'components', 'hooks', 'lib'];
let totalFiles = 0;
let totalReplacements = 0;

for (const dir of dirs) {
  const files = walkDir(dir, '.tsx');
  for (const f of files) {
    const n = processFile(f);
    if (n > 0) {
      totalFiles++;
      totalReplacements += n;
    }
  }
}

console.log('\n=== Summary ===');
console.log(`Files modified: ${totalFiles}`);
console.log(`Total replacements: ${totalReplacements}`);