# ChatGPT core data safety fix branch

此分支由 ChatGPT 建立，用於區分原始 `master` 與 ChatGPT 修正版。

修復依據：`deep-research-report-markit.md` 的核心資料安全重構建議。

目前分支：`chatgpt/core-data-safety-fix`

## 修正目標

- 讓事件資料更接近 immutable event log。
- 收斂 `recordEvent()` 的 payload 驗證與正規化流程。
- 防止商品成交時靜默超賣。
- 讓每日統計補上 `productsSold` 累計。
- 移除 handler 回寫 events 的高風險模式。

## 後續建議

此分支可作為 ChatGPT 修正版的保存點。若要合併回主線，建議先在本機執行：

```bash
npm install
npm run build
```

若 build 有舊程式碼型別錯誤，建議依報告逐步補上 `lib/db/eventTypes.ts`、`lib/db/integrity.ts` 與 DB regression tests。
