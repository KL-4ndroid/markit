/**
 * 批次品牌名稱重命名：市集誌 → 出攤筆記，Féria → Féria
 *
 * 排除：
 * - node_modules / .next / .git
 * - 檔名/路徑（lib/db/hooks.ts 等開發者註解會處理，但 supabase/migrations 不會）
 * - 第三方 auth 品牌「Féria 帳號」（LoginModal 內）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'scripts',  // 自己
  'JapaneseD',  // 設計參考
  'supabase',   // 資料庫 migrations 與 RLS，不動
]);

const SKIP_FILES = new Set([
  // 歷史收斂總檔，避免批次工具重寫長篇封存內容
  'docs/CONVERGENCE_ARCHIVE.md',
  'docs/DATA_CONVERGENCE_PLAN.md',
  'docs/CURSOR_DATA_CONVERGENCE_HANDOFF.md',
  'docs/CURSOR_HANDOFF_PLAN.md',
  // 第三方 auth 品牌，登入按鈕用「Féria 帳號」
  'components/auth/LoginModal.tsx',
]);

// 對照表：(regex, replacement, note)
const REPLACEMENTS = [
  // 中文品牌名
  { from: /市集誌/g, to: '出攤筆記', note: '中文品牌名' },

  // 英文品牌名（在開發者註解、UI title、HTML title、PWA manifest）
  { from: /Féria/g, to: 'Féria', note: '英文品牌名' },

  // 特殊：app/page.tsx 內曾有舊品牌組合，統一改為 Féria。
  { from: /出攤筆記 - Féria/g, to: 'Féria - 出攤筆記', note: 'page.tsx title' },
];

function shouldProcess(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (SKIP_FILES.has(rel)) return false;
  const parts = rel.split('/');
  if (parts.some(p => SKIP_DIRS.has(p))) return false;
  return /\.(tsx|ts|jsx|js|html|css|json|md|sql|mdx)$/.test(filePath);
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let total = 0;
  const log = [];

  for (const { from, to, note } of REPLACEMENTS) {
    const before = content;
    content = content.replace(from, to);
    if (content !== before) {
      const count = (before.match(from) || []).length;
      total += count;
      log.push(`  ${count} × ${note}`);
    }
  }

  if (total > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    return { total, log };
  }
  return null;
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (shouldProcess(full)) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(ROOT);
console.log(`處理 ${files.length} 個檔案...`);

let totalChanges = 0;
let changedFiles = 0;
for (const f of files) {
  const r = processFile(f);
  if (r) {
    changedFiles++;
    totalChanges += r.total;
    console.log(`\n${path.relative(ROOT, f)}`);
    r.log.forEach(l => console.log(l));
  }
}

console.log(`\n=== 總計改動 ${totalChanges} 處，${changedFiles} 個檔案 ===`);
