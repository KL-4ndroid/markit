# 🚀 快速發布新版本指南

## 一鍵發布流程

### 步驟 1：修改版本號

根據變更類型選擇：

```bash
# 修復 Bug（1.0.0 -> 1.0.1）
npm run version:patch

# 新增功能（1.0.1 -> 1.1.0）
npm run version:minor

# 重大變更（1.1.0 -> 2.0.0）
npm run version:major
```

這會自動：
- ✅ 更新 `package.json` 版本號
- ✅ 更新 `public/sw.js` 版本號
- ✅ 更新日期

### 步驟 2：更新變更日誌

編輯 `CHANGELOG.md`，添加新版本的變更：

```markdown
## [1.0.2] - 2026-01-25

### 新增
- ✨ 新功能描述

### 修復
- 🐛 修復的問題描述
```

### 步驟 3：提交並推送

```bash
git add .
git commit -m "chore: bump version to 1.0.2"
git push
```

### 步驟 4：驗證部署

1. 等待 Vercel 自動部署（約 2-3 分鐘）
2. 在手機上打開 APP
3. 等待 30 秒或手動觸發更新檢查
4. 應該看到更新提示對話框

---

## 手動觸發更新檢查（測試用）

在瀏覽器控制台執行：

```javascript
// 檢查更新
navigator.serviceWorker.ready.then(reg => {
  reg.update().then(() => {
    console.log('✅ 更新檢查完成');
  });
});

// 查看當前版本
navigator.serviceWorker.ready.then(reg => {
  const channel = new MessageChannel();
  channel.port1.onmessage = (event) => {
    console.log('當前版本:', event.data.version);
  };
  reg.active.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
});
```

---

## 版本號選擇指南

| 變更類型 | 版本號變化 | 使用命令 | 示例 |
|---------|-----------|---------|------|
| 🐛 Bug 修復 | 修訂號 +1 | `npm run version:patch` | 1.0.0 → 1.0.1 |
| ✨ 新增功能 | 次版本號 +1 | `npm run version:minor` | 1.0.1 → 1.1.0 |
| 💥 重大變更 | 主版本號 +1 | `npm run version:major` | 1.1.0 → 2.0.0 |

---

## 常見發布場景

### 場景 1：修復緊急 Bug

```bash
# 1. 修復代碼
# 2. 測試
npm run dev

# 3. 發布修訂版本
npm run version:patch

# 4. 更新 CHANGELOG.md
# 添加：### 修復 - 🐛 修復 XXX 問題

# 5. 提交
git add .
git commit -m "fix: 修復 XXX 問題"
git push
```

### 場景 2：發布新功能

```bash
# 1. 開發新功能
# 2. 測試
npm run dev

# 3. 發布次版本
npm run version:minor

# 4. 更新 CHANGELOG.md
# 添加：### 新增 - ✨ 新增 XXX 功能

# 5. 提交
git add .
git commit -m "feat: 新增 XXX 功能"
git push
```

### 場景 3：重大架構變更

```bash
# 1. 完成重構
# 2. 全面測試
npm run build
npm start

# 3. 發布主版本
npm run version:major

# 4. 更新 CHANGELOG.md
# 添加：### 重大變更 - 💥 重構 XXX 架構

# 5. 提交
git add .
git commit -m "refactor!: 重構 XXX 架構"
git push
```

---

## 發布前檢查清單

在執行 `git push` 前，請確認：

- [ ] 代碼已測試無誤
- [ ] 版本號已更新（執行了 `npm run version:*`）
- [ ] CHANGELOG.md 已更新
- [ ] 沒有遺留的 console.log
- [ ] 沒有未提交的文件
- [ ] 確認要發布的分支（通常是 main）

---

## 回滾版本（緊急情況）

如果發布後發現嚴重問題：

### 方法 1：快速修復並發布新版本（推薦）

```bash
# 1. 修復問題
# 2. 發布修訂版本
npm run version:patch
git add .
git commit -m "fix: 緊急修復 XXX"
git push
```

### 方法 2：回滾到上一個版本

```bash
# 1. 回滾代碼
git revert HEAD

# 2. 推送
git push

# 3. 用戶會自動收到「更新」（實際是回滾）
```

---

## 監控更新狀態

### 查看 Service Worker 狀態

Chrome DevTools → Application → Service Workers

- **Activated and is running**：當前版本正在運行
- **Waiting to activate**：新版本已下載，等待啟用
- **Installing**：正在安裝新版本

### 查看快取版本

Chrome DevTools → Application → Cache Storage

- 應該看到 `market-pulse-v1.0.1` 等快取

---

## 故障排除

### 問題 1：用戶沒有收到更新提示

**檢查**：
```javascript
// 控制台執行
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Registration:', reg);
  console.log('Waiting:', reg.waiting);
  console.log('Installing:', reg.installing);
  console.log('Active:', reg.active);
});
```

**解決**：
```javascript
// 手動觸發更新
navigator.serviceWorker.ready.then(reg => reg.update());
```

### 問題 2：更新後還是舊版本

**解決**：
```javascript
// 清除所有快取
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});

// 註銷 Service Worker
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});

// 強制重新載入
location.reload(true);
```

### 問題 3：Service Worker 註冊失敗

**檢查**：
1. 確認 `public/sw.js` 存在
2. 確認 HTTPS 或 localhost
3. 查看控制台錯誤訊息

---

## 最佳實踐

### ✅ 應該做的

1. **每次發布都更新版本號**
2. **詳細記錄 CHANGELOG**
3. **在開發環境測試更新流程**
4. **使用語義化版本號**
5. **小步快跑，頻繁發布小更新**

### ❌ 不應該做的

1. **不要跳過版本號**
2. **不要忘記更新 CHANGELOG**
3. **不要在未測試的情況下發布**
4. **不要一次發布太多變更**
5. **不要在高峰時段發布重大更新**

---

## 自動化建議（未來）

可以考慮使用 GitHub Actions 自動化發布流程：

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Update SW version
        run: node scripts/update-sw-version.js
      - name: Deploy to Vercel
        run: vercel --prod
```

---

## 總結

發布新版本只需 3 步：

```bash
# 1. 更新版本號
npm run version:patch

# 2. 更新 CHANGELOG.md
# （手動編輯）

# 3. 提交並推送
git add .
git commit -m "chore: bump version to X.X.X"
git push
```

就這麼簡單！🎉
