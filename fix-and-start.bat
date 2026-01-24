@echo off
echo 正在修復 Next.js 建置問題...
echo.

echo 步驟 1: 停止所有 Node 進程
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo 步驟 2: 刪除 .next 資料夾
if exist .next (
    rmdir /s /q .next
    echo .next 資料夾已刪除
) else (
    echo .next 資料夾不存在
)

echo 步驟 3: 清理 npm 快取
call npm cache clean --force

echo 步驟 4: 重新安裝依賴
call npm install

echo 步驟 5: 啟動開發伺服器
echo.
echo 修復完成！正在啟動開發伺服器...
echo.
call npm run dev
