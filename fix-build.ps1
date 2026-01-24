# Next.js 建置錯誤修復腳本
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next.js 建置錯誤修復工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 步驟 1: 停止 Node 進程
Write-Host "[1/4] 停止所有 Node 進程..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "      完成!" -ForegroundColor Green
Write-Host ""

# 步驟 2: 刪除 .next 資料夾
Write-Host "[2/4] 刪除 .next 資料夾..." -ForegroundColor Yellow
if (Test-Path ".next") {
    try {
        Remove-Item -Path ".next" -Recurse -Force -ErrorAction Stop
        Write-Host "      .next 資料夾已刪除" -ForegroundColor Green
    } catch {
        Write-Host "      警告: 無法完全刪除 .next 資料夾" -ForegroundColor Red
        Write-Host "      請手動刪除後重新執行此腳本" -ForegroundColor Red
        Write-Host ""
        Write-Host "按任意鍵退出..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
} else {
    Write-Host "      .next 資料夾不存在" -ForegroundColor Gray
}
Write-Host ""

# 步驟 3: 清理 npm 快取
Write-Host "[3/4] 清理 npm 快取..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
Write-Host "      完成!" -ForegroundColor Green
Write-Host ""

# 步驟 4: 啟動開發伺服器
Write-Host "[4/4] 啟動開發伺服器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  修復完成！正在啟動..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

npm run dev
