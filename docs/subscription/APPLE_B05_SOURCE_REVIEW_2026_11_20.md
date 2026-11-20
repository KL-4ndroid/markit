# B05 實作前審查

2026-11-20；基線 5eeda86。Gate 2 已完成，參考 IOS_CAPACITOR_PROGRESS.md 的 Gate 2 紀錄；本次審查允許 StoreKit 2 私有橋接**來源**與 Windows 注入驗證。新增私有 file package 宣告與 lock-only 登錄，不升級 Capacitor 或引入第三方商店 SDK、不生成 iOS 專案、不啟用商店或公開 Apple API。Swift 編譯／真實商店仍屬 H01／E02。

採直接 StoreKit 2，避免再引入訂閱聚合服務與第二份權益來源。Swift 僅提供商品、appAccountToken 購買、交易恢復／未完成讀回、finish 與系統管理訂閱。TypeScript platform adapter 對照商品／帳號／環境；共用 controller 負責狀態、登入世代、重試與後端回報。權益只來自 B04 server writer 加既有可信能力讀取；商店本機 verified 不代表已授權。

Apple Transaction.unfinished 保留未交付交易，不另外把 JWS 放到 localStorage、Dexie 或 auth Keychain。原生獨立的 device-only Keychain 只保留每個 opaque binding 的「購買結果不確定」旗標，讓 pending／購買中被終止不因重開變成可再次購買；此旗標不是付費資格。無交易可核實時不自行清除，需要商店結果或後續客服核對。購買前先讀未完成交易；重試只讀回／驗證，不再次 purchase；提交後回應遺失可冪等重送。使用者主動「恢復購買」才 AppStore.sync；重開／前景只讀 unfinished。每次登入／前景可再次掃描；錯誤帳號不送出、不 finish。只有後端明確已提交或同快照已完成，才 finish；review／不明／離線保留原生佇列。finish 失敗可再恢復，不顯示扣款失敗。切帳號後舊非同步結果不得更新新畫面或送往新帳號。StoreKit pending 不宣稱成功，使用者取消不顯示紅色錯誤。

目前四價格候選為 59／588／249／2490，實際 productId 仍空白。UI 僅使用商店 displayPrice／週期，不自行換算月均或造假省多少。優惠、試用、Family Sharing 尚未核定，來源拒絕這些選項；不建立創始方案。跨來源已有訂閱先管理原來源，不自動移轉或再購買。恢復不依當前方案是否付費而隱藏。

正式 factory 保持 disabled，缺目錄／登入 owner／fresh capability／網路／來源／法務審查任一項則不得購買。測試 factory 只由本機 harness 注入，不用 URL、localStorage 或 public env 開啟。B04 目前無正式 binding API、reader 或 migration；B05 只補明確 client/server port，不用 service role 暴露給 client。

官方來源核對：

- [StoreKit Transaction.unfinished](https://developer.apple.com/documentation/storekit/transaction/unfinished)：未 finish 交易可重讀。
- [Transaction.finish](https://developer.apple.com/documentation/storekit/transaction/finish())：完成交付後再通知商店。
- [AppStore.sync](https://developer.apple.com/documentation/storekit/appstore/sync())：提供明確恢復操作；不在每次啟動強制同步。
- [Capacitor iOS plugin](https://capacitorjs.com/docs/plugins/ios)：CAPBridgedPlugin 與 Promise 方法；來源沿現有私有 plugin 結構。

集中驗收：注入 StoreKit bridge、同一 controller + React view + HTTP B04 handler；真實簽章／資料庫沿 B04 有效證據。覆蓋取消、pending、離線、提交回應遺失、重開、切帳號、重複點擊、價格缺失、錯來源、finish 失敗；不重跑整個刪帳／照片矩陣。
