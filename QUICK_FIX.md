# 🚨 緊急修復：Next.js 建置錯誤

## 問題

開發伺服器顯示錯誤：
```
Error: Cannot find module 'E:\market2\.next\server\middleware-manifest.json'
```

## 🔧 快速修復（3 步驟）

### 步驟 1：停止開發伺服器

在 Cursor 終端中按 `Ctrl + C` 停止開發伺服器

### 步驟 2：執行修復腳本

**選項 A：使用 PowerShell（推薦）**

在 Cursor 中開啟新終端，執行：

```powershell
cd E:\market2
.\fix-build.ps1
```

**選項 B：手動修復**

如果腳本無法執行，請手動執行：

```powershell
# 停止所有 Node 進程
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 等待 2 秒
Start-Sleep -Seconds 2

# 刪除 .next 資料夾
Remove-Item -Path ".next" -Recurse -Force

# 清理快取
npm cache clean --force

# 啟動開發伺服器
npm run dev
```

### 步驟 3：驗證

開啟瀏覽器訪問：
- http://localhost:3000 或
- http://localhost:3001

應該可以正常看到應用程式！

## 📋 詳細說明

請參考 `FIX_BUILD_ERROR.md` 獲取完整的修復指南。

---

**快速提示：** 如果問題持續，請重新啟動電腦後再試。
