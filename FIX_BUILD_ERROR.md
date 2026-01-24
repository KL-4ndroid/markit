# 🔧 Next.js 建置錯誤修復指南

## 問題描述

```
Error: Cannot find module 'E:\market2\.next\server\middleware-manifest.json'
```

這是 `.next` 資料夾損壞導致的問題。

## 🛠️ 修復步驟

### 方法 1：使用修復腳本（推薦）

1. **開啟新的命令提示字元（CMD）**
   - 按 `Win + R`
   - 輸入 `cmd`
   - 按 Enter

2. **執行修復腳本**
   ```cmd
   cd E:\market2
   fix-and-start.bat
   ```

3. **等待完成**
   - 腳本會自動停止 Node 進程
   - 刪除 `.next` 資料夾
   - 清理快取
   - 重新安裝依賴
   - 啟動開發伺服器

### 方法 2：手動修復

如果腳本無法執行，請手動執行以下步驟：

#### 步驟 1：停止所有 Node 進程

開啟**工作管理員**（Ctrl + Shift + Esc）：
1. 切換到「詳細資料」標籤
2. 找到所有 `node.exe` 進程
3. 右鍵點擊 → 結束工作
4. 確認所有 Node 進程都已停止

#### 步驟 2：刪除 .next 資料夾

開啟**檔案總管**：
1. 導航到 `E:\market2`
2. 找到 `.next` 資料夾
3. 右鍵點擊 → 刪除
4. 如果無法刪除，重新啟動電腦後再試

#### 步驟 3：清理並重新安裝

開啟**命令提示字元**（以系統管理員身分執行）：

```cmd
cd E:\market2

# 清理 npm 快取
npm cache clean --force

# 刪除 node_modules（可選，如果問題持續）
# rmdir /s /q node_modules

# 重新安裝依賴（如果刪除了 node_modules）
# npm install

# 啟動開發伺服器
npm run dev
```

#### 步驟 4：驗證

開啟瀏覽器訪問：
```
http://localhost:3000
```

如果 3000 埠被佔用，會自動使用 3001：
```
http://localhost:3001
```

## 🔍 常見問題

### Q1: 無法刪除 .next 資料夾

**原因：** 檔案被 Node 進程鎖定

**解決方法：**
1. 確認所有 Node 進程都已停止
2. 關閉 VS Code / Cursor
3. 重新啟動電腦
4. 再次嘗試刪除

### Q2: 刪除後仍然出現錯誤

**解決方法：**
```cmd
# 完全清理並重新安裝
cd E:\market2
rmdir /s /q .next
rmdir /s /q node_modules
npm cache clean --force
npm install
npm run dev
```

### Q3: 埠被佔用

**解決方法：**
```cmd
# 查看佔用 3000 埠的進程
netstat -ano | findstr :3000

# 結束該進程（替換 PID）
taskkill /F /PID <PID>
```

### Q4: 權限錯誤

**解決方法：**
- 以**系統管理員身分**執行命令提示字元
- 右鍵點擊「命令提示字元」→「以系統管理員身分執行」

## ✅ 驗證修復成功

修復成功後，您應該看到：

```
✓ Ready in X.Xs
○ Compiling / ...
✓ Compiled / in X.Xs
```

然後可以在瀏覽器中正常訪問應用程式。

## 🚀 快速啟動（修復後）

修復完成後，每次啟動只需：

```cmd
cd E:\market2
npm run dev
```

## 📝 預防措施

為避免此問題再次發生：

1. **正常關閉開發伺服器**
   - 使用 `Ctrl + C` 停止
   - 不要直接關閉終端視窗

2. **定期清理**
   ```cmd
   npm cache clean --force
   ```

3. **遇到問題時**
   - 先停止開發伺服器
   - 刪除 `.next` 資料夾
   - 重新啟動

## 🆘 仍然無法解決？

如果以上方法都無法解決，請嘗試：

### 完全重置專案

```cmd
cd E:\market2

# 備份重要檔案（如果有自訂內容）
# 刪除所有建置產物
rmdir /s /q .next
rmdir /s /q node_modules

# 重新安裝
npm install

# 啟動
npm run dev
```

### 檢查系統環境

1. **Node.js 版本**
   ```cmd
   node --version
   ```
   應該是 v18 或更高版本

2. **npm 版本**
   ```cmd
   npm --version
   ```
   應該是 v9 或更高版本

3. **磁碟空間**
   - 確保 E: 磁碟有足夠空間（至少 1GB）

## 📞 需要協助

如果問題持續存在，請提供以下資訊：

1. 錯誤訊息的完整內容
2. Node.js 版本（`node --version`）
3. npm 版本（`npm --version`）
4. 作業系統版本
5. 已嘗試的修復步驟

---

**最後更新：** 2026-01-21  
**適用版本：** Next.js 14.2.35  
**專案：** Market Pulse
