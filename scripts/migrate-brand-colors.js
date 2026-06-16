/**
 * 批次把 .tsx / .ts 檔案內的舊色票 hex 改為 Tailwind token class
 *
 * 對照表（舊 hex → 新 Tailwind class）：
 *   #7B9FA6  霧藍 → primary
 *   #D4A574  暖木 → secondary
 *   #FAFAF8  米白 → background
 *   #3A3A3A  中性灰 → foreground
 *   #8B7BA6  紫灰（員工主色）→ primary（員工沿用主色）
 *   #A6B4D4  淺藍紫（員工次色）→ primary/80
 *   #F0E8F3  淺紫（員工背景）→ primary/10
 *   #d4183d  紅（危險） → danger
 *   #6A8E95  霧藍 hover → primary/85
 *   #c49560  暖木 hover → secondary/85
 *   #c41739  紅 hover → danger/85
 *   #b01530  紅 hover2 → danger/80
 *   #E5D6D8  柔粉 hover → soft-pink/80
 *   #D8E3D8  柔綠 hover → soft-green/80
 *
 * 跳過：docs/、.cursorrules、tailwind.config.ts、app/globals.css、lib/theme-config.ts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const SKIP_PATHS = [
  'node_modules',
  '.next',
  '.git',
  'docs',
  'scripts',
  'JapaneseD',  // 設計參考子目錄，保留原始色票以便日後對照
  'tailwind.config.ts',
  'app/globals.css',
  'lib/theme-config.ts',
  'lib/toast-theme.ts',  // 已手動處理（sonner inline style）
];

const REPLACEMENTS = [
  // 員工淺色背景（在特定 class 內才替換）
  { from: /bg-\[#F0E8F3\]/g, to: 'bg-primary/10' },
  { from: /text-\[#F0E8F3\]/g, to: 'text-primary/10' },
  { from: /border-\[#F0E8F3\]/g, to: 'border-primary/10' },
  // 員工主色
  { from: /bg-\[#8B7BA6\]/g, to: 'bg-primary' },
  { from: /text-\[#8B7BA6\]/g, to: 'text-primary' },
  { from: /border-\[#8B7BA6\]/g, to: 'border-primary' },
  { from: /shadow-\[#8B7BA6\]/g, to: 'shadow-primary' },
  { from: /from-\[#8B7BA6\]/g, to: 'from-primary' },
  { from: /to-\[#8B7BA6\]/g, to: 'to-primary' },
  // 員工次色（淺藍紫） → primary/80
  { from: /bg-\[#A6B4D4\]/g, to: 'bg-primary/80' },
  { from: /text-\[#A6B4D4\]/g, to: 'text-primary/80' },
  { from: /border-\[#A6B4D4\]/g, to: 'border-primary/80' },
  { from: /from-\[#A6B4D4\]/g, to: 'from-primary/80' },
  { from: /to-\[#A6B4D4\]/g, to: 'to-primary/80' },
  // 主色（霧藍 → 霧松綠）
  { from: /bg-\[#7B9FA6\]/g, to: 'bg-primary' },
  { from: /text-\[#7B9FA6\]/g, to: 'text-primary' },
  { from: /border-\[#7B9FA6\]/g, to: 'border-primary' },
  { from: /shadow-\[#7B9FA6\]/g, to: 'shadow-primary' },
  { from: /from-\[#7B9FA6\]/g, to: 'from-primary' },
  { from: /to-\[#7B9FA6\]/g, to: 'to-primary' },
  // 主色 hover（舊的 hover 變體直接用主色，透明度由 tailwind /85 處理）
  { from: /hover:bg-\[#6A8E95\]/g, to: 'hover:bg-primary/85' },
  { from: /hover:text-\[#6A8E95\]/g, to: 'hover:text-primary/85' },
  // 次色（暖木 → 暖杏橘）
  { from: /bg-\[#D4A574\]/g, to: 'bg-secondary' },
  { from: /text-\[#D4A574\]/g, to: 'text-secondary' },
  { from: /border-\[#D4A574\]/g, to: 'border-secondary' },
  { from: /shadow-\[#D4A574\]/g, to: 'shadow-secondary' },
  { from: /from-\[#D4A574\]/g, to: 'from-secondary' },
  { from: /to-\[#D4A574\]/g, to: 'to-secondary' },
  // 次色 hover
  { from: /hover:bg-\[#c49560\]/g, to: 'hover:bg-secondary/85' },
  // 背景
  { from: /bg-\[#FAFAF8\]/g, to: 'bg-background' },
  { from: /hover:bg-\[#FAFAF8\]/g, to: 'hover:bg-background' },
  // 文字
  { from: /text-\[#3A3A3A\]/g, to: 'text-foreground' },
  // 危險色
  { from: /bg-\[#d4183d\]/g, to: 'bg-danger' },
  { from: /text-\[#d4183d\]/g, to: 'text-danger' },
  { from: /border-\[#d4183d\]/g, to: 'border-danger' },
  // 危險色 hover
  { from: /hover:bg-\[#c41739\]/g, to: 'hover:bg-danger/85' },
  { from: /hover:bg-\[#b01530\]/g, to: 'hover:bg-danger/80' },
  // 柔色 hover
  { from: /hover:bg-\[#E5D6D8\]/g, to: 'hover:bg-soft-pink/80' },
  { from: /hover:bg-\[#D8E3D8\]/g, to: 'hover:bg-soft-green/80' },
  // 漏網：focus:ring-[#XXX] 形式（腳本第一版 regex 漏了 focus: prefix）
  { from: /focus:ring-\[#7B9FA6\]/g, to: 'focus:ring-primary' },
  { from: /focus:ring-\[#D4A574\]/g, to: 'focus:ring-secondary' },
  { from: /focus:ring-\[#d4183d\]/g, to: 'focus:ring-danger' },
  // 漏網：to-[#6A8E95] 漸層結束（hover 變體之外的版本）
  { from: /to-\[#6A8E95\]/g, to: 'to-primary/85' },
  { from: /from-\[#6A8E95\]/g, to: 'from-primary/85' },
  { from: /to-\[#c49560\]/g, to: 'to-secondary/85' },
  { from: /to-\[#c41739\]/g, to: 'to-danger/85' },
  { from: /to-\[#b01530\]/g, to: 'to-danger/80' },
  { from: /from-\[#c41739\]/g, to: 'from-danger/85' },
  { from: /from-\[#b01530\]/g, to: 'from-danger/80' },
  // 漏網：to-[#F0E8F3] / from-[#F0E8F3] 員工淺紫漸層
  { from: /from-\[#F0E8F3\]/g, to: 'from-primary/10' },
  { from: /to-\[#F0E8F3\]/g, to: 'to-primary/10' },
  // 漏網：to-[#FAFAF8] 漸層結束
  { from: /to-\[#FAFAF8\]/g, to: 'to-background' },
  // 漏網：bg-[#3A3A3A] / border-[#3A3A3A] 等深色背景
  { from: /bg-\[#3A3A3A\]/g, to: 'bg-foreground' },
  { from: /border-t-\[#3A3A3A\]/g, to: 'border-t-foreground' },
  { from: /border-\[#3A3A3A\]/g, to: 'border-foreground' },
  // 漏網：focus:ring-[#8B7BA6] 員工 focus ring
  { from: /focus:ring-\[#8B7BA6\]/g, to: 'focus:ring-primary' },
  // 漏網：focus:ring-[#F0E8F3] 員工淺紫 focus ring
  { from: /focus:ring-\[#F0E8F3\]/g, to: 'focus:ring-primary/20' },
  // 漏網：text-[#6B6B6B] 中性灰文字（用 muted-foreground token）
  { from: /text-\[#6B6B6B\]/g, to: 'text-muted-foreground' },
  // 漏網：bg-[#6B6B6B] / border-[#6B6B6B]
  { from: /bg-\[#6B6B6B\]/g, to: 'bg-muted-foreground' },
  { from: /border-\[#6B6B6B\]/g, to: 'border-muted-foreground' },
  // 漏網：to-[#E8D5D8] / from-[#E8D5D8] 柔粉 hover 變體
  { from: /from-\[#E8D5D8\]/g, to: 'from-soft-pink/80' },
  { from: /to-\[#E8D5D8\]/g, to: 'to-soft-pink/80' },
  // 漏網：border-t-[#7B9FA6] 旋轉 loading 邊框
  { from: /border-t-\[#7B9FA6\]/g, to: 'border-t-primary' },
  { from: /border-t-\[#D4A574\]/g, to: 'border-t-secondary' },
  { from: /border-t-\[#d4183d\]/g, to: 'border-t-danger' },
  // 漏網：from-[#6B6B6B] to-[#8B8B8B] 中性灰漸層
  { from: /from-\[#6B6B6B\]/g, to: 'from-muted-foreground' },
  { from: /to-\[#8B8B8B\]/g, to: 'to-muted-foreground/60' },
];

function shouldProcess(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (SKIP_PATHS.some(skip => rel === skip || rel.startsWith(skip + '/'))) {
    return false;
  }
  return /\.(tsx|ts)$/.test(filePath);
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  let changed = 0;

  for (const { from, to } of REPLACEMENTS) {
    const matches = content.match(from);
    if (matches) {
      changed += matches.length;
      content = content.replace(from, to);
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    return changed;
  }
  return 0;
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SKIP_PATHS.some(skip => entry.name === skip)) continue;
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
const changedFiles = [];
for (const f of files) {
  const c = processFile(f);
  if (c > 0) {
    totalChanges += c;
    changedFiles.push({ file: path.relative(ROOT, f), count: c });
  }
}

console.log(`\n總共改動 ${totalChanges} 處，${changedFiles.length} 個檔案`);
changedFiles.forEach(({ file, count }) => {
  console.log(`  ${count.toString().padStart(3)} × ${file}`);
});
