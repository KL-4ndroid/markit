# PWA 圖示手動生成指南

如果您無法使用自動化腳本，可以按照以下步驟手動生成 PWA 圖示。

## 方法一：使用線上工具（推薦）

### 1. PWA Asset Generator
🔗 https://www.pwabuilder.com/imageGenerator

**步驟：**
1. 上傳您的 `logo.png`
2. 選擇 "Generate"
3. 下載生成的圖示包
4. 解壓縮並將所有圖示放到 `public/icons/` 資料夾

### 2. RealFaviconGenerator
🔗 https://realfavicongenerator.net/

**步驟：**
1. 上傳您的 `logo.png`
2. 調整各平台的顯示效果
3. 生成並下載圖示包
4. 將檔案放到對應位置

---

## 方法二：使用圖片編輯軟體

### 需要生成的尺寸：

| 檔案名稱 | 尺寸 | 用途 |
|---------|------|------|
| `icon-72x72.png` | 72×72 | PWA 小圖示 |
| `icon-96x96.png` | 96×96 | PWA 圖示 |
| `icon-128x128.png` | 128×128 | PWA 圖示 |
| `icon-144x144.png` | 144×144 | PWA 圖示 |
| `icon-152x152.png` | 152×152 | PWA 圖示 |
| `icon-192x192.png` | 192×192 | PWA 標準圖示 |
| `icon-384x384.png` | 384×384 | PWA 大圖示 |
| `icon-512x512.png` | 512×512 | PWA 啟動畫面 |
| `apple-touch-icon.png` | 180×180 | iOS 主畫面圖示 |
| `favicon.ico` | 32×32 | 瀏覽器圖示 |

### 使用 Photoshop / GIMP：

1. 開啟您的 `logo.png`
2. 對每個尺寸：
   - 圖片 → 影像尺寸
   - 設定寬度和高度（保持比例）
   - 匯出為 PNG
   - 儲存到 `public/icons/` 資料夾

### 使用 Figma / Canva：

1. 建立新專案
2. 匯入您的 logo
3. 為每個尺寸建立畫框
4. 匯出為 PNG
5. 重新命名並放到 `public/icons/`

---

## 方法三：使用命令列工具

### ImageMagick（Windows/Mac/Linux）

安裝 ImageMagick 後，在專案根目錄執行：

```bash
# 建立 icons 資料夾
mkdir public\icons

# 生成各種尺寸
magick logo.png -resize 72x72 public\icons\icon-72x72.png
magick logo.png -resize 96x96 public\icons\icon-96x96.png
magick logo.png -resize 128x128 public\icons\icon-128x128.png
magick logo.png -resize 144x144 public\icons\icon-144x144.png
magick logo.png -resize 152x152 public\icons\icon-152x152.png
magick logo.png -resize 192x192 public\icons\icon-192x192.png
magick logo.png -resize 384x384 public\icons\icon-384x384.png
magick logo.png -resize 512x512 public\icons\icon-512x512.png
magick logo.png -resize 180x180 public\apple-touch-icon.png
magick logo.png -resize 32x32 public\favicon.ico
```

---

## 檢查清單

完成後，確認以下檔案都已建立：

```
public/
├── icons/
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
├── apple-touch-icon.png
└── favicon.ico
```

---

## 圖示設計建議

✅ **推薦做法：**
- 使用簡潔的圖示設計
- 確保在小尺寸下仍清晰可辨
- 使用透明背景（PNG）
- 主要元素置中
- 避免過多細節

❌ **避免：**
- 過於複雜的設計
- 細小的文字
- 低對比度的顏色
- 邊緣過於接近圖示邊界

---

## 需要協助？

如果您在生成圖示時遇到問題，可以：

1. 提供您的 logo.png，我可以幫您生成
2. 使用線上工具（最簡單）
3. 暫時使用純色圖示（開發階段）

**臨時方案：** 如果您想先測試 PWA 功能，可以暫時使用純色方塊作為圖示，之後再替換。
