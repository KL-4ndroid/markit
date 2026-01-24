# GitHub 推送指南

## ✅ 已完成步驟

### 1. Git 初始化和提交 ✅

```bash
✅ Git 已初始化
✅ 所有檔案已加入暫存區
✅ 已設定 Git 使用者資訊
✅ 已提交初始版本
```

**提交資訊：**
- Commit ID: `7350306`
- 訊息: "Initial commit: Market Pulse - 攤販市集管理系統"
- 檔案數: 269 個檔案
- 新增行數: 63,563 行

---

## 📋 接下來的步驟

### 步驟 2：在 GitHub 上創建新倉庫

**方式 1：使用 GitHub 網站（推薦）**

1. 前往 https://github.com/new
2. 填寫倉庫資訊：
   - **Repository name**: `market-pulse` 或 `market2`
   - **Description**: `攤販市集管理系統 - 離線優先的 PWA 應用`
   - **Visibility**: 
     - ✅ Public（公開，任何人都可以看到）
     - ⭕ Private（私有，只有你可以看到）
3. **不要**勾選以下選項（因為我們已有本地檔案）：
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
4. 點擊 **Create repository**

---

### 步驟 3：連接遠端倉庫並推送

創建倉庫後，GitHub 會顯示指令。請在專案目錄執行：

#### 選項 A：使用 HTTPS（推薦，較簡單）

```bash
# 1. 添加遠端倉庫（替換 YOUR_USERNAME 為你的 GitHub 使用者名稱）
git remote add origin https://github.com/YOUR_USERNAME/market-pulse.git

# 2. 推送到 GitHub
git push -u origin master
```

**首次推送時會要求輸入 GitHub 帳號密碼：**
- Username: 你的 GitHub 使用者名稱
- Password: 你的 GitHub Personal Access Token（不是密碼）

**如何取得 Personal Access Token：**
1. 前往 https://github.com/settings/tokens
2. 點擊 "Generate new token" → "Generate new token (classic)"
3. 勾選 `repo` 權限
4. 點擊 "Generate token"
5. 複製 token（只會顯示一次，請妥善保存）

---

#### 選項 B：使用 SSH（需要先設定 SSH Key）

```bash
# 1. 添加遠端倉庫
git remote add origin git@github.com:YOUR_USERNAME/market-pulse.git

# 2. 推送到 GitHub
git push -u origin master
```

**如果尚未設定 SSH Key：**
1. 生成 SSH Key：
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   ```
2. 複製公鑰：
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
3. 前往 https://github.com/settings/keys
4. 點擊 "New SSH key"
5. 貼上公鑰並儲存

---

## 🚀 完整推送指令（複製貼上）

### 使用 HTTPS（推薦）

```bash
# 進入專案目錄
cd e:\market2

# 添加遠端倉庫（記得替換 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/market-pulse.git

# 推送到 GitHub
git push -u origin master
```

---

### 使用 SSH

```bash
# 進入專案目錄
cd e:\market2

# 添加遠端倉庫（記得替換 YOUR_USERNAME）
git remote add origin git@github.com:YOUR_USERNAME/market-pulse.git

# 推送到 GitHub
git push -u origin master
```

---

## 📊 專案統計

```
總檔案數：269 個
總程式碼行數：63,563 行
主要技術：
  - Next.js 14
  - TypeScript
  - Tailwind CSS
  - Dexie.js (IndexedDB)
  - Supabase
  - PWA
```

---

## 📁 專案結構

```
market2/
├── app/                    # Next.js 頁面
├── components/             # React 組件
├── lib/                    # 核心邏輯
│   ├── db/                # IndexedDB 資料庫
│   └── supabase/          # Supabase 整合
├── supabase/              # Supabase 遷移檔案
├── public/                # 靜態資源
├── types/                 # TypeScript 類型定義
└── 文檔/                  # 完整的開發文檔
```

---

## 🎯 推送後的驗證

推送成功後，請檢查：

1. ✅ 前往 GitHub 倉庫頁面
2. ✅ 確認所有檔案都已上傳
3. ✅ 檢查 README.md 是否正確顯示
4. ✅ 確認 commit 歷史正確

---

## 🔧 常見問題

### Q1: 推送時出現 "Permission denied"

**解決方案：**
- 檢查 GitHub 使用者名稱是否正確
- 確認 Personal Access Token 有 `repo` 權限
- 或改用 SSH 方式

---

### Q2: 推送時出現 "remote: Repository not found"

**解決方案：**
- 確認倉庫名稱正確
- 確認使用者名稱正確
- 確認倉庫已在 GitHub 上創建

---

### Q3: 推送時出現 "failed to push some refs"

**解決方案：**
```bash
# 先拉取遠端變更
git pull origin master --allow-unrelated-histories

# 再推送
git push -u origin master
```

---

### Q4: 想要修改遠端倉庫 URL

**解決方案：**
```bash
# 查看當前遠端倉庫
git remote -v

# 修改遠端倉庫 URL
git remote set-url origin https://github.com/YOUR_USERNAME/NEW_REPO_NAME.git
```

---

## 📝 後續維護

### 日常提交流程

```bash
# 1. 查看變更
git status

# 2. 加入變更
git add .

# 3. 提交變更
git commit -m "描述你的變更"

# 4. 推送到 GitHub
git push
```

---

### 建議的 Commit 訊息格式

```
feat: 新增功能
fix: 修復錯誤
docs: 更新文檔
style: 調整樣式
refactor: 重構程式碼
test: 新增測試
chore: 維護性工作
```

**範例：**
```bash
git commit -m "feat: 新增即時同步功能"
git commit -m "fix: 修復市集明細顯示錯誤"
git commit -m "docs: 更新 README 安裝說明"
```

---

## 🎉 推送成功後

### 1. 添加 README Badge

在 `README.md` 頂部添加：

```markdown
# Market Pulse

![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/market-pulse)
![GitHub forks](https://img.shields.io/github/forks/YOUR_USERNAME/market-pulse)
![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/market-pulse)
![GitHub license](https://img.shields.io/github/license/YOUR_USERNAME/market-pulse)
```

---

### 2. 設定 GitHub Pages（可選）

如果想要部署靜態網站：

1. 前往倉庫 Settings → Pages
2. Source 選擇 `main` 或 `master` 分支
3. 點擊 Save
4. 等待部署完成

---

### 3. 啟用 GitHub Actions（可選）

創建 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm install
    - name: Build
      run: npm run build
```

---

## 📚 相關資源

- [GitHub 官方文檔](https://docs.github.com/)
- [Git 教學](https://git-scm.com/book/zh-tw/v2)
- [GitHub Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [SSH Key 設定](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

---

## ✅ 檢查清單

推送前請確認：

- [ ] 已在 GitHub 創建新倉庫
- [ ] 已複製正確的倉庫 URL
- [ ] 已準備好 Personal Access Token（HTTPS）或 SSH Key（SSH）
- [ ] 已執行 `git remote add origin` 指令
- [ ] 已執行 `git push -u origin master` 指令
- [ ] 已在 GitHub 上確認檔案已上傳

---

## 🎯 下一步

推送成功後，你可以：

1. ✅ 邀請協作者
2. ✅ 設定 Issues 和 Projects
3. ✅ 添加 LICENSE 檔案
4. ✅ 設定 GitHub Actions 自動化
5. ✅ 部署到 Vercel 或 Netlify

---

## 💡 提示

**記得替換以下內容：**
- `YOUR_USERNAME`：你的 GitHub 使用者名稱
- `market-pulse`：你的倉庫名稱（如果不同）
- `your-email@example.com`：你的 Email

**安全提醒：**
- ⚠️ 不要將 Personal Access Token 提交到 Git
- ⚠️ 不要將 `.env` 檔案推送到 GitHub
- ⚠️ 確認 `.gitignore` 已正確設定

---

祝你推送順利！🚀
