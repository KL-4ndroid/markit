# 可選開攤／收攤現金紀錄：UX-NEXT-03A

日期：2026-10-23。狀態：使用者確認完成內建自檢的 migration 078，雲端唯讀欄位檢查通過；本機入口已啟用，真實測試 owner 的保存、草稿、離線重連、獨立來源還原與版本衝突已驗收。其他部署仍預設關閉；未宣稱真正第二台裝置、正式部署或原生實機驗收。

## 本切片交付

- 在原市集「現場」提供收合的「開／收攤現金（選填）」；回顧頁選「現金紀錄」才直接展開並讀雲端，不插入強制開攤／收攤彈窗。2026-10-25 將記錄／修改移到日期下方，編輯中的比較與其他進出改為選用展開；見 [手機整合驗收](MOBILE_MARKET_FLOW_REVIEW_2026_10_25.md)。
- 每個 market + 營業日期保存一份紀錄，開攤／收攤各自選「不記錄」（預設）、「直接填總額」、「依面額計算」。沒有操作不建立盤點；有輸入的 0 與未記錄不同。
- 同日不同市集、多日不連續日期獨立；預設日期參照既有 operating session 的 sessionDate，跨午夜仍沿原營業日。可補寫過去營業日，不以裝置當下日期自動搬移。
- 詳細面額包含 1000／500／100／50／10／5／1；數量為非負整數，空欄不算明確盤點，至少輸入一個數量才可送出。全空不推算零元；明確輸入 0 可保存。
- 總額最多 9 位整數、2 位小數；每個面額數量最多 999999，總額上限 NT$999,999,999.99。這是資料合理性與安全運算上限，不是訂閱額度。共用層以整數「分」計算，避免小數浮點加總誤差。
- 詳細切總額可帶入合計；總額切詳細不虛構張數。未使用的輸入方式保留在本機草稿 buffer，可切回取用；送雲端只保存目前選擇的方式，不把兩種輸入相加。選不記錄並儲存會明確清除該時點原數字。
- 開攤／收攤可各自先記一邊；只有兩邊都有數字才顯示現金增減。說明這不是營收、淨利或已對帳證明；不產生成交／庫存／成本事件。
- 不自動沿用昨日金額；有前一筆營業日收攤紀錄時，提供標有實際來源日期／金額的主動帶入按鈕。
- 可填最多 1000 字盤點備註，提示先於提領／存款盤點、跨場共用現金盒需自行區分範圍。

## 存取、草稿與同步

- 財務紀錄只供原品牌 owner；不擴大 manager／operator／viewer 的財務權限，不變更付費方案。UI 要求認證角色可掛載，背景角色刷新時保留編輯、暫停寫入；server 每次重驗原 market owner 及未刪除狀態。
- `market_cash_records` 是獨立表，主鍵 `(market_id,business_date)`；不放在員工可讀的 markets／events／staff view。Client 只取得 owner RLS SELECT 與專用 writer EXECUTE；直接 table mutations、匿名及內部 helper／trigger EXECUTE 明確撤權。
- writer 採 market row lock、revision 與 mutation ID。同一最新 mutation 的相同內容重試不增版；其他裝置先保存則衝突，舊輸入不覆寫新版本。使用明確非 transient 錯誤，不以 SQLSTATE 40001 觸發傳輸重試。
- Dexie version 10 增加 owner／market 隔離的同步副本與草稿。每次輸入寫本機草稿，可保存尚未填完或無效的輸入；有效性檢查通過且明確按「儲存到雲端」才送出。不因自動同步、重連或關閉收攤替使用者送出。
- 本機草稿使用 mutation CAS；另一分頁不能靜默覆寫。雲端讀取不蓋草稿，較舊雲端回應不覆蓋較新副本。舊請求遇換帳號／cache reset epoch 改變，不再回填。
- 離線、儲存失敗或 12 秒請求逾時保留草稿。版本衝突可讀取雲端開／收攤數字與備註，人工整合後按「已核對，保留目前輸入整合」更新版本基準，再儲存。
- 草稿計入 `local_pending_market_cash`，阻擋無聲登出／換帳號清除。設定頁「尚未送出的現金草稿」提供回原市集或明確捨棄，即使原市集被別台裝置刪除亦可處理。強制登出對話列明現金草稿數量。
- 舊財務／備份匯出不包含本次獨立現金紀錄，不能當作現金草稿已保全；帳號刪除 preflight 要先保存或明確捨棄草稿。雲端已保存紀錄隨既有 auth user／market FK 刪除流程清除。
- 排程保護納入雲端現金紀錄與本機草稿，防止未來排程改版／移除覆蓋已有盤點的快照；更正場次日期後，既有日期紀錄可繼續修正，不能悄悄改掛別天。
- NetworkPort、共用 JS timeout／abort、Dexie 與共用 TypeScript 合約可供 Web／iOS／Android 沿用；沒有新增裝置 API、原生套件、BFF 同源假設、pending-operation drain 或背景執行假設。

## 主要檔案

| 責任 | 檔案 |
| --- | --- |
| 金額／面額、草稿／紀錄模型、驗證與差額語意 | `lib/markets/market-cash.ts` |
| 共用營業日列舉 | `lib/markets/market-business-dates.ts` |
| 草稿 CAS、持久副本、身分／epoch、離線及 reader／writer port | `lib/markets/market-cash-repository.ts`、`market-cash-scope.ts` |
| Supabase RPC 與分頁 reader、受限請求 | `lib/supabase/market-cash.ts` |
| 手機／桌面輸入與雲端版本整合 | `components/markets/MarketCashPanel.tsx`、`MarketDetailScreen.tsx` |
| 無法讀取原市集的草稿處理、登出提示 | `components/settings/CashDraftList.tsx`、`AccountSyncPanel.tsx`、`components/auth/AuthCacheBlockedDialog.tsx`、`lib/auth/*` |
| Schema／清除／登出／帳號刪除與排程保護 | `lib/db/index.ts`、`lib/db/clear-user-data.ts`、`lib/sync/local-pending-write-report.ts`、`lib/subscription/account-deletion-preflight.ts`、`lib/recurring-operations/*` |
| 雲端結構、權限、writer、排程 trigger 與內建自檢 | `supabase/migrations/078_add_optional_market_cash_records.sql` |
| 純規則／Dexie／權限測試，隔離 PostgreSQL 與雲端唯讀欄位 probe | `tests/market-cash.test.ts`、`scripts/verify-market-cash-sql.mjs`、`scripts/check-market-cash-cloud.mjs` |

## 驗證與發布狀態

- 已通過：共用／fake IndexedDB 實測，涵蓋未記錄／零元、金額精度、面額／非法數量、不連續日期、草稿重開、離線不寫雲端、回條遺失重試、衝突、換帳號拒絕、cache reset、帳號刪除阻擋與營收不變。
- 已通過：16 組隔離 PostgreSQL 檢查，包含 Supabase 風格預設授權、重跑遷移、client grants、RLS、跨 owner／員工拒絕、日別／場次隔離、歷史日期保存、零元／none、無效輸入、冪等、版本衝突與排程保護。隔離測試不取代正式專案 triggers／RLS 實際驗收。
- TypeScript／受影響 TS／TSX lint 已通過；35 個相關回歸測試檔通過，涵蓋現金、草稿清除保護、原心得／模板、帳號刪除及固定營業。啟用後 Web／手機建置通過，手機靜態產物 **366 檔、19.59 MiB**，邊界／資產檢查通過。
- 使用者回覆「078 已完成」後，雲端唯讀欄位 probe 為 HTTP 200，本機 `.env.local` 已設 `NEXT_PUBLIC_MARKET_CASH_ENABLED=true`；`.env.example` 仍預設 false。沒有變更正式部署設定。
- 真實 owner UI 使用隔離測試場次 `[驗收1023-T] 準備模板測試`（`8a9469ba-2c60-4d9f-801b-7c200fbbfb59`）。僅此測試場次由 10/24 延長至 10/24–25，以驗收逐日隔離；未修改營運場次。
- 未填兩邊時拒絕建立空盤點；明確開攤 0 可保存且收攤仍顯示未記錄。負面額數量拒絕送出。7 種面額合計 NT$2,000、收攤總額 NT$5,450，現金增加 NT$3,450；切換輸入方式與重新載入頁面後，草稿數量／金額／中文備註均保留。
- 以瀏覽器網路模擬觸發離線 port，手動保存被阻擋且雲端版本未變；恢復連線後再次手動保存成功，沒有自動送出。另一獨立儲存來源（localhost／127.0.0.1）可從雲端還原；這不等同真正第二台裝置驗收。
- 兩個來源同時編輯時，舊版本保存遭拒，UI 顯示雲端數字與備註、保留本機草稿。人工整合並明確確認後保存成功。10/24 為第 4 版；10/25 首次仍預設不記錄，只有點選帶入才使用前日收攤 NT$5,450，第 1 版保留收攤未記錄。獨立唯讀檢查確認兩日分開，該場收入／利潤／成交數均維持 0。
- 設定頁實際列出一份驗收用未送出草稿；登出先顯示現金草稿數量，取消後仍保留。透過設定頁明確捨棄該測試草稿後清單消失，雲端紀錄不變；兩個驗收來源沒有留下現金草稿。
- 實際 DOM 寬度 360／391（約 390）／430px 及 1440px 桌面均無橫向溢出，現金輸入字級 16px；已檢視手機面額編輯與保存摘要。當其他來源的市集日期副本尚未更新時，額外雲端日期標為「日期待確認」，不逕稱歷史紀錄。截圖保存在忽略目錄 `.codex-artifacts/cash-ui/`。
- 真正第二台裝置、staff 實際 UI、原生鍵盤／實機及正式部署另驗；跨 owner／staff 權限拒絕已有隔離 SQL 驗證。本輪未 commit／push。

啟用：在同專案完整執行 migration 078（內建結構／權限自我驗證），成功後執行唯讀 probe，再開 `NEXT_PUBLIC_MARKET_CASH_ENABLED=true`。其他部署分別管理開關。暫停新功能時保留雲端資料；本機未送出草稿仍可在設定頁明確處理，不做破壞性遷移回滾。

## 緊接的 03B 範圍

本切片 03A 提供兩次實盤與現金增減。後續 [03B 現金銷售比較與差額](MARKET_CASH_COMPARISON_2026_10_23.md) 已完成 079、本機啟用與真實 owner 雲端來源、保存／還原、補登／撤回重算及衝突驗收（2026-10-24）；其他部署比較旗標關閉時仍只顯示 03A。03B 包含有效現金銷售、可選進出、預期／差額、資料完整度及比較基準失效提示，沒有無條件「已對平」或完整帳務核對完成狀態；不因盤點自行調整成交與營收。
