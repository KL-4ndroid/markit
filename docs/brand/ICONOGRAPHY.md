# 出攤本 BoothBook — 圖示系統（Iconography）

> 文件版本：2026-06-17
> 對應設計框架：`docs/brand/VI_DESIGN_SYSTEM.md`（2026-06-16）

## 規則

**禁用 Emoji 圖示。** 一律使用 [`lucide-react`](https://lucide.dev/) 的 SVG icon。

理由：

1. **跨平台一致性**：emoji 在 iOS / Android / Windows 渲染差異極大
2. **設計語言統一**：emoji 帶有「聊天文化」的味道，與日系美學衝突
3. **可縮放**：Lucide icon 是向量圖，視網膜螢幕清晰
4. **可控樣式**：可透過 `className` 改 size / color / stroke

例外：

- **emoji 列表本身**（例如「圖示挑選對照表」本文件）允許保留作為對照說明
- **iOS / Android 系統字體本身**無法禁用 emoji，但 UI 上不主動使用

---

## 常用 Icon 對照表

| 場景 | Lucide 元件 | 範例用途 |
|---|---|---|
| 市集 | `Store` / `Tent` | 首頁、市集頁 header 裝飾 |
| 商品 | `Package` | 商品頁、商品管理 |
| 手作 | `Hand` | ProductCard — handmade |
| 食品 | `Cookie` | ProductCard — food |
| 飾品 | `Gem` | ProductCard — accessory |
| 服飾 | `Shirt` | ProductCard — clothing |
| 藝術品 | `Palette` | ProductCard — art |
| 文具 | `BookOpen` | ProductCard — stationery |
| 其他 | `MoreHorizontal` | ProductCard — other |
| 現金 | `Banknote` | 支付方式 |
| 電子支付 | `Smartphone` | 支付方式 |
| 轉帳 | `Landmark` | 支付方式 |
| 信用卡 / 其他 | `CreditCard` / `Wallet` | 支付方式 |
| 同步 | `RefreshCw` / `RefreshCcw` | SyncStatusIndicator、重新整理 |
| 趨勢上升 | `TrendingUp` | Analytics 報表 |
| 趨勢下降 | `TrendingDown` | Analytics 報表 |
| 持平 | `Minus` | Analytics 報表 |
| 提示 | `Lightbulb` | 教學卡片、MetricGuide |
| 警告 | `AlertTriangle` | 危險操作、確認對話框 |
| 成功 / 慶祝 | `CheckCircle2` / `Sparkles` | 成交成功動畫 |
| 數據 | `BarChart3` / `PieChart` | Analytics 頁 |
| 目標 | `Target` | 成交次數、轉換率 |
| 收入 | `CircleDollarSign` / `DollarSign` | 收入指標 |
| 設定 | `Settings` | Settings 頁 |
| 用戶 | `User` | 個人資料 |
| 員工 | `Shield` | 員工模式標籤 |
| 編輯 | `Edit` / `Edit3` | 編輯按鈕 |
| 刪除 | `Trash2` | 刪除記錄 |
| 資料庫 | `Database` | 資料管理 |
| 雲端 | `Cloud` | 雲端同步 |
| 硬碟 | `HardDrive` | 本地資料 |
| 加入 | `Plus` | 新增按鈕 |
| 箭頭 | `ArrowRight` / `ArrowLeft` / `ArrowDown` | 導覽 |
| 時鐘 | `Clock` | 營業時間、倒數 |
| 日曆 | `Calendar` | 市集日期 |
| 地點 | `MapPin` | 市集地點 |
| 搜尋 | `Search` | 搜尋輸入框 |
| 退出 | `LogOut` | 登出、離開團隊 |
| 鎖定 | `Lock` / `Shield` | 權限 |
| 眼睛 | `Eye` | 檢視、查看 |
| 表格 | `Table` | 設備租賃 — 桌子 |
| 椅子 | `Armchair` | 設備租賃 — 椅子 |
| 傘 | `Umbrella` | 設備租賃 — 傘架 |
| 門 | `DoorOpen` | 提前進場 |
| 報到 | `ClipboardCheck` | 報到時間 |
| 商店 | `Store` | 營業中 |

---

## 尺寸規範

| 用途 | className | 像素 |
|---|---|---|
| 內嵌小圖示（與文字並列） | `w-4 h-4` | 16px |
| 按鈕內圖示 | `w-5 h-5` | 20px |
| Header 裝飾圖示 | `w-6 h-6` | 24px |
| 卡片封面圖示 | `w-12 h-12` | 48px |
| 大型插畫 | `w-16 h-16` 或 `w-20 h-20` | 64-80px |

## 顏色規範

- **內嵌於文字旁**：`text-foreground` / `text-muted-foreground`
- **強調語意**：`text-primary` / `text-secondary` / `text-danger`
- **裝飾背景色塊**：`bg-soft-pink` / `bg-soft-green` / `bg-soft-yellow` / `bg-primary/10` / `bg-secondary/10`
- **絕不寫 hex**（`stroke-[#6F8F86]`）—— 一律用 token

## 套用範例

```tsx
import { Store, AlertTriangle, TrendingUp } from 'lucide-react';

// ✅ 正確：header 標題旁
<div className="flex items-center gap-2">
  <Store className="w-6 h-6 text-white" />
  <h1 className="text-2xl font-medium">我的市集</h1>
</div>

// ✅ 正確：警告提示
<div className="flex items-start gap-2">
  <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
  <span>此操作無法復原</span>
</div>

// ✅ 正確：空狀態插畫
<div className="w-16 h-16 bg-soft-pink rounded-full flex items-center justify-center">
  <Package className="w-8 h-8 text-primary" />
</div>

// ❌ 錯誤：emoji
<h1>我的市集 🎪</h1>

// ❌ 錯誤：硬編碼色
<Store className="w-6 h-6 text-[#6F8F86]" />
```

## 維護指南

### 新增 Icon

1. 確認 Lucide 已有對應 icon：https://lucide.dev/icons
2. 從 `lucide-react` import 使用
3. 若該 icon 對應特定業務場景（例如市集類型），加進本文件對照表

### 取代既有 emoji

1. 在本文件對照表找對應 Lucide icon
2. 替換 `.tsx` 內的 emoji 字串
3. 重新跑 `npm run build` 確認無誤
4. 用 browser 截圖驗證視覺

### 移除 dead code

若發現 `.tsx` 內某 emoji 在多處出現但無對照 icon（例如罕用字元），先在團隊頻道確認是否真的不需要，再決定移除或新增。
