// scripts/apply-hex-tokens.js
// Safe-mode: replace known hex values with Tailwind tokens.
// Updates both BASE_REPLACEMENTS and the ESLint rule's TAILWIND_HEX_PREFIXES.

const fs = require('fs');
const path = require('path');

// All known token mappings
const BASE_REPLACEMENTS = [
  // Phase 1: existing VI tokens
  ['#E8F0F8', 'cat-clothing'],
  ['#E8F3E8', 'soft-green'],
  ['#FFF8E7', 'soft-yellow'],
  ['#F0F0F0', 'cat-other'],
  ['#F8E8F0', 'cat-art'],
  ['#F5E6E8', 'soft-pink'],
  // Phase 2: grey-scale and accent (2026-07-13)
  ['#E8E3D8', 'neutral-stripe'],
  ['#D8D0C3', 'neutral-stripe-dark'],
  ['#F5F5F0', 'neutral-alt'],
  ['#F7F5EF', 'neutral-alt-warm'],
  ['#315F43', 'accent-green'],
];

const PREFIXES = ['bg', 'from', 'to', 'text', 'ring', 'via', 'border', 'shadow', 'fill', 'stroke', 'decoration', 'divide'];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let modified = original;
  let totalReplacements = 0;
  const fileReplacements = [];

  for (const [hex, token] of BASE_REPLACEMENTS) {
    for (const prefix of PREFIXES) {
      const pattern = escapeRe(`${prefix}-[${hex}]`) + '(\\/(?:[0-9]{1,3}))?';
      const re = new RegExp(pattern, 'g');
      const matches = [...modified.matchAll(re)];
      if (matches.length > 0) {
        modified = modified.replace(re, (full, opacity) => {
          return `${prefix}-${token}${opacity || ''}`;
        });
        totalReplacements += matches.length;
        fileReplacements.push({ pattern: `${prefix}-[${hex}]`, to: `${prefix}-${token}`, count: matches.length });
      }
    }
  }

  if (totalReplacements > 0) {
    fs.writeFileSync(filePath, modified, 'utf8');
    console.log(`  ${path.relative(process.cwd(), filePath)}: ${totalReplacements} replacements`);
    fileReplacements.forEach(r => console.log(`    ${r.pattern} -> ${r.to} (${r.count})`));
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

console.log('=== Scanning for hex violations to fix ===\n');

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
