import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { extractSource, extractHtml, featureArea, isDemoPath, isTestSurface } from './lib/ui-copy-inventory.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const slash = file => file.replace(/\\/g, '/');
const outputDir = 'docs/ui-copy';
const walk = dir => fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]) : [];
const all = ['app', 'components', 'lib', 'hooks', 'types'].flatMap(walk).concat(walk('public').filter(file => /\.(?:html|js)$/.test(file)));
const excluded = all.filter(file => isDemoPath(file));
const files = all.filter(file => /\.(?:[jt]sx?|html)$/.test(file) && !/\.d\.ts$/.test(file) && !isDemoPath(file)).sort();
const sources = new Map();
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const extracted = file.endsWith('.html') ? extractHtml(file, source) : extractSource(file, source);
  if (extracted.parseErrors) throw new Error(`Cannot inventory malformed source: ${file}`);
  sources.set(file, { ...extracted, sha256: crypto.createHash('sha256').update(source).digest('hex'),
    flags: [...new Set(source.match(/(?:NEXT_PUBLIC|FERIA)_[A-Z0-9_]+/g) ?? [])].sort() });
}
const resolveImport = (from, spec) => {
  const base = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? slash(path.posix.normalize(path.posix.join(path.posix.dirname(from), spec))) : null;
  if (!base) return null;
  return [base, ...['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'].map(ext => base + ext)].find(f => sources.has(f));
};
const graph = new Map(files.map(file => [file, sources.get(file).imports.map(spec => resolveImport(file, spec)).filter(Boolean)]));
const route = file => file.startsWith('app/') && /\/(?:page(?:\.web|\.smoke)?|layout|loading|error|not-found|global-error|template)\.[jt]sx?$/.test(file);
const formalRoots = files.filter(file => route(file) && !isTestSurface(file));
function reachable(roots) {
  const found = new Set(), queue = [...roots];
  while (queue.length) { const file = queue.pop(); if (found.has(file)) continue; found.add(file); queue.push(...graph.get(file) ?? []); }
  return found;
}
const formal = reachable(formalRoots);
const test = reachable(files.filter(file => route(file) && isTestSurface(file)));
function exposure(file) {
  if (file.endsWith('.html')) return file === 'public/offline.html' ? '靜態離線頁；未證實目前 SW 會自動導向' : '獨立靜態測試／修復 HTML；直接網址與程式條件另核對';
  if (isTestSurface(file)) return '測試／工具表面（另受建置或頁面 gate 限制）';
  if (file === 'public/sw.js') return 'Web 推送處理碼存在；不代表推送服務已啟用';
  if (file.startsWith('app/api/')) return 'API 回應／伺服器來源（須確認客戶端是否顯示）';
  if (formal.has(file)) return '正式頁面靜態引用鏈（不等於條件分支已啟用）';
  if (test.has(file)) return '僅由測試／工具頁靜態引用';
  return '未追到正式頁面引用（待核對動態接線／保留碼）';
}
function evidence(kind) {
  if (['畫面文字', '輸入提示', '輔助辨識', '確認／通知', 'DOM 訊息文字'].includes(kind)) return '直接呈現定義';
  if (kind === '動態文字入口') return '執行時綁定入口';
  if (kind === '來源候選') return '候選，非已證實提示';
  if (kind === '內部狀態／錯誤碼') return '內部代碼，非人類提示';
  return '文案生產端，須查使用端';
}
const records = files.flatMap(file => sources.get(file).records.map(row => {
  const [area, areaName] = featureArea(file);
  return { id: 'UI-' + crypto.createHash('sha256').update(`${file}:${row.start}:${row.kind}:${row.text}`).digest('hex').slice(0, 12),
    ...row, area, areaName, evidence: evidence(row.kind), exposure: exposure(file),
    featureFlagsInFile: sources.get(file).flags };
}));
const manifestFile = 'public/manifest.json';
const manifestSource = fs.readFileSync(path.join(root, manifestFile), 'utf8');
const manifest = JSON.parse(manifestSource);
const manifestRows = [];
function manifestVisit(obj, keys = []) {
  for (const [key, value] of Object.entries(obj)) {
    const property = [...keys, key].join('.');
    if (typeof value === 'object' && value) manifestVisit(value, [...keys, key]);
    else if (typeof value === 'string' && /^(name|short_name|description|label)$/.test(key)) {
      // Locate the precise key/value occurrence, including duplicate shortcut labels.
      manifestRows.push({ property, value });
    }
  }
}
manifestVisit(manifest);
let manifestOffset = 0;
for (const row of manifestRows) {
  const start = manifestSource.indexOf(JSON.stringify(row.value), manifestOffset);
  if (start < 0) throw new Error(`Missing manifest value: ${row.property}`);
  manifestOffset = start + JSON.stringify(row.value).length;
  const before = manifestSource.slice(0, start), line = before.split('\n').length;
  records.push({ id: 'UI-' + crypto.createHash('sha256').update(`${manifestFile}:${start}`).digest('hex').slice(0, 12),
    file: manifestFile, line, column: start - before.lastIndexOf('\n'), start, end: manifestOffset,
    text: row.value, rawText: row.value, sourceText: manifestSource.slice(start, manifestOffset), kind: '平台安裝文字', symbol: 'manifest', element: '', property: row.property,
    condition: 'Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定', purpose: `${row.property}：提供 Web App 安裝名稱、說明、截圖或捷徑標籤`,
    area: '12-public-platform', areaName: '公開政策、支援與平台文字', evidence: '直接呈現定義',
    exposure: 'Web manifest；不代表 iOS／Android 原生商店文案', featureFlagsInFile: [] });
}
records.sort((a,b) => a.file.localeCompare(b.file, 'en') || a.start - b.start || a.kind.localeCompare(b.kind, 'en'));
if (new Set(records.map(row => row.id)).size !== records.length) throw new Error('Duplicate inventory IDs');
const sourceTexts = new Map([...files, manifestFile].map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
for (const row of records) {
  const source = sourceTexts.get(row.file), prefix = source.slice(0, row.start);
  if (prefix.split('\n').length !== row.line || row.column !== row.start - prefix.lastIndexOf('\n') ||
      source.slice(row.start, row.end) !== row.sourceText) throw new Error(`Invalid source anchor: ${row.file}:${row.line}:${row.column}`);
}
const counts = key => Object.fromEntries([...new Set(records.map(row => row[key]))].sort().map(value => [value, records.filter(row => row[key] === value).length]));
const coverageFingerprint = crypto.createHash('sha256').update([...files, manifestFile].map(file => file + ':' + crypto.createHash('sha256').update(sourceTexts.get(file)).digest('hex')).join('\n')).digest('hex');
let previous;
try { previous = JSON.parse(fs.readFileSync(path.join(root, outputDir, 'inventory.json'), 'utf8')); } catch { /* First generation has no prior snapshot. */ }
// A commit of the inventory itself must not make --check report unchanged source as stale.
const head = previous?.coverageFingerprint === coverageFingerprint ? previous.baselineCommit : execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const data = { schemaVersion: 1, baselineCommit: head, coverageFingerprint, snapshotBasis: 'current saved working tree; source hashes below, not a deployed-runtime census',
  scope: ['app', 'components', 'lib', 'hooks', 'types', 'public/**/*.html', 'public/**/*.js', 'public/manifest.json'],
  excluded: { demoPaths: excluded.sort(), note: 'Demo is intentionally excluded without reading its source; dependencies, tests, docs, scripts, SQL migrations and user/cloud data are not UI copy sources in this scan.' },
  counts: { scannedFiles: files.length + 1, filesWithRecords: new Set(records.map(r => r.file)).size, records: records.length, uniqueText: new Set(records.filter(r => r.kind !== '動態文字入口').map(r => r.text)).size,
    byKind: counts('kind'), byEvidence: counts('evidence'), byExposure: counts('exposure') },
  fileCoverage: [...files.map(file => ({ file, sha256: sources.get(file).sha256, records: sources.get(file).records.length, exposure: exposure(file), imports: graph.get(file) })),
    { file: manifestFile, sha256: crypto.createHash('sha256').update(manifestSource).digest('hex'), records: manifestRows.length, exposure: 'Web manifest' }], records };
const outputs = new Map();
outputs.set(`${outputDir}/inventory.json`, JSON.stringify(data, null, 2) + '\n');
const cell = text => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;').replace(/\r?\n/g, ' ↵ ').replace(/`/g, '&#96;');
const link = row => `[${row.file}:${row.line}:${row.column}](../../${row.file}#L${row.line})`;
const areas = [...new Set(records.map(row => row.area))].sort();
for (const area of areas) {
  const rows = records.filter(row => row.area === area), title = rows[0].areaName;
  let md = `# ${title}：提示與介面文字\n\n> 自動產生；請勿手動修改。重新產生：\`node scripts/generate-ui-copy-inventory.mjs\`。\n> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)\n\n共 ${rows.length} 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。\n\n`;
  for (const file of [...new Set(rows.map(row => row.file))]) {
    const subset = rows.filter(row => row.file === file);
    md += `## ${file}\n\n${cell(subset[0].exposure)}\n\n`;
    if (subset[0].featureFlagsInFile.length) md += `同檔旗標（不代表每列均受它控制）：${subset[0].featureFlagsInFile.map(v => '`' + v + '`').join('、')}。\n\n`;
    md += '| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |\n| --- | --- | --- | --- |\n';
    for (const row of subset) md += `| ${row.id}<br>${link(row)} | ${cell(row.text)} | **${row.kind}** · ${row.evidence}<br>${cell(row.purpose)} | ${cell(row.symbol)}${row.property ? ' · ' + cell(row.property) : ''}<br>${cell(row.condition)} |\n`;
    md += '\n';
  }
  outputs.set(`${outputDir}/${area}.md`, md.trimEnd() + '\n');
}
let summary = '# 提示文字盤點：自動統計\n\n> 自動產生；範圍、限制與使用方式見[總索引](../APP_UI_COPY_INDEX.md)。\n\n';
summary += `基準提交：\`${head}\`；使用目前已儲存工作目錄（含尚未提交變更），可由 JSON 中 SHA-256 核對每檔。\n\n`;
summary += `- 掃描來源：${data.counts.scannedFiles} 檔。\n- 有紀錄：${data.counts.filesWithRecords} 檔。\n- 來源紀錄：${records.length} 筆（含動態入口、錯誤生產端與未證實候選）。\n- 文字／範本去重：${data.counts.uniqueText} 種（不含動態入口）。\n\n`;
for (const [title, key] of [['呈現證據', 'byEvidence'], ['文字類型', 'byKind'], ['接線／啟用判讀', 'byExposure']]) {
  summary += `## ${title}\n\n| 分類 | 筆數 |\n| --- | ---: |\n`;
  for (const [label, count] of Object.entries(data.counts[key])) summary += `| ${label} | ${count} |\n`;
  summary += '\n';
}
summary += '## 功能分冊\n\n| 功能 | 紀錄數 |\n| --- | ---: |\n';
for (const area of areas) { const rows = records.filter(r => r.area === area); summary += `| [${rows[0].areaName}](${area}.md) | ${rows.length} |\n`; }
outputs.set(`${outputDir}/SUMMARY.md`, summary);
let coverage = '# 來源檔覆蓋表\n\n> 自動產生；0 筆表示此檔未命中本次語法規則，並非證明不可能產生動態文字。SHA-256 完整值與本機引用鏈見 [JSON](inventory.json)。Demo 僅辨識路徑排除，未讀取內容。\n\n| 來源檔 | 紀錄數 | 接線／表面 |\n| --- | ---: | --- |\n';
for (const row of data.fileCoverage) coverage += `| [${row.file}](../../${row.file}) | ${row.records} | ${row.exposure} |\n`;
outputs.set(`${outputDir}/coverage.md`, coverage);
const columns = ['id', 'areaName', 'text', 'kind', 'evidence', 'file', 'line', 'column', 'purpose', 'symbol', 'element', 'property', 'condition', 'exposure'];
// TSV is documentation/interchange, not a spreadsheet executable; neutralize formula prefixes.
const tsv = value => String(value ?? '').replace(/[\t\r\n]+/g, ' ').replace(/^([=+@-])/, "'$1");
outputs.set(`${outputDir}/inventory.tsv`, '\uFEFF' + columns.join('\t') + '\n' + records.map(row => columns.map(col => tsv(row[col])).join('\t')).join('\n') + '\n');
const stale = [];
for (const [file, contents] of outputs) {
  if (check) { if (!fs.existsSync(path.join(root, file)) || fs.readFileSync(path.join(root, file), 'utf8') !== contents) stale.push(file); }
  else { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), contents, 'utf8'); }
}
if (stale.length) { console.error('Inventory is stale:\n' + stale.join('\n')); process.exitCode = 1; }
else console.log(JSON.stringify({ mode: check ? 'check' : 'generate', ...data.counts, outputs: outputs.size }, null, 2));
