# B02：096／097 刪帳相容與本機整合

日期：2026-11-20。基線提交：`a714412`。對應 [Windows 執行計畫](IOS_WINDOWS_EXECUTION_PLAN_2026_11_19.md) 的 W02-01、W02-02。這份紀錄統整技術審查、候選、集中驗收及 E01 交接；正式啟用與託管結果分開記錄。

## 差異與處理結論

| 097 差異 | 影響 | 本批處理 |
| --- | --- | --- |
| `markets.registration_conditions jsonb` | 舊 096 的欄位清單與安裝指紋會拒絕新目錄；設備條件本身是一般出攤資料 | 加入精確欄位清單；不改寫、刪除或重建這個欄位。清理仍隨所屬老闆的 markets／events 資料列進行；其他品牌保留。 |
| `project_market_registration_conditions()` 與事件觸發器 | 新增函式／trigger 必須列入存取合約；不能讓凍結帳號繼續投影設備條件 | 核對原始 body、owner、參數、權限、設定及 trigger 形態後，加入相同的凍結身分拒絕；維持 client／service 不可直接呼叫投影函式。 |
| `owner_accessible_markets` 重建 | 097 延伸了欄位，重建時沒有包含 096 額外加的凍結過濾 | 保留 097 的本人範圍與免費版財務遮罩，再加入既有 `visible_row` 凍結保護；不能以單純重蓋指紋放行。 |

範圍是共用資料／伺服器 SQL 與離線工具，沒有新增瀏覽器或裝置能力。原有 iOS／Android port、價格、付費權益與一般設備記錄規則不變。

## 相容候選的安全設計

- 保留既有 096 安裝 SQL；相容候選是另一份獨立審查的更新。先核對已安裝的 096-v2、固定 project、payload、停用控制與無進行中清理；已裝 Preview scope 時拒絕變更，先停止並另行核對。
- 遇到尚未套用 097 的測試庫，只有在完整 096 指紋仍相符時，才於同一交易加入原始 097 與保護修正。已套用 097 的庫則驗證其精確差異。
- 對現行目錄只排除已逐項驗證的三項 097 差異，還原舊 view 定義後，必須能重現原本已安裝的 096 schema hash。其餘新表、欄位、ACL、RLS、default、函式或觸發器變動仍拒絕。
- 安裝後再次核對同一範圍，再更新私人安裝回條及 access／column 清單。回條保留原 096 身分及 097 相容來源，不將原有 payload 冒稱新版。
- 安裝與回滾使用既有安裝鎖、5 秒 lock timeout、60 秒 statement timeout，以及 markets／events 的交易鎖。操作中有並行寫入時可能短暫等待；超時或失敗整筆回滾。
- 相容回滾保留所有設備條件資料，恢復「097 已存在、舊 096 尚不接受該目錄」的停用狀態。它不刪欄位、不還原營運歷史，也不能救回曾被永久刪除的資料。

舊 test_prg 換行相容工具亦修正 PostgreSQL 可重排函式目錄查詢的問題：在 `pg_get_functiondef` 表達式內先限定一般函式／procedure，避免意外對 aggregate 求定義。完整簽章與原始碼 hash 核對繼續保留，不能藉換行修補放行實質差異。

## 產出與本機操作

[離線產生器](../scripts/prepare-account-deletion-registration-compat.ts)產生兩個固定目標各自的安裝、回滾及唯讀 readback，並在 [manifest](subscription/candidate/registration-compatibility-manifest.json)記錄來源、097 與不變的 096 指紋。

```powershell
node --import tsx scripts/prepare-account-deletion-registration-compat.ts --check
node --import tsx scripts/prepare-account-deletion-migration.ts --check
node --import tsx scripts/prepare-account-deletion-candidate.ts --check
```

集中資料庫與流程驗收使用現有兩個工具。097 修正後只重跑其集中範圍，不再重複舊的整套安裝矩陣：

```powershell
node --import tsx scripts/verify-account-deletion-migration.ts --registration-isolated
node --import tsx scripts/verify-account-deletion-upload-race.ts --registration-candidate-isolated
```

前者驗證實際生成的停用版 096 與相容更新。後者沿用既有 local-only engine fixture，套用同一個 097 凍結保護 payload，串起真實本機 GoTrue／PostgREST、Next handler factories 和 S3 HTTP 替身。兩種來源的完整性分別記錄；這不代表已經在託管 Preview 執行安裝回條／授權／清理的完整組合。

## 集中驗收紀錄

**本機完成，託管待驗。** [完整機器證據](subscription/evidence/account-deletion-registration-compatibility-2026-11-20.json)保留案例、目標、來源指紋與證據沿用界線。

| 驗收 | 結果 |
| --- | --- |
| 實際 096 安裝後的 097 相容 | 8 組集中檢查通過：尚無 097 的 test_prg 模型、已存在 097 的 production 模型、未知漂移拒絕、晚段失敗回滾、重跑、唯讀 readback、免費設備／財務遮罩、撤回與資料保留回滾。 |
| Auth／PostgREST／照片與清理 | 27 組通過，含兩條照片入口、回應遺失安全讀回、衝突／未知結果、同一老闆四個物件與十步清理，以及其他品牌設備條件／物件保留。 |
| 管理入口／執行端／新契約 | 19 個測試通過；沒有真實管理 API 請求，範圍／回應與連線失敗使用既有注入 transport。 |
| TypeScript／ESLint | 本批專用 TypeScript 配置通過；新增的 builder、隔離檢查、離線 CLI 與契約測試使用 `eslint --no-ignore` 通過。 |
| 任務／文件／候選 | 任務及人工清單檢查、相關 4 檔測試、三份候選指紋檢查與 diff-check 通過。canonical 仍為 15 complete／11 pending_manual／6 pending_approval／24 blocked_dependency／3 deferred；正式 gate 未解除。 |
| 資源收尾 | 一次性 PostgreSQL／GoTrue／PostgREST 容器及私有網路已移除。原 096 SQL SHA 保持不變；只有舊 manifest 的來源指紋更新。 |

27 組流程通過後，相容 installer 的 trigger 形態檢查與舊 view 的 deparse 正規化又做了收斂。機器證據重建並核對了當時來源 SHA，確認差異只在這兩個 installer 檢查，同一個凍結保護 SQL factory 完全不變；最終 installer／rollback／readback 已重新通過 8 組集中驗證。因此沿用原 27 組流程，不再重跑未改的照片 handler 矩陣。

本批未改正式 App 元件、API handler、原生 adapter 或建置設定；沒有重跑 Web／mobile build，最終應用程式建置依 B06 集中執行。現在只可稱為本機候選完成，尚非託管完整組合或正式刪除已啟用。

| 目標 | 安裝候選 | 回滾候選 | 唯讀驗證 |
| --- | --- | --- | --- |
| production | [安裝](subscription/candidate/097_deletion_compat_production.sql) | [回滾](subscription/candidate/097_deletion_compat_production_rollback.sql) | [readback](subscription/candidate/097_deletion_compat_production_readback.sql) |
| test_prg | [安裝](subscription/candidate/097_deletion_compat_test_prg.sql) | [回滾](subscription/candidate/097_deletion_compat_test_prg_rollback.sql) | [readback](subscription/candidate/097_deletion_compat_test_prg_readback.sql) |

以上為有明確 target／DBA／transport 確認要求的候選，不是本輪要求使用者手動執行的 SQL。實際遠端操作按 E01 接續。

## E01：12 月 1 日後的唯一待辦入口

1. 固定本批提交，從受保護的執行環境唯讀取得 **test_prg `tzhbirwchhqabkxhqjdl`** 的 096 回條、097 是否存在、目前 schema、R2 綁定及 Preview scope 狀態。現有歷史回條不能代替當下核對。正式專案 `fgejncfsvvsayiequubm` 與 test_prg 使用不同 SQL，先讀回確認選擇。
2. 新相容 SQL 只接受既有的固定 Management API 路由與交易確認欄位。屆時沿用受保護的管理連線核對目標，對照本 manifest／SQL hash，再安裝 test_prg 候選；不能只在任意 SQL Editor 設一個 project 字串就聲稱證明目標。這輪沒有新增遠端自動執行入口或下載憑證。
3. 使用對應唯讀 readback，確認回傳一筆正確 project／版本、相容 payload、schema／catalog 及 `runtime_disabled=true`。回應不明先讀回，不盲目重送。若有未審查 drift，停止並保存唯讀差異，不重新蓋章。
4. 再接 [原 Preview 設定與十步操作](subscription/ACCOUNT_DELETION_INTEGRATED_DELIVERY_PLAN_2026_11_02.md#可部署的-test_prg-清理候選)：新建合成老闆、專用 R2 bucket 與短效限桶憑證、兩種照片重送，30 分鐘內的單帳號授權，再核對十步清理、Auth／sessions 與其他帳號保留。卸除測試授權與短效憑證。正式 HTTP 刪帳及全域引擎維持停用。
5. 需要停止時先關閉 Preview 入口與 writer／worker、撤銷 grant／短效憑證。若只有本相容候選且無進行中清理，可以在核對 exact schema 後使用配對 rollback；已裝 Preview scope 或有不明清理結果時，不直接回滾相容層，先核對回條。已刪的資料不可撤回。

本輪沒有使用／修改雲端 SQL、正式營運資料、線上照片、帳號權限、R2 設定或部署。B02 完成本機部分後可接 B03；E01 及正式刪除啟用仍各自等待實際證據。
