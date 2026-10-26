# 商品與庫存：提示與介面文字

> 自動產生；請勿手動修改。重新產生：`node scripts/generate-ui-copy-inventory.mjs`。
> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)

共 204 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。

## app/products/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-ceb42f2e94c6<br>[app/products/page.tsx:61:28](../../app/products/page.tsx#L61) | 手作 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a349c6ab7c75<br>[app/products/page.tsx:62:24](../../app/products/page.tsx#L62) | 食品 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-70895731ac39<br>[app/products/page.tsx:63:29](../../app/products/page.tsx#L63) | 飾品 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e0f19556d727<br>[app/products/page.tsx:64:28](../../app/products/page.tsx#L64) | 服飾 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ac0e73451eb7<br>[app/products/page.tsx:65:23](../../app/products/page.tsx#L65) | 藝術 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-547cda7899e2<br>[app/products/page.tsx:66:30](../../app/products/page.tsx#L66) | 文具 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-edff5d79d8a8<br>[app/products/page.tsx:67:25](../../app/products/page.tsx#L67) | 其他 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-580d91503728<br>[app/products/page.tsx:202:33](../../app/products/page.tsx#L202) | 全部 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | tabs · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1682e7a9dea7<br>[app/products/page.tsx:260:19](../../app/products/page.tsx#L260) | 商品建立成功 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleAddSuccess<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-891a8752afc8<br>[app/products/page.tsx:292:17](../../app/products/page.tsx#L292) | 本機資料庫無法正常存取 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · title<br>dbStatus.ok === false |
| UI-5f74f93a61b0<br>[app/products/page.tsx:293:23](../../app/products/page.tsx#L293) | 可能是儲存空間不足、隱私模式或資料庫結構異常。你的雲端資料不會因此被刪除。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · description<br>dbStatus.ok === false |
| UI-8417f9dd1fa0<br>[app/products/page.tsx:297:63](../../app/products/page.tsx#L297) | 取得協助 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductsPageContent · action<br>dbStatus.ok === false |
| UI-0e911ab99e28<br>[app/products/page.tsx:298:84](../../app/products/page.tsx#L298) | 重新整理 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductsPageContent · action<br>dbStatus.ok === false |
| UI-6e9e3be9518b<br>[app/products/page.tsx:308:194](../../app/products/page.tsx#L308) | ← ${marketReturn.label} | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | ProductsPageContent<br>marketReturn |
| UI-fdcb42892240<br>[app/products/page.tsx:310:15](../../app/products/page.tsx#L310) | 商品 | **畫面文字** · 直接呈現定義<br>WorkspacePageHeader：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6ea9b93d4ec4<br>[app/products/page.tsx:311:32](../../app/products/page.tsx#L311) | 銷售商品 | **來源候選** · 候選，非已證實提示<br>ProductsPageContent 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ProductsPageContent · eyebrow<br>isStaffMode |
| UI-97a098fe2499<br>[app/products/page.tsx:311:41](../../app/products/page.tsx#L311) | 商品管理 | **來源候選** · 候選，非已證實提示<br>ProductsPageContent 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ProductsPageContent · eyebrow<br>否則 isStaffMode |
| UI-b845b009f7db<br>[app/products/page.tsx:317:21](../../app/products/page.tsx#L317) | 新增商品 | **畫面文字** · 直接呈現定義<br>IconButton：辨識可點擊操作、導覽或展開入口 | ProductsPageContent · label<br>!isStaffMode |
| UI-9583e4c58a1b<br>[app/products/page.tsx:328:65](../../app/products/page.tsx#L328) | 搜尋商品 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | ProductsPageContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0aef63318a1f<br>[app/products/page.tsx:335:27](../../app/products/page.tsx#L335) | 搜尋商品名稱或描述 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | ProductsPageContent · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-705f950da0fe<br>[app/products/page.tsx:342:28](../../app/products/page.tsx#L342) | 清除搜尋 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | ProductsPageContent · aria-label<br>searchQuery |
| UI-8c142a4788c9<br>[app/products/page.tsx:355:25](../../app/products/page.tsx#L355) | 商品分類 | **畫面文字** · 直接呈現定義<br>Tabs：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · ariaLabel<br>tabs.length &gt; 1 |
| UI-88340f780f45<br>[app/products/page.tsx:368:15](../../app/products/page.tsx#L368) | 顯示停用商品 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | ProductsPageContent<br>!isStaffMode |
| UI-fe221756fabd<br>[app/products/page.tsx:371:75](../../app/products/page.tsx#L371) | 目前找到 ${filteredProducts.length} 項商品 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-23236be11b76<br>[app/products/page.tsx:377:21](../../app/products/page.tsx#L377) | 商品 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>filteredProducts.length &gt; 0 |
| UI-21ce1bd69a1c<br>[app/products/page.tsx:378:21](../../app/products/page.tsx#L378) | 售價 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>filteredProducts.length &gt; 0 |
| UI-3553b5f82e0f<br>[app/products/page.tsx:379:21](../../app/products/page.tsx#L379) | 庫存 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>filteredProducts.length &gt; 0 |
| UI-ebed27dcb2e5<br>[app/products/page.tsx:380:21](../../app/products/page.tsx#L380) | 已售 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>filteredProducts.length &gt; 0 |
| UI-4626c1b91893<br>[app/products/page.tsx:381:50](../../app/products/page.tsx#L381) | 操作 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>filteredProducts.length &gt; 0 |
| UI-99bd2fe47836<br>[app/products/page.tsx:398:34](../../app/products/page.tsx#L398) | 找不到符合的商品 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · title<br>否則 filteredProducts.length &gt; 0 → searchQuery |
| UI-190587b955d4<br>[app/products/page.tsx:398:47](../../app/products/page.tsx#L398) | 這個分類目前沒有商品 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · title<br>否則 filteredProducts.length &gt; 0 → 否則 searchQuery |
| UI-752f1c53e2b9<br>[app/products/page.tsx:399:40](../../app/products/page.tsx#L399) | 可清除搜尋或改用其他關鍵字。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · description<br>否則 filteredProducts.length &gt; 0 → searchQuery |
| UI-c96a0358b47b<br>[app/products/page.tsx:399:73](../../app/products/page.tsx#L399) | 目前沒有可銷售的商品。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · description<br>否則 filteredProducts.length &gt; 0 → 否則 searchQuery → isStaffMode |
| UI-cff53b1ed1d1<br>[app/products/page.tsx:399:89](../../app/products/page.tsx#L399) | 新增商品後會顯示在這裡。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · description<br>否則 filteredProducts.length &gt; 0 → 否則 searchQuery → 否則 isStaffMode |
| UI-ca3f763ad7a6<br>[app/products/page.tsx:401:80](../../app/products/page.tsx#L401) | 清除搜尋 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductsPageContent · action<br>否則 filteredProducts.length &gt; 0 → searchQuery |
| UI-88ed25797861<br>[app/products/page.tsx:403:95](../../app/products/page.tsx#L403) | 新增商品 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductsPageContent · action<br>否則 filteredProducts.length &gt; 0 → 否則 searchQuery → !isStaffMode |

## components/products/AddProductForm.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-d49b9ee41103<br>[components/products/AddProductForm.tsx:71:22](../../components/products/AddProductForm.tsx#L71) | 商品已新增；照片已保留，待連線恢復後可再次上傳。 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | createValidatedProduct<br>coverPhoto → outcome === 'queued' |
| UI-5e9fcf8ec6db<br>[components/products/AddProductForm.tsx:82:22](../../components/products/AddProductForm.tsx#L82) | 商品尚未建立，請確認連線後再試一次。 | **來源候選** · 候選，非已證實提示<br>createValidatedProduct 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createValidatedProduct<br>catch：操作拋出例外 |
| UI-bf7950e6adae<br>[components/products/AddProductForm.tsx:118:15](../../components/products/AddProductForm.tsx#L118) | 新增商品 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | AddProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-10f27218ca80<br>[components/products/AddProductForm.tsx:124:15](../../components/products/AddProductForm.tsx#L124) | 取消 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | AddProductForm · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-49fe0d45ddad<br>[components/products/AddProductForm.tsx:127:15](../../components/products/AddProductForm.tsx#L127) | 建立商品 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | AddProductForm · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-64710ea090fd<br>[components/products/AddProductForm.tsx:148:16](../../components/products/AddProductForm.tsx#L148) | ${submitError} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | AddProductForm<br>submitError |
| UI-7d47c6b4f74c<br>[components/products/AddProductForm.tsx:158:15](../../components/products/AddProductForm.tsx#L158) | 以零庫存建立商品？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | AddProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8abb63373bf8<br>[components/products/AddProductForm.tsx:159:21](../../components/products/AddProductForm.tsx#L159) | 商品建立後會顯示為已售完，仍可稍後補上庫存。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | AddProductForm · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f53163ae3716<br>[components/products/AddProductForm.tsx:160:22](../../components/products/AddProductForm.tsx#L160) | 仍要建立 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | AddProductForm · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/products/EditProductForm.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2082cf4f94a5<br>[components/products/EditProductForm.tsx:110:22](../../components/products/EditProductForm.tsx#L110) | 商品資料已更新；照片已保留，待連線恢復後可再次上傳。 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | updateValidatedProduct<br>coverPhoto → outcome === 'queued' |
| UI-23ee5b14de22<br>[components/products/EditProductForm.tsx:119:22](../../components/products/EditProductForm.tsx#L119) | 變更尚未儲存，請確認連線後再試一次。 | **來源候選** · 候選，非已證實提示<br>updateValidatedProduct 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | updateValidatedProduct<br>catch：操作拋出例外 |
| UI-a430767fc90f<br>[components/products/EditProductForm.tsx:154:22](../../components/products/EditProductForm.tsx#L154) | 商品狀態尚未更新，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>handleToggleActive 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleToggleActive<br>catch：操作拋出例外 |
| UI-81fa27a04a28<br>[components/products/EditProductForm.tsx:168:22](../../components/products/EditProductForm.tsx#L168) | 商品尚未刪除，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>handleDelete 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleDelete<br>catch：操作拋出例外 |
| UI-1bf95e068218<br>[components/products/EditProductForm.tsx:184:15](../../components/products/EditProductForm.tsx#L184) | 編輯商品 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7d0b6c59e866<br>[components/products/EditProductForm.tsx:190:15](../../components/products/EditProductForm.tsx#L190) | 取消 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | EditProductForm · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5be8e01b9aed<br>[components/products/EditProductForm.tsx:193:15](../../components/products/EditProductForm.tsx#L193) | 儲存變更 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | EditProductForm · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1e0be6d289ac<br>[components/products/EditProductForm.tsx:218:15](../../components/products/EditProductForm.tsx#L218) | 商品狀態 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | EditProductForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0956625bd270<br>[components/products/EditProductForm.tsx:229:36](../../components/products/EditProductForm.tsx#L229) | 停用商品 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | EditProductForm<br>formData.isActive |
| UI-2e52a0deae64<br>[components/products/EditProductForm.tsx:229:45](../../components/products/EditProductForm.tsx#L229) | 啟用商品 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | EditProductForm<br>否則 formData.isActive |
| UI-5fbe99959bef<br>[components/products/EditProductForm.tsx:240:17](../../components/products/EditProductForm.tsx#L240) | 刪除商品 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | EditProductForm<br>!isManagerMode |
| UI-c09d6963f209<br>[components/products/EditProductForm.tsx:247:16](../../components/products/EditProductForm.tsx#L247) | ${submitError} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | EditProductForm<br>submitError |
| UI-fbda6fbe953a<br>[components/products/EditProductForm.tsx:257:15](../../components/products/EditProductForm.tsx#L257) | 儲存為零庫存？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-25a2ba346586<br>[components/products/EditProductForm.tsx:258:21](../../components/products/EditProductForm.tsx#L258) | 儲存後商品會顯示為已售完，仍可稍後補上庫存。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ad1792715a4f<br>[components/products/EditProductForm.tsx:259:22](../../components/products/EditProductForm.tsx#L259) | 仍要儲存 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2b810e9899cc<br>[components/products/EditProductForm.tsx:266:15](../../components/products/EditProductForm.tsx#L266) | 停用這項商品？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-33b8b3088951<br>[components/products/EditProductForm.tsx:267:21](../../components/products/EditProductForm.tsx#L267) | 停用後將不再出現於可銷售商品中，之後仍可重新啟用。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ea19be7dbd24<br>[components/products/EditProductForm.tsx:268:22](../../components/products/EditProductForm.tsx#L268) | 停用商品 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9a6fef39bfc7<br>[components/products/EditProductForm.tsx:275:15](../../components/products/EditProductForm.tsx#L275) | 確認刪除商品？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-00f4ce35acdd<br>[components/products/EditProductForm.tsx:276:21](../../components/products/EditProductForm.tsx#L276) | 刪除後商品將無法繼續販售，此操作無法復原。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9b83d706bf0b<br>[components/products/EditProductForm.tsx:277:22](../../components/products/EditProductForm.tsx#L277) | 刪除商品 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/products/ProductCard.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-609d0ce5d6b0<br>[components/products/ProductCard.tsx:36:22](../../components/products/ProductCard.tsx#L36) | 手作 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_PRESENTATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9a1759f56803<br>[components/products/ProductCard.tsx:37:18](../../components/products/ProductCard.tsx#L37) | 食品 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_PRESENTATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a56071a8d7a1<br>[components/products/ProductCard.tsx:38:23](../../components/products/ProductCard.tsx#L38) | 飾品 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_PRESENTATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a990cb8b0134<br>[components/products/ProductCard.tsx:39:22](../../components/products/ProductCard.tsx#L39) | 服飾 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_PRESENTATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-532feff2bedb<br>[components/products/ProductCard.tsx:40:17](../../components/products/ProductCard.tsx#L40) | 藝術 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_PRESENTATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a77484971fba<br>[components/products/ProductCard.tsx:41:24](../../components/products/ProductCard.tsx#L41) | 文具 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_PRESENTATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-74bce27902d8<br>[components/products/ProductCard.tsx:42:19](../../components/products/ProductCard.tsx#L42) | 其他 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_PRESENTATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c07e462d6654<br>[components/products/ProductCard.tsx:55:12](../../components/products/ProductCard.tsx#L55) | 其他 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | category · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5b12659007e8<br>[components/products/ProductCard.tsx:88:62](../../components/products/ProductCard.tsx#L88) | ${category.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | ProductCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ac5d47257e53<br>[components/products/ProductCard.tsx:90:16](../../components/products/ProductCard.tsx#L90) | ${stockState.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | ProductCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c90aec1ce545<br>[components/products/ProductCard.tsx:93:85](../../components/products/ProductCard.tsx#L93) | ${product.name} | **動態文字入口** · 執行時綁定入口<br>h2 接收執行時文字；內容需追查所列綁定與生產端 | ProductCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-77bb7c89b610<br>[components/products/ProductCard.tsx:103:12](../../components/products/ProductCard.tsx#L103) | ${stockState.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | ProductCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-123e2ceaf47f<br>[components/products/ProductCard.tsx:107:34](../../components/products/ProductCard.tsx#L107) | ${product.totalSold ?? 0} 件 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-087e8d7c157f<br>[components/products/ProductCard.tsx:111:22](../../components/products/ProductCard.tsx#L111) | 開啟中... | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductCard<br>isOpening |
| UI-fc63cdeea029<br>[components/products/ProductCard.tsx:111:43](../../components/products/ProductCard.tsx#L111) | 查看與編輯 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductCard<br>否則 isOpening → canEdit |
| UI-f967fb549ad4<br>[components/products/ProductCard.tsx:111:53](../../components/products/ProductCard.tsx#L111) | 查看商品 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductCard<br>否則 isOpening → 否則 canEdit |

## components/products/ProductDetailScreen.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-d72d25371d86<br>[components/products/ProductDetailScreen.tsx:143:45](../../components/products/ProductDetailScreen.tsx#L143) | 手作 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d53d5311214f<br>[components/products/ProductDetailScreen.tsx:144:43](../../components/products/ProductDetailScreen.tsx#L144) | 食品 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c9ae0e53c481<br>[components/products/ProductDetailScreen.tsx:145:47](../../components/products/ProductDetailScreen.tsx#L145) | 飾品 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bd149cba050c<br>[components/products/ProductDetailScreen.tsx:146:48](../../components/products/ProductDetailScreen.tsx#L146) | 服飾 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-740d7fc3d846<br>[components/products/ProductDetailScreen.tsx:147:38](../../components/products/ProductDetailScreen.tsx#L147) | 藝術品 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-30b54dcc36b6<br>[components/products/ProductDetailScreen.tsx:148:52](../../components/products/ProductDetailScreen.tsx#L148) | 文具 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-32c6f54a03be<br>[components/products/ProductDetailScreen.tsx:149:42](../../components/products/ProductDetailScreen.tsx#L149) | 其他 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4dd168d973ff<br>[components/products/ProductDetailScreen.tsx:156:19](../../components/products/ProductDetailScreen.tsx#L156) | 商品已更新 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleEditSuccess<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dfcf075e4f90<br>[components/products/ProductDetailScreen.tsx:174:19](../../components/products/ProductDetailScreen.tsx#L174) | 商品已刪除 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleProductDeleted<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-af96bd0c7c5e<br>[components/products/ProductDetailScreen.tsx:193:26](../../components/products/ProductDetailScreen.tsx#L193) | 返回商品列表 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | ProductDetailScreen · aria-label<br>dbStatus.ok === false |
| UI-e980f105fea4<br>[components/products/ProductDetailScreen.tsx:197:21](../../components/products/ProductDetailScreen.tsx#L197) | 返回 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-bc04f7b96448<br>[components/products/ProductDetailScreen.tsx:200:15](../../components/products/ProductDetailScreen.tsx#L200) | 資料庫異常 | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-96d752673733<br>[components/products/ProductDetailScreen.tsx:211:15](../../components/products/ProductDetailScreen.tsx#L211) | 本機資料庫無法正常存取 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-cabe08482037<br>[components/products/ProductDetailScreen.tsx:214:15](../../components/products/ProductDetailScreen.tsx#L214) | 系統無法讀取本地資料庫，可能因瀏覽器儲存空間不足、隱私模式，或資料庫結構損壞。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-7c165fbc29f3<br>[components/products/ProductDetailScreen.tsx:218:17](../../components/products/ProductDetailScreen.tsx#L218) | 請保留這台裝置的資料，重新開啟頁面；若問題持續，可前往支援頁取得協助。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>dbStatus.ok === false → dbStatus.recoverable |
| UI-bdae40e9900c<br>[components/products/ProductDetailScreen.tsx:225:15](../../components/products/ProductDetailScreen.tsx#L225) | 取得協助 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-ea339af33781<br>[components/products/ProductDetailScreen.tsx:231:15](../../components/products/ProductDetailScreen.tsx#L231) | 返回商品列表 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-9414d88cffdd<br>[components/products/ProductDetailScreen.tsx:247:26](../../components/products/ProductDetailScreen.tsx#L247) | 返回商品列表 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | ProductDetailScreen · aria-label<br>!product |
| UI-389e9c5121c0<br>[components/products/ProductDetailScreen.tsx:251:21](../../components/products/ProductDetailScreen.tsx#L251) | 返回 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>!product |
| UI-54db54f4e28c<br>[components/products/ProductDetailScreen.tsx:254:15](../../components/products/ProductDetailScreen.tsx#L254) | 找不到商品 | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>!product |
| UI-d05bbfc7b784<br>[components/products/ProductDetailScreen.tsx:263:15](../../components/products/ProductDetailScreen.tsx#L263) | 找不到此商品 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>!product |
| UI-88dc5869f804<br>[components/products/ProductDetailScreen.tsx:266:15](../../components/products/ProductDetailScreen.tsx#L266) | 此商品可能已被刪除或不存在 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>!product |
| UI-2d36a62f2ed1<br>[components/products/ProductDetailScreen.tsx:272:15](../../components/products/ProductDetailScreen.tsx#L272) | 返回商品列表 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ProductDetailScreen<br>!product |
| UI-3d9454538783<br>[components/products/ProductDetailScreen.tsx:285:47](../../components/products/ProductDetailScreen.tsx#L285) | 不限 | **來源候選** · 候選，非已證實提示<br>stockLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | stockLabel<br>product.unlimitedStock |
| UI-2ef9bfc76f24<br>[components/products/ProductDetailScreen.tsx:292:158](../../components/products/ProductDetailScreen.tsx#L292) | ${marketReturn.label} | **動態文字入口** · 執行時綁定入口<br>Link 接收執行時文字；內容需追查所列綁定與生產端 | ProductDetailScreen<br>marketReturn |
| UI-cfec3586cd0b<br>[components/products/ProductDetailScreen.tsx:295:24](../../components/products/ProductDetailScreen.tsx#L295) | 返回商品列表 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | ProductDetailScreen · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2c20489c57a6<br>[components/products/ProductDetailScreen.tsx:299:19](../../components/products/ProductDetailScreen.tsx#L299) | 返回 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9e04abff0ea7<br>[components/products/ProductDetailScreen.tsx:303:16](../../components/products/ProductDetailScreen.tsx#L303) | ${product.name} | **動態文字入口** · 執行時綁定入口<br>h1 接收執行時文字；內容需追查所列綁定與生產端 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-af6cc0bd1fd6<br>[components/products/ProductDetailScreen.tsx:306:16](../../components/products/ProductDetailScreen.tsx#L306) | ${categoryStyle.text} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c20de2269537<br>[components/products/ProductDetailScreen.tsx:315:64](../../components/products/ProductDetailScreen.tsx#L315) | 商品摘要 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7f5a3f5fafe7<br>[components/products/ProductDetailScreen.tsx:332:39](../../components/products/ProductDetailScreen.tsx#L332) | 販售中 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>product.isActive |
| UI-fddfac8b9318<br>[components/products/ProductDetailScreen.tsx:332:47](../../components/products/ProductDetailScreen.tsx#L332) | 已停用 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>否則 product.isActive |
| UI-f219308953e0<br>[components/products/ProductDetailScreen.tsx:335:20](../../components/products/ProductDetailScreen.tsx#L335) | ${categoryStyle.text} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9701d953a1b4<br>[components/products/ProductDetailScreen.tsx:338:65](../../components/products/ProductDetailScreen.tsx#L338) | 售價 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-db40acb20bd8<br>[components/products/ProductDetailScreen.tsx:349:65](../../components/products/ProductDetailScreen.tsx#L349) | 成本 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>canShowSensitiveProductData |
| UI-aa2d5d25c275<br>[components/products/ProductDetailScreen.tsx:351:68](../../components/products/ProductDetailScreen.tsx#L351) | - | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>canShowSensitiveProductData → 否則 product.cost |
| UI-c126163be29c<br>[components/products/ProductDetailScreen.tsx:355:65](../../components/products/ProductDetailScreen.tsx#L355) | 利潤率 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>canShowSensitiveProductData |
| UI-826660fb6e37<br>[components/products/ProductDetailScreen.tsx:357:46](../../components/products/ProductDetailScreen.tsx#L357) | - | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>canShowSensitiveProductData → profitMargin === null |
| UI-98802a9eb1f2<br>[components/products/ProductDetailScreen.tsx:357:52](../../components/products/ProductDetailScreen.tsx#L357) | ${profitMargin}% | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>canShowSensitiveProductData → 否則 profitMargin === null |
| UI-5d0b1bbd2d1d<br>[components/products/ProductDetailScreen.tsx:364:61](../../components/products/ProductDetailScreen.tsx#L364) | 庫存 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9239cf66f3c9<br>[components/products/ProductDetailScreen.tsx:365:80](../../components/products/ProductDetailScreen.tsx#L365) | ${stockLabel} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cfbb56a325e3<br>[components/products/ProductDetailScreen.tsx:368:61](../../components/products/ProductDetailScreen.tsx#L368) | 已售出 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b84d7129f731<br>[components/products/ProductDetailScreen.tsx:379:15](../../components/products/ProductDetailScreen.tsx#L379) | 編輯與管理 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ProductDetailScreen<br>canEditProductActions |
| UI-794511fd2697<br>[components/products/ProductDetailScreen.tsx:387:70](../../components/products/ProductDetailScreen.tsx#L387) | 商品描述 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>product.description |
| UI-ee363cc70cd0<br>[components/products/ProductDetailScreen.tsx:389:16](../../components/products/ProductDetailScreen.tsx#L389) | ${product.description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | ProductDetailScreen<br>product.description |

## components/products/ProductFormFields.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-1a2a9e8f3c5e<br>[components/products/ProductFormFields.tsx:31:31](../../components/products/ProductFormFields.tsx#L31) | 手作 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PRODUCT_CATEGORIES · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-354f3b708107<br>[components/products/ProductFormFields.tsx:32:27](../../components/products/ProductFormFields.tsx#L32) | 食品 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PRODUCT_CATEGORIES · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-718632a2d956<br>[components/products/ProductFormFields.tsx:33:32](../../components/products/ProductFormFields.tsx#L33) | 飾品 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PRODUCT_CATEGORIES · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-64e751fb1a09<br>[components/products/ProductFormFields.tsx:34:31](../../components/products/ProductFormFields.tsx#L34) | 服飾 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PRODUCT_CATEGORIES · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-172df2c02333<br>[components/products/ProductFormFields.tsx:35:26](../../components/products/ProductFormFields.tsx#L35) | 藝術品 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PRODUCT_CATEGORIES · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0a681002c9c0<br>[components/products/ProductFormFields.tsx:36:33](../../components/products/ProductFormFields.tsx#L36) | 文具 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PRODUCT_CATEGORIES · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3a436464cda1<br>[components/products/ProductFormFields.tsx:37:28](../../components/products/ProductFormFields.tsx#L37) | 其他 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PRODUCT_CATEGORIES · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3f61ff1331c0<br>[components/products/ProductFormFields.tsx:70:13](../../components/products/ProductFormFields.tsx#L70) | 基本資料 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | ProductFormFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e698ba245895<br>[components/products/ProductFormFields.tsx:77:19](../../components/products/ProductFormFields.tsx#L77) | 商品名稱 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | ProductFormFields · label<br>!isManagerMode |
| UI-2ee1054bec35<br>[components/products/ProductFormFields.tsx:96:56](../../components/products/ProductFormFields.tsx#L96) | 分類 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | ProductFormFields · label<br>!isManagerMode |
| UI-656ea87bd5c2<br>[components/products/ProductFormFields.tsx:101:28](../../components/products/ProductFormFields.tsx#L101) | 商品分類 | **輔助辨識** · 直接呈現定義<br>提供 div 的讀屏名稱、圖片替代文字或滑入說明 | ProductFormFields · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bb18ff1e635f<br>[components/products/ProductFormFields.tsx:126:30](../../components/products/ProductFormFields.tsx#L126) | ${option.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | ProductFormFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-abc09e763e8c<br>[components/products/ProductFormFields.tsx:138:19](../../components/products/ProductFormFields.tsx#L138) | 售價（元） | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | ProductFormFields · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e03f2665cdcf<br>[components/products/ProductFormFields.tsx:160:21](../../components/products/ProductFormFields.tsx#L160) | 成本（元） | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | ProductFormFields · label<br>!isManagerMode |
| UI-0075589dd009<br>[components/products/ProductFormFields.tsx:161:20](../../components/products/ProductFormFields.tsx#L161) | 只有老闆可查看與修改 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | ProductFormFields · hint<br>!isManagerMode |
| UI-53ee332eb2f6<br>[components/products/ProductFormFields.tsx:185:13](../../components/products/ProductFormFields.tsx#L185) | 庫存與說明 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | ProductFormFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3925bc427322<br>[components/products/ProductFormFields.tsx:200:77](../../components/products/ProductFormFields.tsx#L200) | 不限庫存 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductFormFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-faac918c8716<br>[components/products/ProductFormFields.tsx:207:23](../../components/products/ProductFormFields.tsx#L207) | 庫存數量 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | ProductFormFields · label<br>!values.unlimitedStock |
| UI-931a1c84da69<br>[components/products/ProductFormFields.tsx:227:59](../../components/products/ProductFormFields.tsx#L227) | 商品描述（選填） | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | ProductFormFields · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/deployment/web-production-config.ts

未追到正式頁面引用（待核對動態接線／保留碼）

同檔旗標（不代表每列均受它控制）：`NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_APP_BUILD_TIME`、`NEXT_PUBLIC_APP_COMMIT_SHA`、`NEXT_PUBLIC_APP_ENV`、`NEXT_PUBLIC_APP_VERSION`、`NEXT_PUBLIC_DEBUG_MODE`、`NEXT_PUBLIC_SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_ALLOW_PRODUCTION`、`NEXT_PUBLIC_SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_ENABLED`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_SUPABASE_URL`。

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-00b77f3bc861<br>[lib/deployment/web-production-config.ts:158:7](../../lib/deployment/web-production-config.ts#L158) | Supabase public URL is a non-placeholder HTTPS origin. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5d20b17b89cf<br>[lib/deployment/web-production-config.ts:159:7](../../lib/deployment/web-production-config.ts#L159) | Set a non-placeholder HTTPS Supabase origin without credentials, path, query, or fragment. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3f8dedea3b84<br>[lib/deployment/web-production-config.ts:164:7](../../lib/deployment/web-production-config.ts#L164) | Supabase browser key is present and non-placeholder. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e41852888a03<br>[lib/deployment/web-production-config.ts:165:7](../../lib/deployment/web-production-config.ts#L165) | Set the browser-compatible Supabase anon key required by the current Web client. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d96976d576ef<br>[lib/deployment/web-production-config.ts:174:7](../../lib/deployment/web-production-config.ts#L174) | Dedicated Supabase server secret matches the bounded key contract. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eb2ce4d85c06<br>[lib/deployment/web-production-config.ts:180:7](../../lib/deployment/web-production-config.ts#L180) | Legacy service-role fallback is absent. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fa037d1024ae<br>[lib/deployment/web-production-config.ts:186:7](../../lib/deployment/web-production-config.ts#L186) | CORS allowlist contains at least one exact HTTPS origin and no wildcard. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c99c69992e4c<br>[lib/deployment/web-production-config.ts:187:7](../../lib/deployment/web-production-config.ts#L187) | Set exact production HTTPS origins; wildcard, null, credentials, path, query, and fragment are forbidden. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-830a0b67e251<br>[lib/deployment/web-production-config.ts:192:7](../../lib/deployment/web-production-config.ts#L192) | Public app environment is production. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f2ae997e8b18<br>[lib/deployment/web-production-config.ts:198:7](../../lib/deployment/web-production-config.ts#L198) | Optional API base URL is absent or valid HTTPS. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1d2075262966<br>[lib/deployment/web-production-config.ts:199:7](../../lib/deployment/web-production-config.ts#L199) | Remove the Web API base override or set a stable HTTPS URL without credentials, query, or fragment. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-45e3d4eacf5e<br>[lib/deployment/web-production-config.ts:208:7](../../lib/deployment/web-production-config.ts#L208) | Version, commit SHA, and build time resolve from the build contract. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fd9d91e8fdb2<br>[lib/deployment/web-production-config.ts:209:7](../../lib/deployment/web-production-config.ts#L209) | Provide valid metadata overrides or preserve package, Vercel/Git SHA, and build-time fallbacks. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eb61db7bbfb5<br>[lib/deployment/web-production-config.ts:214:7](../../lib/deployment/web-production-config.ts#L214) | Public support email passes the bounded contact contract. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7242339ab0db<br>[lib/deployment/web-production-config.ts:215:7](../../lib/deployment/web-production-config.ts#L215) | Set one real public support mailbox without display-name, mailto, query, whitespace, or placeholder syntax. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9212b7f2008b<br>[lib/deployment/web-production-config.ts:220:7](../../lib/deployment/web-production-config.ts#L220) | Public service operator name, representative, and business address are present. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9a6aa771e6c1<br>[lib/deployment/web-production-config.ts:221:7](../../lib/deployment/web-production-config.ts#L221) | Set the reviewed public operator name, representative, and business address required for launch disclosure. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e7685554788d<br>[lib/deployment/web-production-config.ts:226:7](../../lib/deployment/web-production-config.ts#L226) | Legal policies have a public effective date and a server-only approval date. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3fd2ec0d78b9<br>[lib/deployment/web-production-config.ts:227:7](../../lib/deployment/web-production-config.ts#L227) | Set the public effective date and server-only legal approval date after product and legal review. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7677a43f6ae1<br>[lib/deployment/web-production-config.ts:235:7](../../lib/deployment/web-production-config.ts#L235) | Debug, test-page, and subscription simulation controls are disabled. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2fc17b841344<br>[lib/deployment/web-production-config.ts:236:7](../../lib/deployment/web-production-config.ts#L236) | Disable every debug/test surface and subscription simulation in production. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-acb259baf4e0<br>[lib/deployment/web-production-config.ts:244:7](../../lib/deployment/web-production-config.ts#L244) | Unapproved account-deletion runtime, repository, production allow, and HMAC secret are absent. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-38bd4b370313<br>[lib/deployment/web-production-config.ts:245:7](../../lib/deployment/web-production-config.ts#L245) | Keep every account-deletion runtime flag at 0 and its HMAC secret absent until AD3/AD5 approval. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-db062a1a2bde<br>[lib/deployment/web-production-config.ts:252:7](../../lib/deployment/web-production-config.ts#L252) | Fault injection is disabled and all temporary scope values are cleared. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7fb8d1267bd5<br>[lib/deployment/web-production-config.ts:253:7](../../lib/deployment/web-production-config.ts#L253) | Disable fault injection and remove every token, actor, market, sale, and automatic-mode value. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-83c266b84045<br>[lib/deployment/web-production-config.ts:259:7](../../lib/deployment/web-production-config.ts#L259) | Sales-evidence client runtime is explicitly enabled for production. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3e5f4f5069c5<br>[lib/deployment/web-production-config.ts:260:7](../../lib/deployment/web-production-config.ts#L260) | Enable both sales-evidence client runtime flags only after staging evidence is approved. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-58da2b749afb<br>[lib/deployment/web-production-config.ts:265:7](../../lib/deployment/web-production-config.ts#L265) | Sales-evidence server routes and production allow gates are enabled. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ef95cd475487<br>[lib/deployment/web-production-config.ts:266:7](../../lib/deployment/web-production-config.ts#L266) | Every sales-evidence server route requires both its enabled and production-allow gate. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2fb2402b5c9d<br>[lib/deployment/web-production-config.ts:274:7](../../lib/deployment/web-production-config.ts#L274) | Expiration route and bounded cron authorization are configured. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1770ca029959<br>[lib/deployment/web-production-config.ts:275:7](../../lib/deployment/web-production-config.ts#L275) | Enable both expiration gates and set a trimmed 32-1024 character server-only cron secret. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-53a653f7e7f9<br>[lib/deployment/web-production-config.ts:288:7](../../lib/deployment/web-production-config.ts#L288) | Private R2 credentials, bucket, and optional endpoint pass structural validation. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2e7184014163<br>[lib/deployment/web-production-config.ts:289:7](../../lib/deployment/web-production-config.ts#L289) | Set non-placeholder private R2 values and an optional HTTPS origin endpoint. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2d7c2053d27c<br>[lib/deployment/web-production-config.ts:298:7](../../lib/deployment/web-production-config.ts#L298) | Product-cover read, upload, delete, and production allow gates are enabled. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7252382df186<br>[lib/deployment/web-production-config.ts:299:7](../../lib/deployment/web-production-config.ts#L299) | Enable the complete product-cover route set only after its production smoke is approved. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-806c81658c2d<br>[lib/deployment/web-production-config.ts:304:7](../../lib/deployment/web-production-config.ts#L304) | Product-cover writes require paid entitlement for the paid launch. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6aa0b89bae84<br>[lib/deployment/web-production-config.ts:310:7](../../lib/deployment/web-production-config.ts#L310) | Product-cover account quota is an explicit safe integer. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-905f83fe94a9<br>[lib/deployment/web-production-config.ts:311:7](../../lib/deployment/web-production-config.ts#L311) | Set an integer product-cover account byte limit of at least 750000. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-53cb29d17352<br>[lib/deployment/web-production-config.ts:317:7](../../lib/deployment/web-production-config.ts#L317) | Remove secret, service-role, access-key, cron, and fault-token values from public variables. | **來源候選** · 候選，非已證實提示<br>checks 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checks<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1d790ba98298<br>[lib/deployment/web-production-config.ts:332:71](../../lib/deployment/web-production-config.ts#L332) | NOT READY | **來源候選** · 候選，非已證實提示<br>lines 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | lines<br>否則 report.ready |
| UI-e91263b5fa92<br>[lib/deployment/web-production-config.ts:338:14](../../lib/deployment/web-production-config.ts#L338) | No environment values were printed. | **來源候選** · 候選，非已證實提示<br>formatWebProductionConfigReport 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatWebProductionConfigReport<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/navigation/market-product-return.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-4abeb698b5d5<br>[lib/navigation/market-product-return.ts:26:24](../../lib/navigation/market-product-return.ts#L26) | 返回原場次銷售 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | resolveProductMarketReturn · label<br>id |

## lib/navigation/product-detail-route.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-0d5a6249b26c<br>[lib/navigation/product-detail-route.ts:13:25](../../lib/navigation/product-detail-route.ts#L13) | A product id is required to build a product detail URL. | **錯誤來源** · 文案生產端，須查使用端<br>TypeError：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | buildProductDetailHref<br>!normalizedProductId |

## lib/platform/product-image-adapter.web.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-9371d0ce3214<br>[lib/platform/product-image-adapter.web.ts:18:72](../../lib/platform/product-image-adapter.web.ts#L18) | image_decode_failed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | decode<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8161dc93f85d<br>[lib/platform/product-image-adapter.web.ts:33:35](../../lib/platform/product-image-adapter.web.ts#L33) | image_processing_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | render<br>!context |
| UI-7e981d449810<br>[lib/platform/product-image-adapter.web.ts:44:19](../../lib/platform/product-image-adapter.web.ts#L44) | image_cannot_be_compressed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | render<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7445d27cdc96<br>[lib/platform/product-image-adapter.web.ts:48:87](../../lib/platform/product-image-adapter.web.ts#L48) | unsupported_image_type | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | prepare<br>!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) |
| UI-5bf9ec7c6ca6<br>[lib/platform/product-image-adapter.web.ts:49:95](../../lib/platform/product-image-adapter.web.ts#L49) | source_image_too_large | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | prepare<br>file.size &lt; 1 &#124;&#124; file.size &gt; PRODUCT_COVER_PHOTO_POLICY.maxSourceBytes |
| UI-2d1b11ea3bac<br>[lib/platform/product-image-adapter.web.ts:52:102](../../lib/platform/product-image-adapter.web.ts#L52) | source_image_dimensions_too_large | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | prepare<br>decoded.width * decoded.height &gt; PRODUCT_COVER_PHOTO_POLICY.maxSourcePixels |

## lib/products/product-form.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-204cf74b5341<br>[lib/products/product-form.ts:53:19](../../lib/products/product-form.ts#L53) | 請輸入商品名稱 | **來源候選** · 候選，非已證實提示<br>validateProductForm 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validateProductForm<br>requireIdentity &amp;&amp; !values.name.trim() |
| UI-cbedec988490<br>[lib/products/product-form.ts:57:20](../../lib/products/product-form.ts#L57) | 售價必須大於 0 | **來源候選** · 候選，非已證實提示<br>validateProductForm 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validateProductForm<br>!Number.isFinite(values.price) &#124;&#124; values.price &lt;= 0 |
| UI-28c555eddd2b<br>[lib/products/product-form.ts:61:19](../../lib/products/product-form.ts#L61) | 成本不可小於 0 | **來源候選** · 候選，非已證實提示<br>validateProductForm 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validateProductForm<br>requireIdentity &amp;&amp; (!Number.isFinite(values.cost) &#124;&#124; values.cost &lt; 0) |
| UI-17a7615b8dd1<br>[lib/products/product-form.ts:65:20](../../lib/products/product-form.ts#L65) | 庫存不可小於 0 | **來源候選** · 候選，非已證實提示<br>validateProductForm 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validateProductForm<br>!values.unlimitedStock &amp;&amp; (!Number.isFinite(values.stock) &#124;&#124; values.stock &lt; 0) |

## lib/products/product-list-view-model.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-cff2e0149074<br>[lib/products/product-list-view-model.ts:38:42](../../lib/products/product-list-view-model.ts#L38) | 已停用 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getProductStockState · label<br>!product.isActive |
| UI-c5038a590aba<br>[lib/products/product-list-view-model.ts:39:47](../../lib/products/product-list-view-model.ts#L39) | 不限庫存 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getProductStockState · label<br>product.unlimitedStock |
| UI-8c85400c702f<br>[lib/products/product-list-view-model.ts:42:36](../../lib/products/product-list-view-model.ts#L42) | 已售完 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getProductStockState · label<br>stock === 0 |
| UI-dced2f48ae37<br>[lib/products/product-list-view-model.ts:43:35](../../lib/products/product-list-view-model.ts#L43) | 庫存 ${stock} | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getProductStockState · label<br>stock &lt;= 5 |
| UI-251e698e730c<br>[lib/products/product-list-view-model.ts:44:19](../../lib/products/product-list-view-model.ts#L44) | 庫存 ${stock} | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getProductStockState · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
