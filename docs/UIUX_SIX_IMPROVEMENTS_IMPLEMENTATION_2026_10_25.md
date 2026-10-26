# 六項 UI／UX 優化實作與驗收

後續進入／返回驗證已完成，並補上直接開網址、單場／集中心得往返及載入中返回的缺口，見 [動線驗證與修正](UIUX_ENTRY_RETURN_AUDIT_2026_10_25.md)。此為 `ef5a05b` 之後的本機增量，尚未提交／推送。

日期：2026-10-25（Asia/Taipei）。依使用者「可以開始進行實作」授權，落實再評估的 UX02／03／06／07／13／17，以正式 App 本機手機畫面為主。

本文件承接 [完整計畫](APP_UIUX_OPTIMIZATION_PLAN_2026_10_25.md) 與 [再評估暨視覺規格](APP_UIUX_PLAN_REASSESSMENT_2026_10_25.md)。先前文件中的「未實作」是當時分析階段的紀錄；本次僅推進六項 A 類，其他 B／C 類與財務口徑 Q01 仍維持原決策。

## 已完成的介面與共用呈現

| 項目 | 最終行為 | 使用者收益與保留邊界 |
| --- | --- | --- |
| UX02 今日場次 | 同一份可見今日集合計算總數、營業中、待確認／準備、已收攤；主卡包含於總數。其他已收攤場次預設收合；全數結束仍保留按原定結束時間最近的回顧主卡 | 不再把同日安排的子集合當成今日總數。等待錄取、待繳費、延期、固定場次及缺時間各自說明；整場 completed 與今日收攤分開用語。未更改場次可見範圍 |
| UX03 報名／繳費 | 移除暗示所有前置步驟已完成的四步圖；顯示目前紀錄、說明與唯一下一步。已錄取者可直接「標記已繳費」；另有文字明確的「更正／其他狀態」 | ongoing／completed 不推定已付款。繼續使用原 status writer、防重複點擊、錯誤處理及取消確認。沒有新增付款或歷史欄位；本輪未實際更改任何報名狀態 |
| UX06 心得搜尋／篩選 | 一個頁面標題；搜尋常駐，縣市、起迄日、已移除放同一個頁內篩選區；即時生效，不加套用步驟。條件、結果數、清除常駐 | 收合後仍知道目前條件；錯誤日期不能藏起修正欄位。實測另外修正「日期轉為有效時篩選自行收起」問題，輸入會保持展開 |
| UX07 團隊說明 | 成員先看目前存取狀態與一段工作摘要，需要時展開角色規則。區分待接受、方案暫停、移除、模擬、資格未確認與可用 | Viewer 明確不能記錄／修改；Operator 與 Manager 依既有能力描述。連線／資格過期不一律說成必須升級。沒有更動方案、席次、角色能力、RLS 或實際存取權 |
| UX13 心得閱讀 | 短文直接閱讀；長文以最多約 160 字的摘要呈現，原地展開／收起；搜尋時摘要移到命中段落。「編輯心得」與閱讀分開 | 不必為了閱讀開編輯器。已保存版本與未送出草稿明確區分，顯示已保存本文時也使用該版本日期。版本資訊次要揭露；衝突、移除與草稿提示仍可見 |
| UX17 呈現一致性 | 手機詳情把返回／同步／編輯留在上列，名稱與地點在完整寬度自然換行；管理摘要採既有緊湊模式，主動作前置。報到／提早進場時間沿共用 formatter | 保留現有主題與色票；主要動作至少 48px、一般控制至少 44px，保留焦點提示及展開語意。沒有固定卡高、縮小觸控目標或新增全站設計系統 |

「最近一場」按原定結束時間排序，不代表取得了額外的實際關攤時間歷史。背景資料刷新仍可更新正確狀態；收合區使用原生 details，在同一掛載期間不受一般 React 重繪重設。

## 實作入口

- 今日集合與計數：[today-view-model.ts](../lib/home/today-view-model.ts)、[首頁](../app/page.tsx)、[主卡](../components/home/TodayMarketCard.tsx)。
- 目前紀錄及合法下一步：[共用呈現](../lib/markets/market-registration-presentation.ts)、[報名區](../components/markets/MarketRegistrationPanel.tsx)、[詳情接線](../components/markets/MarketDetailScreen.tsx)。
- 心得閱讀：[Unicode 摘要](../lib/markets/journal-reading.ts)、[原地閱讀元件](../components/markets/JournalReadingBody.tsx)、[集中與單場 Workspace](../components/markets/MarketJournalWorkspace.tsx)。原 Repository、草稿序列、版本衝突與雲端 writer 未改。
- 團隊：[共用文案模型](../lib/permissions/staff-access-presentation.ts)、[成員管理](../components/settings/StaffManagement.tsx)、[員工權限卡](../components/staff/StaffPermissionCard.tsx)、[頁面資格接線](../app/settings/team/page.tsx)。新 helper 僅描述既有資格，不作為授權來源。
- 回歸：[六項行為與可存取標記](../tests/uiux-six-improvements.test.tsx)、既有手機與角色 UI 測試。測試清單已登記；老角色 UI 測試同步修正為現有 `.web.tsx` 路徑與既有認證／救援文案，未放寬 runtime gate。

## 實際操作證據

來源：`http://localhost:3000` 正式 App，原測試老闆帳號；沿用原本紫灰主題。這些是本機 App 截圖，與之前三張靜態設計方向稿不同。

- 今日顯示 5 場：營業中 1、待確認／準備 2、已收攤 2；同日安排的 3 場不再被當成全部今日場次。
- 已錄取場次的管理頁：可看到「尚未記錄已繳費」、主按鈕與更正入口；展開後保留等待錄取／已錄取／已繳費／如期舉行／延期／取消。沒有按下任何狀態變更。
- 心得原有 2 篇：搜尋停車、展開篩選、輸入反轉日期、修正起迄日為 10/25 同日，結果為 1 篇；收合仍有條件；清除後回到 2 篇。以原生日期欄位和鍵盤操作驗證，不透過 DOM 注入狀態。
- 為長文閱讀建立一份 401 字的**本機新草稿**：收起後顯示摘要，展開完整本文不進編輯；集中頁搜尋「搜尋驗證關鍵字」直接看到命中段落。最後經「續寫／處理草稿→捨棄這份草稿」清理，搜尋結果回到 0，再清除搜尋回到原 2 篇。沒有按儲存到雲端，沒有改既有心得。
- 團隊頁原有暫停成員：先顯示「存取已暫停」，查看者規則明確表示不能記錄／修改；未恢復、移除、改角色或發出邀請。

| 證據 | 圖片 |
| --- | --- |
| 今日總數與已收攤 | [390 今日](ux-evidence/2026-10-25/six-today-default-390.png)、[已收攤展開](ux-evidence/2026-10-25/six-today-closed-expanded-390.png) |
| 手機報名主動作與更正 | [390 主畫面](ux-evidence/2026-10-25/six-registration-default-390.png)、[更正選項](ux-evidence/2026-10-25/six-registration-corrections-390.png) |
| 心得預設與條件 | [390 預設](ux-evidence/2026-10-25/six-journals-default-390.png)、[日期條件](ux-evidence/2026-10-25/six-journals-filtered-390.png)、[日期錯誤](ux-evidence/2026-10-25/six-journals-date-error-390.png) |
| 長文與搜尋 | [展開本機草稿](ux-evidence/2026-10-25/six-journal-expanded-draft-390.png)、[命中摘要](ux-evidence/2026-10-25/six-journal-search-excerpt-390.png) |
| 暫停查看者 | [角色規則與存取狀態](ux-evidence/2026-10-25/six-team-viewer-suspended-390.png) |

尺寸補驗：今日頁 360／390／430／1440，心得頁 360／390／430／1024／1440，管理頁 360／390。檢查時文件的 scrollWidth 等於 clientWidth，沒有文件層級的橫向溢出；360／430 最終心得第一篇在頁面頂端約 340 CSS px 開始。這是本次測試資料、字級與主題的結果，不是所有長名稱／文字縮放情境的保證。[360 心得](ux-evidence/2026-10-25/six-journals-360.png)、[430 心得](ux-evidence/2026-10-25/six-journals-430.png)、[1440 心得](ux-evidence/2026-10-25/six-journals-desktop-1440.png)、[1440 今日](ux-evidence/2026-10-25/six-today-desktop-1440.png)。

## 自動驗證與交付邊界

完成相關行為／SSR 測試、既有今日、固定安排、工作台、時間格式、心得保存／衝突／重建、手機 UI、角色能力及設定資訊架構回歸；修改的 TS／TSX 通過 ESLint。Web production build、手機靜態打包及輸出邊界驗證通過。

新邏輯為平台中立的呈現 helper 與 React 狀態；沒有新增 browser／device API、裝置權限、原生依賴、資料庫 migration 或同步路由。Web、iOS、Android 共用；手機打包成功不代表真機完成。

尚未取代的驗證：有效 Team 的真實員工登入與跨帳號完整操作、iOS／Android 真機及 OS 鍵盤、正式部署、真實攤商第一次使用的可用性研究。團隊 active／pending／revoked／模擬／資格過期等模型分支有自動測試；實際帳號僅驗證現有暫停成員。不能由本輪判定所有使用者已能更快完成工作。

本輪沒有修改財務公式、收入、成交、庫存、現金、訂閱方案或權限；沒有檢視／修改 Demo；沒有執行 SQL、部署、commit 或 push。工作區包含先前未提交工作，提交時仍需明確分批檢查。
