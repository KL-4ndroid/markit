# 訂閱到期、降級與資料保留實作／發布

2026-10-29，Asia/Taipei。新三方案讀取與保留規則；正式付款尚未啟用。

## 已確認範圍

使用者選擇直接套用所有帳號。順序為 dormant SQL → 相容前端 production Ready → 啟用全體限制 → 複驗。不能先限制仍依賴原始財務表的舊客戶端。

| 資料／能力 | 免費版 | 輕量版 | 高階版 | 降級後 |
| --- | --- | --- | --- | --- |
| 報名、錄取、繳費、攤位費／保證金、市集／固定安排、準備、私人心得 | 可用 | 可用 | 可用 | 保留並持續可用 |
| 銷售、互動、商品、商品照片、現金盤點、基本成果 | 限制查閱及付費寫入 | 可用 | 可用 | 保留，恢復對應權益後可查閱 |
| 成交照片、深入分析、完整報告、團隊協作 | 不開放 | 不開放 | 依既有角色及來源 | 保留，照片原保存期限仍適用 |
| 原有員工 | 停止協作 | 停止協作 | 品牌主逐一確認恢復 | 不刪關係、不自動恢復 |
| 待同步成交、照片原圖、心得／現金草稿 | 保留 | 依功能及明確提交操作繼續 | 依功能及明確提交操作繼續 | 不因降級清除或假裝送達 |

## 實作邊界

- 091：老闆可讀取所屬商品的管理員 null-market 更新事件。按實際商品 owner 歸屬，不依目前員工名單；不放寬寫入授權。
- 092：`owner_accessible_markets`／`owner_accessible_events` 保留免費基礎欄位，遮蔽財務統計及巢狀銷售資料。原表另有 restrictive RLS；三個 staff view 補上動態 Team、active 關係與資料等級，巢狀成本／利潤亦遮蔽。撤回匿名 view 權限。
- 商品照片 Service API 明確核對目前讀取權益；拒絕不回傳假的空照片。影像／metadata 不存 HTTP 快取。成交照片沿使用者 JWT／RLS，輕量版不能讀取高階成交照片。
- 現金成交 SECURITY DEFINER RPC 明確檢查 tier；可選 `daily_stats` 表只在實際存在時加政策（雲端目前不存在）。
- Owner 同步先讀服務端 scope，未知／失敗不推測為免費或空資料。切換 scope 重新核對完整可見歷史；恢復付費只刷新已同步事件的完整 payload，不重複扣庫存、不覆蓋 pending。
- 免費版付費事件保留原 pending／local_only，不反覆提交已知會被方案拒絕的事件；免費市集事件仍可同步。照片、心得／現金草稿沿既有明確提交流程。
- 方案中心顯示目前有效方案；到期顯示免費版。保留說明可展開且支援鍵盤；一般免費帳號不被推測曾降級。寬限與取消期限依可信來源，不新增固定天數。
- 原帳號重新登入可關閉其登入過期提示；不同帳號及 staff reset 不自動放行，不丟棄本機資料。

規則為共用 TS／SQL，未新增瀏覽器假設、原生 SDK 或商店 adapter。無法撤回使用者曾下載的檔案；本機資料保存與畫面／新讀取限制分開處理，離線沿既有 freshness gate。

## 驗證與目前狀態

- PostgreSQL 隔離 24 項通過：實際部署函式／view、重跑遷移、Free 安排寫入／付費拒絕、Light 恢復、Viewer／Operator、到期與寬限、現金同筆重試、業務資料不變。
- TS：原帳號登入、cache guard、照片狀態、付費 pending 保留／恢復、方案畫面、分級路由、owner 重播與跨 scope 游標、固定安排及 sync audit。
- 既有 production `dd0dcf9` 已確認 Ready；實際下載月結 PDF、檢視五頁，中文字與版面正常；既有商品照片可見。管理員商品說明缺口由 091 及新 owner pull 補足。
- 092 安裝時先驗證 `global_read_enforcement=false`；不存在 daily_stats 與舊 view 匿名 ACL 差異已修正重驗。正式帳戶來源盤點為空，未遷移或映射任何舊付費承諾。
- 程式提交 `5452e08975442f6f70bad10c11160ea3553cc430` 已在 production Ready：`dpl_5GeCFbJoiNSxSazvReA1hk2ngjEw`，正式 alias `markit-app-mocha.vercel.app` 核對一致；本機最終 build／TypeScript、targeted ESLint 通過。
- 隨後依使用者全體授權啟用，雲端讀寫旗標皆 `true`。以一般測試 JWT，Free 無法讀取原始財務／商品／照片，新 view 仍提供同數市集及費用；Light 恢復商品與商品照片但無成交照片／協作；Team 成交照片 metadata 恢復且員工仍須明確恢復。
- 真實員工依序 viewer／manager／operator 核對新 view：viewer 售價／庫存為 null，manager／operator 可讀現場欄位、成本仍為 null。此次為讀取與角色切換驗證，所有寫入、離線競態或實機矩陣不據此視為完成。
- 完整產品資料、商品照片版本及成交照片 metadata 在恢復 Team 後與降級前相同；未建立成交或變更業務資料。老闆覆寫已關閉回原免費方案，指定員工還原 operator／L2、`suspended_by_plan`，其他成員未操作。
- 正式站免費方案顯示與展開保留說明已目視檢查：[畫面證據](ux-evidence/2026-10-29/subscription-retention/production-free-retention.png)。一般免費帳號不虛構過往訂閱；銷售／商品導覽已隱藏。
- 正式站 Free 的「檢查雲端更新」完成，仍顯示待準備 8 場／已結束 28 場；小農場顯示攤位費 600、保證金 0、時間軸、待辦及心得入口，返回清單正常，未修改報名或繳費。[手機場次證據](ux-evidence/2026-10-29/subscription-retention/production-free-market.png)。
- 暫開 Light 目視舊商品售價 120／成本 40／庫存 2／已售 2、封面與管理員描述均恢復；沒有重複扣庫存。[商品恢復證據](ux-evidence/2026-10-29/subscription-retention/production-light-product-restored.png)，已再次還原原免費方案。
- 追加照片服務錯誤分類：權益／商品／關係讀取不可用回 503，不將照片誤判為空；image／metadata／capability 沿 UI-11 保留與重試契約。此補強以本文件同次提交為來源，無新旗標或資料搬移。
- 最後核對 24 個可呼叫 SECURITY DEFINER 簽章及實際 cash save 定義，發現舊同筆重試在寫入 trigger 前直接回傳 row。093 在兩個 save RPC 入口先查目前讀取權益，已雲端套用與唯讀驗證；實際部署函式的隔離重現、修補後拒絕及付費合法重試通過，ACL 與資料皆不改。

## 發布、還原與剩餘範圍

1. 091／092 與 readiness 通過。
2. 提交、部署相容程式，核對 production Ready 及 SHA。
3. 執行 `supabase/repairs/092_activate_all_subscription_data_guards.sql`，讀寫皆 true。
4. 指定測試帳號 Free → Light → Team，核對資料與照片版本、員工明確恢復；結束還原 owner 原方案、staff operator。原方案免費時為 suspended_by_plan。

若發現免費基礎功能被阻斷，將兩個 settings 的 enforce_all 改回 false 可暫停本次全體 rollout；指定 pilot 仍沿 082 限制。保留業務資料、新 view 與既有角色保護，不以刪資料復原。

尚不含 Apple／Google 付款、取消、恢復購買、退款／商店延遲通知接線。現在只信任既有 admin／指定測試覆寫，不自動映射舊 Pro／Team 承諾。真實設備及完整跨裝置／離線矩陣須另驗。
