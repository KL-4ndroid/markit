# UX-NEXT-05B 縣市分析與舊場補填

日期：2026-10-24（Asia/Taipei）

狀態：來源實作、共用邏輯測試、21 組隔離 SQL、Web／手機靜態建置通過。使用者已確認完整執行 080，已確認雲端 schema 並啟用本機補填；真實 Free owner 手機確認、雲端保存、獨立 origin 還原、同批冪等重送與過期預覽拒絕通過。付費帳號完整分析畫面、正式部署、真正第二裝置與原生實機仍待驗收。

## 功能與統計口徑

- 分析頁增加「縣市」頁籤，以日曆起訖日篩選有效成交；沿用 `analytics.advanced`／`advancedAnalytics` 權限，不改方案、價格或付款流程。Free 的最近三場預覽不能繞過縣市 gate；員工無財務分析入口。
- `lib/analytics/region-analytics.ts` 為平台中立的純模型。按原市集 owner 與非刪除狀態篩選，成交撤回按原場次與事件 ID 去重排除；取消場次仍有有效成交時，保留收入並分列狀態。
- 場次以期間內市集快照或有效成交確認；同場跨日算一場，同日兩場算兩個場次日。僅有有效成交日期才列「有成交紀錄場次／場次日」；不臆測零成交日是否實際出攤。日平均的分母與分子使用同一組有效紀錄。
- 收入按成交日切分，跨月場次不以整場總額灌入單月。不含開攤／收攤盤點、現金進出或對帳差額；缺日期／金額未當作零。晚於今天的成交暫不列入。
- 商品來自有效商品明細，金額補登不猜品項。整單折扣按商品原價權重以整數分配分位差，免費商品保持零元；缺商品識別明確標示。顯示商品收入覆蓋度與低樣本提醒，不提供縣市淨利排行。
- 未分類永遠列示，其金額保留在總額；顯示場次分類覆蓋與已分類收入占比。更正市集縣市會按目前快照重新歸類，不重建或複製成交。
- 來源為本機成交快取，顯示未同步、無日期、無效金額、未來日期及整場投影不一致等提示；不把已載入片段當成雲端完整歷史。沒有新增 server analytics-compute route。

## 舊場補填流程

「更多 → 市集縣市整理」，或付費分析的「整理未分類縣市」，開啟 `/markets/regions`。老闆可讀自己的雲端未分類場次，搜尋、勾選並指定個別／共同縣市，最多每批 20 場，預覽原地點、日期與「未分類 → 指定縣市」後才確認。

清單從雲端以 UUID 分頁讀取，最多 2,000 場，超限明確停止而不默默截斷。多筆補填須連線；選擇不建立離線佇列或持久草稿。已有縣市的更正仍回原市集編輯。保留自由地點，完全沒有地址推測或自動補填。

`supabase/migrations/080_add_owner_region_backfill.sql` 新增 owner-only `backfill_market_regions` RPC：

1. 重新確認登入者為 owner，且不是員工身分；原市集不得已刪除。僅 authenticated 可執行，匿名、PUBLIC 與 service_role 不取得 EXECUTE。
2. 驗證 1～20 筆唯一 UUID、已知縣市代碼與預覽時的 `updated_at`，按 UUID 鎖定資料。任何一場已分類、被修改或越權，整批在寫事件前中止。
3. 經現行 `market_updated` 事件／投影更新分類，不修改收入、庫存、日期或自由地點。固定安排的單場補填設單場覆寫，不更改場地預設或其他快照。
4. batch ID 產生確定事件 ID；相同批次重送只回傳結果，不重複事件。同 ID 改內容、部分既有事件或過期預覽拒絕；已完成後另有正常修改，重送也不抹除新修改。
5. client 送出前檢查選取場次未同步事件，結果僅修補同 owner、無待同步且不比雲端新的本機分類。帳號清除／切換使非同步工作失效；未新增直接 table mutation 或自動重試。

## 實作導航

| 檔案 | 責任 |
| --- | --- |
| `lib/analytics/region-analytics.ts` | 共用期間、撤回、分類、商品分配與覆蓋計算 |
| `components/analytics/RegionAnalyticsPanel.tsx` | 日曆期間、摘要、縣市卡片、商品／場次明細及資料提示 |
| `app/analytics/page.tsx`、`lib/analytics/subscription-view.ts` | owner 與既有進階分析 gate；阻擋時不掛載新查詢 |
| `app/markets/regions/page.tsx`、`lib/settings/settings-navigation.ts` | owner 整理入口、勾選、預覽、明確確認 |
| `lib/markets/market-region-backfill.ts` | 平台共用驗證、啟用旗標、請求作用域失效 |
| `lib/supabase/market-region-backfill.ts` | 有界雲端請求、身分確認、同步保護、RPC 及局部快取修補 |
| `supabase/migrations/080_add_owner_region_backfill.sql` | 雲端原子補填、冪等、版本與權限自檢 |
| `tests/region-analytics.test.ts` | 期間／撤回／狀態／商品／覆蓋／重分類／Free gate 與預覽驗證 |
| `tests/fixtures/market-region-backfill-sql.mjs` | 實際投影、原子／冪等／衝突／固定安排／身分隔離 SQL |
| `tests/market-journal-routing.test.ts`、`next.config.mjs` | 保留靜態 regions 路由，避免 legacy ID 轉址誤攔 |

## 啟用前的驗證與限制（歷史快照）

- 共用 region 測試、設定導航、原分析訂閱／Free 預覽回歸、帳號快取清除／破壞保護通過；TypeScript mobile project 與受影響 ESLint 通過。
- `node scripts/verify-market-region-sql.mjs --with-backfill`：21 組通過，包括既有 074 的 14 組及新批次的 7 組。僅使用隔離 PGlite，沒有對雲端營運資料寫入。
- Web build、mobile build 與 `verify:mobile` 通過（378 檔案）；修正實測發現的 legacy 路由誤攔後，補路由回歸及 Web 重建。
- 真實 Free 測試帳號在手機選擇「縣市」得到 Pro 提示，沒有繞過權益。雲端清單讀到 28 場未分類；僅搜尋 `[驗收1023-T] 準備模板測試` 並預覽臺南市，確認按鈕維持停用，未修改任何場次。
- 補填預覽檢查 CSS 寬度 360／391／430／1440，文件寬度未超出視窗。瀏覽器截圖 API 持續回傳無法擷取，因此本次沒有可交付的視覺截圖；DOM 與實際操作結果已確認，不能據此宣稱完整視覺 QA。
- 付費分析目前由純模型及 gate 測試驗證；真實 Pro／Team owner 完整操作仍待有合法權益的測試帳號，不自行修改帳號方案。

## 啟用順序（本機已完成；其他部署需獨立確認）

1. 同一 Supabase 專案先有已通過的 074；由使用者完整執行 080，檔案內建結構／權限檢查。執行本身不批次修改舊市集。
2. 080 成功後先做 schema 唯讀檢查，再將本機 `NEXT_PUBLIC_MARKET_REGION_BACKFILL_ENABLED=true`，重新啟動／建置 client。
3. 用隔離場次驗證確認、雲端還原、衝突與重送。正式部署另行驗收，原生實機 gate 不因靜態建置通過而開啟。
4. 回退只需關閉補填旗標；已保存縣市仍可讀。不要刪 074 欄位、歷史分類或已寫入的事件。

心得日期區間篩選、真正第二裝置、manager 模板實際登入與原生／正式發布驗收仍屬後續事項，未因本切片完成而結案。

## 080 完成後的真實操作複驗（2026-10-24）

使用者回覆「080 已完成」後，以測試 owner 的有效認證讀取雲端 schema，確認 `backfill_market_regions` 與參數可用。Supabase 的 OpenAPI 根目錄額外要求 server API key，因此只在獨立 Node 驗證程序的 schema 讀取使用本機 server key；保留測試 owner JWT，未送到瀏覽器，也未授予 client 更大權限。實際 writer 使用普通測試帳號與公開 client key。

本機 `.env.local` 已設 `NEXT_PUBLIC_MARKET_REGION_BACKFILL_ENABLED=true`；`.env.example` 仍為 false。依下列流程驗收，沒有改其他營運場次：

1. 先唯讀保存 `[驗收1023-T] 準備模板測試`（`8a9469ba-2c60-4d9f-801b-7c200fbbfb59`）的完整 market、現金資料與既有更新事件基準。
2. 真實手機尺寸畫面搜尋、選擇臺南市、預覽並按「確認補填到雲端」。畫面顯示送達成功，清單由 28 場未分類變成 27 場，該測試場不再出現。
3. 以獨立 server 程序讀回確認：完整 market 只有 `region_code` 與 `updated_at` 改變；營收 $4,500、成交 2 筆、其餘欄位及所有現金日別 data／revision 完全保留，僅新增一筆 `market_updated`。
4. 使用該已保存批次原有參數，由一般測試 owner 重送：成功回傳相同分類，沒有新增事件或修改 market 時間。再以新 batch ID 帶舊預覽送另一縣市，得到 `REGION_CONFLICT`，事件與市集均不變。未使用 service-role writer。
5. 從 `localhost:3000` 的獨立 origin 進入原場次，顯示「臺南市」與「資料已同步」；原操作頁為 `127.0.0.1:3000`。這是獨立儲存來源驗收，不等於第二實體裝置。
6. 截圖工具本輪已恢復，已實際檢閱成功頁及 390×844 還原頁：無橫向溢出。截圖與只含該場測試結果的 JSON 保存在忽略的 `.codex-artifacts/region-080-*`，未包含認證 token／金鑰。
7. 啟用旗標後重新執行 Web build、mobile build 與 `verify:mobile` 全部通過（378 檔、19.72 MiB），`git diff --check` 通過。本輪沒有新增 runtime 程式改動，沒有重新執行不相關測試或正式部署。

截圖證據（本機驗收產物，未加入 Git）：

- [手機補填成功](../.codex-artifacts/region-080-save-success.png)
- [獨立 origin 還原](../.codex-artifacts/region-080-independent-restore.png)
- [雲端／重送／衝突結果](../.codex-artifacts/region-080-live-result.json)

080 已可於本機使用；付費分析仍維持原 `advancedAnalytics` 權限，本輪沒有賦予測試帳號 Pro／Team、修改收費或進行正式部署。前節「尚未啟用／無截圖」為啟用前的歷史狀態，以本節最新證據為準。
