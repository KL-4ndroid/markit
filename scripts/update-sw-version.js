/**
 * 自動更新 Service Worker 版本號
 * 
 * 使用方法：
 * npm run version:patch  # 1.0.0 -> 1.0.1
 * npm run version:minor  # 1.0.1 -> 1.1.0
 * npm run version:major  # 1.1.0 -> 2.0.0
 */

const fs = require('fs');
const path = require('path');

// 讀取 package.json 獲取版本號
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

const version = packageJson.version;

// 讀取 sw.js
const swPath = path.join(__dirname, '../public/sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');

// 更新版本號
swContent = swContent.replace(
  /const CACHE_VERSION = '[^']+';/,
  `const CACHE_VERSION = '${version}';`
);

// 更新日期
const today = new Date().toISOString().split('T')[0];
swContent = swContent.replace(
  /\/\/ 更新日期：.+/,
  `// 更新日期：${today}`
);

// 寫回文件
fs.writeFileSync(swPath, swContent, 'utf8');

console.log(`✅ Service Worker 版本已更新為 ${version}`);
console.log(`📅 更新日期：${today}`);
console.log('');
console.log('下一步：');
console.log('1. 更新 CHANGELOG.md');
console.log('2. git add .');
console.log(`3. git commit -m "chore: bump version to ${version}"`);
console.log('4. git push');
