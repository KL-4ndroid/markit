# iOS 上架：Windows 先行與最少人工交付方案

日期：2026-10-19（Asia/Taipei）

實作與最終驗證完成於 2026-10-20，證據見 `docs/IOS_WINDOWS_FIRST_IMPLEMENTATION_EVIDENCE_2026_10_20.md`。

後續已完成 iOS 安全登入儲存來源、初始化等待、失敗保護與自動安裝修補；最新驗證見
`docs/IOS_AUTH_STORAGE_EVIDENCE_2026_10_20.md`。這仍是 Windows 工程證據，尚無 Swift／真機／簽署結果。

再接續完成相機／相簿來源、兩個照片入口與權限／隱私設定自動化，見
`docs/IOS_CAMERA_EVIDENCE_2026_10_20.md`；檔案輸出／分享與完整原生啟動仍待後續實作。

狀態：使用者已於 2026-10-19 接受執行方向與自主工程安排；W1 依賴拆分、Windows CI、bootstrap 技術審查與來源設定已實作，另補上背景草稿保存。2026-10-20 接續完成原生網路／前景背景 adapter 來源與 Windows 行為測試，證據見 `docs/IOS_RUNTIME_PORTS_EVIDENCE_2026_10_20.md`。其他裝置 adapters、實際原生專案與外部發布仍未完成。

## 1. 使用者已確認的目標與設備

- 最終目標是正式上架 iOS App Store，TestFlight 是中途交付。
- 盡可能由代理完成工程與重複操作，降低使用者人工負擔。
- 現階段只有 Windows，尚未申請 Apple Developer 帳號。
- 先完成 Windows 能處理的工程，再租用具備合適 macOS／Xcode 的設備完成 iOS 工作。
- 延續原有 iOS 原生訂閱首發方向；不據此改成免費公開首發或取消付費需求。

## 2. 現況與權限邊界

現行權威仍是 AGENTS.md、跨平台 guardrails 與 canonical JSON。
Gate 2 有完成紀錄；依使用者接受的 W1 方向，iOS 原始專案準備已從雙平台商店目錄拆出。
IOS-BOOTSTRAP-REVIEW 已完成本輪最小來源切片的技術審查；簽署與商店 runtime 保留各自帳號／商品依賴。
目前沒有把整合測試、商店或上架狀態改成完成。

目前可沿用手機靜態建置、HTTPS API 邊界、lib/platform 合約及 Web adapters。
已依 `docs/IOS_BOOTSTRAP_SOURCE_REVIEW_2026_10_19.md` 安裝固定版本 8.5.3 的 core、iOS 與 dev-only CLI。
已有 bundled config、必要參數檢查與 macOS 生成腳本，但尚無 `ios/` 原生專案及裝置 adapters；現有 IAP Web adapter 回報 unavailable。
訂閱交易驗證與權益寫入的合約，不等於真實 Apple runtime。
帳號刪除已有申請 API 與本機基礎，但仍缺完整執行、外部驗證與發布證據。
現有 GitHub Actions 工作流執行 Web 品質檢查，沒有 iOS 簽署／上傳工作。

## 3. 把人工介入集中在四個時點

| 時點 | 使用者處理 | 代理先完成的交付 | 是否反覆發生 |
| --- | --- | --- | --- |
| H1 身分與帳號 | Apple 申請、驗證、會員付款、需本人接受的協議與必要稅務／銀行資料 | 個人／組織選項說明、欄位清單、操作順序、帳號狀態核對 | 初次為主，協議／會員更新時重做 |
| H2 受保護設定 | 租用 macOS 環境、帳號登入與 2FA、將簽署／API 憑證存入指定 secrets | 設定腳本、權限與 secret 名稱清單、缺項檢查、可重複建置流程 | 初次為主，憑證輪替時重做 |
| H3 真機驗收 | 在 iPhone 安裝，依短腳本操作相機、離線、背景／重啟、購買等 | 自動測試、可安裝版本、分批驗收腳本、診斷與修復 | 依變更風險重測，無法承諾只測一次 |
| H4 商業與發布決定 | 核定價格、對外政策、最終送審／公開發布 | 建議選項、商店文案、資料揭露、截圖與審核說明、完整候選版本 | 首發及相關決策變更時 |

使用者不需要手動執行日常 npm、讀建置紀錄、重填所有商店欄位或自行排查工程錯誤。
受保護設定應使用 secrets，不把 Apple 密碼、2FA、私鑰或稅銀資料寫入 Git 或要求貼到對話。
Apple 決定審核結果，代理不能保證通過；由代理處理可修正的程式、資料與送審內容問題。

## 4. Windows 階段交付

| 順序 | 交付 | 工作與驗收 | 目前條件 |
| --- | --- | --- | --- |
| W0 | 現況基線 | 手機 TypeScript、mobile API build、靜態輸出檢查、啟動 smoke；逐項記錄結果 | 可執行；不等於 iOS 編譯或真機通過 |
| W1 | 發布依賴拆分 | 將 iOS bootstrap、Apple 商店、Android、雙平台驗證分開；更新 schema、tests、文件與 checklist | 先審查下節提案，保留所有原有完成證據 |
| W2 | 共用流程整備 | 平台 API 接線、草稿／待同步資料保存、登入還原、背景中斷狀態、手機 UX | 使用 Web／fake adapters 驗證，原生行為待 Mac 補證據 |
| W3 | 訂閱與刪除程式準備 | 依原合約分切片完成驗證、冪等權益寫入及刪除缺口；合成資料與隔離本機測試 | 需要各 runtime 切片審查；Apple 真實交易與遠端啟用仍待帳號 |
| W4 | 原生與自動化準備 | 審查套件、iOS 設定、adapter 原始碼、建置／簽署／上傳腳本；以分階段 job 執行 | 切片審查後才能建立原生檔案；Windows 不能給出 Xcode 通過證據 |
| W5 | 首發資料包 | 商店文案、資料揭露清單、政策草稿、商品映射模板、截圖腳本、審核帳號方案 | 法務／價格由使用者核定，最終畫面由原生候選版本產出 |

W2、W3、W4、W5 依實際依賴交錯執行，避免把所有文件當成開始工程的前置條件。
不用先新增推播、生物辨識或其他非首發必要功能。
Web 收款 ECPay 繼續延後；Android 保持架構可移植，但不作為擬議 iOS 中途交付的外部先決條件。

## 5. 下一個可審查切片：W1 iOS bootstrap 依賴拆分

問題：現行 NATIVE-ADAPTERS 同時包含原生專案與商店 adapters，並依賴雙平台商店目錄。
這讓沒有 Apple／Google 帳號的 Windows 準備工作，與真實購買啟用混在一起。

已納入 canonical graph 的任務邊界（此表是原始提案摘要，實際狀態以 JSON 為準）：

| 任務 | 建議前置 | 退出條件 |
| --- | --- | --- |
| IOS-BOOTSTRAP-PREP | Gate 2 完成、切片審查通過 | 固定版本套件、設定、生成腳本與來源測試；Windows 僅標記來源準備完成 |
| IOS-PROJECT-GENERATION | IOS-BOOTSTRAP-PREP | 在 macOS／Xcode 實際生成並驗證原生專案；Windows 不生成 `ios/` |
| IOS-DEVICE-ADAPTERS | IOS-BOOTSTRAP-PREP | 裝置 adapter 程式與合約測試；另等真機結果，不因 fake 通過標完成 |
| IOS-SIGNING-READINESS | IOS-BOOTSTRAP-PREP | Apple enrollment／holder／compliance、Bundle ID、App record、macOS／Xcode／device 的已驗證狀態；不等待商店通知 runtime |
| IOS-SIGNED-BUILD | bootstrap、相容 macOS／Xcode、Apple 身分與簽署準備 | 真實簽署安裝與 build 紀錄 |
| IOS-INTERNAL-TESTFLIGHT | signed build、可用 API、核心真機驗收、測試資訊與適用聲明 | 真實 TestFlight 安裝與更新成功；購買若未就緒明確不可用 |
| APPLE-CATALOG-CONFIG | IOS-SIGNING-READINESS、核定方案 | Paid Apps Agreement、適用稅銀資料、tester、真實 Apple 商品映射與查詢證據 |
| APPLE-PAID-RUNTIME | Apple catalog、runtime 切片審查、伺服器設定 | 真實驗證、通知、權益寫入及恢復購買 |
| IOS-PAID-RELEASE | Apple sandbox、帳號刪除、安全／法務、素材、外部測試與發布驗收 | iOS 付費版本符合送審與公開發布條件 |

Android 與跨平台權益的既有要求另行保留。原本整體 native gates 在雙平台證據齊全前仍 not_ready。
如果需要可獨立判定 iOS readiness，增加明確 platform-scoped 模型與測試；不得把 aggregate gate 改成只看 Apple。
共用後端安全、授權、資料恢復與帳號刪除要求仍適用 iOS，不因平台拆分被略過。

`APPLE-ACCOUNT-READINESS` 與外部帳號總檢查保留完整清單，包含較晚才就緒的 server
API／notifications。iOS 簽署與商品設定分別核對其上列必要項目，不用總清單全部完成
作為建立 runtime 的前提。`IOS-SIGNING-READINESS` 只代表前置條件已核對；真實編譯、
簽署與安裝仍須各自任務證據。`COMMERCIAL-POLICY` 核准決策，原有三項 sandbox
檢查已移至 `SANDBOX-LIFECYCLE`，保留 item ID 與狀態；iOS 使用自己的 sandbox 證據。

預計修改範圍：

- docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json：拆任務與明確依賴，不虛構完成狀態。
- lib/deployment/launch-execution-plan.ts 與對應 tests：保留 DAG、狀態一致性及 gate coverage；僅必要時新增平台模型。
- docs/CAPACITOR_IOS_ANDROID_EXECUTION_PLAN_2026_08_16.md、docs/IOS_CAPACITOR_PROGRESS.md、master plan：對齊新順序。
- manual checklist 及其必要產生器／測試：由 canonical 狀態生成，避免兩份互相矛盾的清單。

W1 本身不安裝 Capacitor、不建立原生專案、不碰簽署或遠端權益／刪除。
後續 W4 的最小來源切片已另行完成版本、檔案與 acceptance 技術審查並實作；
實際生成、裝置 adapters 及 store runtime 仍各自保留必要驗證與審查。

W1 驗收：啟動檢查與對應合約測試通過；已完成 Gate 1／2 不被重開；Google 待辦不阻擋擬議 iOS bootstrap；Apple 交易需求不被移除；原始整體發布狀態不被提前改成 ready。

## 6. 何時申請 Apple 與租用 Mac

- Windows 的 mock／contract 與素材準備可先進行，不以付費 Apple 帳號為前提。
- 當需要真實 Bundle ID／商品／簽署設定，或 Windows 交付已接近整合完成時，集中辦理 H1；預留核驗等待，避免租機後才開始申請。
- 當 iOS 原始專案、建置腳本、測試資料與診斷方式已備妥，再進行 H2 租機與 Xcode 編譯。
- 租機環境須事前確認可執行所需 Xcode、能安全匯入簽署材料；連接本地 iPhone 的能力不可假設。遠端環境可經 TestFlight 分發至本地 iPhone，但需要 Apple 帳號與可用簽署版本。
- 可將例行 build 移到 GitHub-hosted macOS runner；第一次啟用前確認帳號配額／費用及授權，不能承諾免費。
- macOS simulator／Xcode 結果可能要求再修正原始碼；無法承諾 Windows 完成後租機只需最後一次打包。

## 7. 例行發布自動化的設計

建議依序建立可分開驗證的 jobs：共用品質檢查 → mobile 資產 → macOS unsigned build／測試 → 受保護簽署 → TestFlight 上傳。
正式 App Store 送審與公開發布保留明確發布決定。API 輔助填入商品與 metadata 前先產生差異供核對；不以文件備妥代表已獲准外部寫入。
測試者邀請等對外訊息須有使用者明確授權。

憑證只進入受保護 job；不讓 fork PR 取得簽署 secrets，使用暫時 keychain 與清理機制。
失敗時保留去識別化 build log／測試輸出供代理修正，使用者只需處理缺少的身分操作或實機觀察。
Apple 支援 API 管理許多商店／測試資料，但不是所有初始帳號步驟都可省略，也未在本次啟用。

## 8. 本次驗證紀錄

- 已讀取現行 AGENTS.md、跨平台規範、執行計畫、canonical 任務與現有 CI。
- 手機 TypeScript 檢查：PASS（npx.cmd tsc --noEmit --project tsconfig.mobile.json）。
- 原生發布準備度：如預期 not_ready，4 個完成、12 個 blocker；這是狀態檢查，不是 iOS 測試。
- mobile API build：PASS（npm.cmd run build:mobile:api）；使用已記錄的公開 HTTPS API base，未執行遠端寫入。
- 靜態輸出驗證：PASS（npm.cmd run verify:mobile）；324 個檔案，19.42 MiB，通過資產與伺服器邊界檢查。
- 靜態 HTTP smoke：PASS（npm.cmd run smoke:mobile）；9 個資產／路由可讀，API 路徑保持 404。未驗證瀏覽器互動、登入或 iOS 裝置行為。
- 上述基線為初次提案時的驗證。接受後的 W1 工程另修改 canonical graph、檢查器、回歸測試、文件與 Windows CI，沒有 Apple 帳號操作、雲端執行、付費、原生安裝或上架行為。

接受後的 W4 來源切片已安裝套件與新增 config／scripts／tests，但沒有生成、編譯或簽署原生 App。
`check:ios-bootstrap` 回報 sourceReady=true、readyForGeneration=false，缺正式 App ID 與 macOS。
來源測試另證明 fixture 設定不能用於真實生成、Capacitor 自身 loader 能讀取設定。

W2 的本輪變更：`scheduleFormDraftSave` 透過 LifecyclePort 在背景事件時立即保存待存草稿；
新增市集及共用 autosave hook 已接入。測試涵蓋 debounce、背景立即保存、取消舊快照、
停止後不再寫入，以及避免重複保存。儲存仍是既有 sessionStorage／30 分鐘界線，
並未完成跨程序／重裝恢復，也沒有新增雲端草稿或改變原文隱私政策。

## 9. 官方依據（2026-10-19 查閱）

- GitHub macOS 簽署：https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications
- Apple App Store Connect API 能力：https://developer.apple.com/app-store-connect/api/
- Apple 協議與 Account Holder：https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/
- Capacitor 建置環境：https://capacitorjs.com/docs/getting-started/environment-setup

以上支持自動化可行性，不代表本專案的原生建置或 Apple 審核已通過。
