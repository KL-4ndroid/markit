# 商品與庫存：提示與介面文字

> 自動產生；請勿手動修改。重新產生：`node scripts/generate-ui-copy-inventory.mjs`。
> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)

共 201 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。

## app/products/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-a504655e6a7d<br>[app/products/page.tsx:59:28](../../app/products/page.tsx#L59) | 手作 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f4d9d4c9e68c<br>[app/products/page.tsx:60:24](../../app/products/page.tsx#L60) | 食品 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-59b60067caff<br>[app/products/page.tsx:61:29](../../app/products/page.tsx#L61) | 飾品 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b72dcbceb7b2<br>[app/products/page.tsx:62:28](../../app/products/page.tsx#L62) | 服飾 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eac2d16349ac<br>[app/products/page.tsx:63:23](../../app/products/page.tsx#L63) | 藝術 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b01879af919b<br>[app/products/page.tsx:64:30](../../app/products/page.tsx#L64) | 文具 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e4397cf14c00<br>[app/products/page.tsx:65:25](../../app/products/page.tsx#L65) | 其他 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | CATEGORY_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-75c444cc24f0<br>[app/products/page.tsx:196:33](../../app/products/page.tsx#L196) | 全部 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | tabs · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-44c3035b97a3<br>[app/products/page.tsx:254:19](../../app/products/page.tsx#L254) | 商品建立成功 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleAddSuccess<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-69fb2a53e6d9<br>[app/products/page.tsx:286:17](../../app/products/page.tsx#L286) | 本機資料庫無法正常存取 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · title<br>dbStatus.ok === false |
| UI-260921971053<br>[app/products/page.tsx:287:23](../../app/products/page.tsx#L287) | 可能是儲存空間不足、隱私模式或資料庫結構異常。你的雲端資料不會因此被刪除。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · description<br>dbStatus.ok === false |
| UI-ea6295e00b04<br>[app/products/page.tsx:291:63](../../app/products/page.tsx#L291) | 取得協助 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductsPageContent · action<br>dbStatus.ok === false |
| UI-5d3bf7f253ed<br>[app/products/page.tsx:292:84](../../app/products/page.tsx#L292) | 重新整理 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductsPageContent · action<br>dbStatus.ok === false |
| UI-80e3382aa39c<br>[app/products/page.tsx:303:15](../../app/products/page.tsx#L303) | 商品 | **畫面文字** · 直接呈現定義<br>WorkspacePageHeader：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2e1b4022478e<br>[app/products/page.tsx:304:32](../../app/products/page.tsx#L304) | 銷售商品 | **來源候選** · 候選，非已證實提示<br>ProductsPageContent 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ProductsPageContent · eyebrow<br>isStaffMode |
| UI-91ecae974597<br>[app/products/page.tsx:304:41](../../app/products/page.tsx#L304) | 商品管理 | **來源候選** · 候選，非已證實提示<br>ProductsPageContent 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ProductsPageContent · eyebrow<br>否則 isStaffMode |
| UI-452bf9505191<br>[app/products/page.tsx:310:21](../../app/products/page.tsx#L310) | 新增商品 | **畫面文字** · 直接呈現定義<br>IconButton：辨識可點擊操作、導覽或展開入口 | ProductsPageContent · label<br>!isStaffMode |
| UI-0b7b380eb5c5<br>[app/products/page.tsx:321:65](../../app/products/page.tsx#L321) | 搜尋商品 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | ProductsPageContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6af63a1e114b<br>[app/products/page.tsx:328:27](../../app/products/page.tsx#L328) | 搜尋商品名稱或描述 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | ProductsPageContent · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-50cdef68ec65<br>[app/products/page.tsx:335:28](../../app/products/page.tsx#L335) | 清除搜尋 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | ProductsPageContent · aria-label<br>searchQuery |
| UI-031893d39e8a<br>[app/products/page.tsx:348:25](../../app/products/page.tsx#L348) | 商品分類 | **畫面文字** · 直接呈現定義<br>Tabs：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · ariaLabel<br>tabs.length &gt; 1 |
| UI-09df70e9f3a1<br>[app/products/page.tsx:361:15](../../app/products/page.tsx#L361) | 顯示停用商品 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | ProductsPageContent<br>!isStaffMode |
| UI-9afc3ab61341<br>[app/products/page.tsx:364:75](../../app/products/page.tsx#L364) | 目前找到 ${filteredProducts.length} 項商品 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a0503074c5f2<br>[app/products/page.tsx:370:21](../../app/products/page.tsx#L370) | 商品 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>filteredProducts.length &gt; 0 |
| UI-50b1d128b86f<br>[app/products/page.tsx:371:21](../../app/products/page.tsx#L371) | 售價 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>filteredProducts.length &gt; 0 |
| UI-1560d56f4662<br>[app/products/page.tsx:372:21](../../app/products/page.tsx#L372) | 庫存 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>filteredProducts.length &gt; 0 |
| UI-a42e428b7d40<br>[app/products/page.tsx:373:21](../../app/products/page.tsx#L373) | 已售 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>filteredProducts.length &gt; 0 |
| UI-c03b3d059d0a<br>[app/products/page.tsx:374:50](../../app/products/page.tsx#L374) | 操作 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent<br>filteredProducts.length &gt; 0 |
| UI-b2322d43943e<br>[app/products/page.tsx:391:34](../../app/products/page.tsx#L391) | 找不到符合的商品 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · title<br>否則 filteredProducts.length &gt; 0 → searchQuery |
| UI-fc84ba8ad627<br>[app/products/page.tsx:391:47](../../app/products/page.tsx#L391) | 這個分類目前沒有商品 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · title<br>否則 filteredProducts.length &gt; 0 → 否則 searchQuery |
| UI-9dc8e7dc5a39<br>[app/products/page.tsx:392:40](../../app/products/page.tsx#L392) | 可清除搜尋或改用其他關鍵字。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · description<br>否則 filteredProducts.length &gt; 0 → searchQuery |
| UI-55e30cf8e28e<br>[app/products/page.tsx:392:73](../../app/products/page.tsx#L392) | 目前沒有可銷售的商品。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · description<br>否則 filteredProducts.length &gt; 0 → 否則 searchQuery → isStaffMode |
| UI-872affb5ef6b<br>[app/products/page.tsx:392:89](../../app/products/page.tsx#L392) | 新增商品後會顯示在這裡。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | ProductsPageContent · description<br>否則 filteredProducts.length &gt; 0 → 否則 searchQuery → 否則 isStaffMode |
| UI-b771f2723074<br>[app/products/page.tsx:394:80](../../app/products/page.tsx#L394) | 清除搜尋 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductsPageContent · action<br>否則 filteredProducts.length &gt; 0 → searchQuery |
| UI-6ace030e428b<br>[app/products/page.tsx:396:95](../../app/products/page.tsx#L396) | 新增商品 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductsPageContent · action<br>否則 filteredProducts.length &gt; 0 → 否則 searchQuery → !isStaffMode |

## components/products/AddProductForm.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-29221df8f4e1<br>[components/products/AddProductForm.tsx:71:22](../../components/products/AddProductForm.tsx#L71) | 商品已新增；照片已保留，待連線恢復後可再次上傳。 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | createValidatedProduct<br>coverPhoto → outcome === 'queued' |
| UI-612300e938f9<br>[components/products/AddProductForm.tsx:82:22](../../components/products/AddProductForm.tsx#L82) | 商品尚未建立，請確認連線後再試一次。 | **來源候選** · 候選，非已證實提示<br>createValidatedProduct 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createValidatedProduct<br>catch：操作拋出例外 |
| UI-0c8851289501<br>[components/products/AddProductForm.tsx:118:15](../../components/products/AddProductForm.tsx#L118) | 新增商品 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | AddProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-05d500d437e6<br>[components/products/AddProductForm.tsx:124:15](../../components/products/AddProductForm.tsx#L124) | 取消 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | AddProductForm · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-27481bdbc748<br>[components/products/AddProductForm.tsx:127:15](../../components/products/AddProductForm.tsx#L127) | 建立商品 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | AddProductForm · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-32a89548c956<br>[components/products/AddProductForm.tsx:150:16](../../components/products/AddProductForm.tsx#L150) | ${submitError} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | AddProductForm<br>submitError |
| UI-eedbc01bbaa7<br>[components/products/AddProductForm.tsx:160:15](../../components/products/AddProductForm.tsx#L160) | 以零庫存建立商品？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | AddProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cc6e3f797405<br>[components/products/AddProductForm.tsx:161:21](../../components/products/AddProductForm.tsx#L161) | 商品建立後會顯示為已售完，仍可稍後補上庫存。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | AddProductForm · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-23f406488f69<br>[components/products/AddProductForm.tsx:162:22](../../components/products/AddProductForm.tsx#L162) | 仍要建立 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | AddProductForm · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/products/EditProductForm.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-01a6c0aff8a0<br>[components/products/EditProductForm.tsx:110:22](../../components/products/EditProductForm.tsx#L110) | 商品資料已更新；照片已保留，待連線恢復後可再次上傳。 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | updateValidatedProduct<br>coverPhoto → outcome === 'queued' |
| UI-0c2d3f60e8b1<br>[components/products/EditProductForm.tsx:119:22](../../components/products/EditProductForm.tsx#L119) | 變更尚未儲存，請確認連線後再試一次。 | **來源候選** · 候選，非已證實提示<br>updateValidatedProduct 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | updateValidatedProduct<br>catch：操作拋出例外 |
| UI-b0ec7069b569<br>[components/products/EditProductForm.tsx:154:22](../../components/products/EditProductForm.tsx#L154) | 商品狀態尚未更新，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>handleToggleActive 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleToggleActive<br>catch：操作拋出例外 |
| UI-e7ce888bc0db<br>[components/products/EditProductForm.tsx:168:22](../../components/products/EditProductForm.tsx#L168) | 商品尚未刪除，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>handleDelete 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleDelete<br>catch：操作拋出例外 |
| UI-b1c44d8650ee<br>[components/products/EditProductForm.tsx:184:15](../../components/products/EditProductForm.tsx#L184) | 編輯商品 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d565ab306378<br>[components/products/EditProductForm.tsx:190:15](../../components/products/EditProductForm.tsx#L190) | 取消 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | EditProductForm · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6331f0e9079c<br>[components/products/EditProductForm.tsx:193:15](../../components/products/EditProductForm.tsx#L193) | 儲存變更 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | EditProductForm · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5e7c27fec0a5<br>[components/products/EditProductForm.tsx:220:15](../../components/products/EditProductForm.tsx#L220) | 商品狀態 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | EditProductForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b899fcb6d534<br>[components/products/EditProductForm.tsx:231:36](../../components/products/EditProductForm.tsx#L231) | 停用商品 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | EditProductForm<br>formData.isActive |
| UI-33c61250c2e0<br>[components/products/EditProductForm.tsx:231:45](../../components/products/EditProductForm.tsx#L231) | 啟用商品 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | EditProductForm<br>否則 formData.isActive |
| UI-9cc81bfe60b0<br>[components/products/EditProductForm.tsx:242:17](../../components/products/EditProductForm.tsx#L242) | 刪除商品 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | EditProductForm<br>!isManagerMode |
| UI-6af80788d08e<br>[components/products/EditProductForm.tsx:249:16](../../components/products/EditProductForm.tsx#L249) | ${submitError} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | EditProductForm<br>submitError |
| UI-4435d523679d<br>[components/products/EditProductForm.tsx:259:15](../../components/products/EditProductForm.tsx#L259) | 儲存為零庫存？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3728a8d1765d<br>[components/products/EditProductForm.tsx:260:21](../../components/products/EditProductForm.tsx#L260) | 儲存後商品會顯示為已售完，仍可稍後補上庫存。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a3aa08409837<br>[components/products/EditProductForm.tsx:261:22](../../components/products/EditProductForm.tsx#L261) | 仍要儲存 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-70d9af227241<br>[components/products/EditProductForm.tsx:268:15](../../components/products/EditProductForm.tsx#L268) | 停用這項商品？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e57623ac3936<br>[components/products/EditProductForm.tsx:269:21](../../components/products/EditProductForm.tsx#L269) | 停用後將不再出現於可銷售商品中，之後仍可重新啟用。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b3d23b2f771e<br>[components/products/EditProductForm.tsx:270:22](../../components/products/EditProductForm.tsx#L270) | 停用商品 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a47b227dadef<br>[components/products/EditProductForm.tsx:277:15](../../components/products/EditProductForm.tsx#L277) | 確認刪除商品？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4c426a06f33a<br>[components/products/EditProductForm.tsx:278:21](../../components/products/EditProductForm.tsx#L278) | 刪除後商品將無法繼續販售，此操作無法復原。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-13b350b9cad3<br>[components/products/EditProductForm.tsx:279:22](../../components/products/EditProductForm.tsx#L279) | 刪除商品 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | EditProductForm · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

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
| UI-c8602b7ee52d<br>[components/products/ProductDetailScreen.tsx:137:45](../../components/products/ProductDetailScreen.tsx#L137) | 手作 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-78efa61037d9<br>[components/products/ProductDetailScreen.tsx:138:43](../../components/products/ProductDetailScreen.tsx#L138) | 食品 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-371834044e78<br>[components/products/ProductDetailScreen.tsx:139:47](../../components/products/ProductDetailScreen.tsx#L139) | 飾品 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3829ec53de74<br>[components/products/ProductDetailScreen.tsx:140:48](../../components/products/ProductDetailScreen.tsx#L140) | 服飾 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3bd0eb61ec12<br>[components/products/ProductDetailScreen.tsx:141:38](../../components/products/ProductDetailScreen.tsx#L141) | 藝術品 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bb55dc7f8f03<br>[components/products/ProductDetailScreen.tsx:142:52](../../components/products/ProductDetailScreen.tsx#L142) | 文具 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ebc82a5a7133<br>[components/products/ProductDetailScreen.tsx:143:42](../../components/products/ProductDetailScreen.tsx#L143) | 其他 | **共用文案值** · 文案生產端，須查使用端<br>text：供畫面或訊息組裝使用的標籤／說明值 | styles · text<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-42140bc647cb<br>[components/products/ProductDetailScreen.tsx:150:19](../../components/products/ProductDetailScreen.tsx#L150) | 商品已更新 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleEditSuccess<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0e6a333109a6<br>[components/products/ProductDetailScreen.tsx:168:19](../../components/products/ProductDetailScreen.tsx#L168) | 商品已刪除 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleProductDeleted<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-59ae36b33303<br>[components/products/ProductDetailScreen.tsx:187:26](../../components/products/ProductDetailScreen.tsx#L187) | 返回商品列表 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | ProductDetailScreen · aria-label<br>dbStatus.ok === false |
| UI-c1a93186c5d4<br>[components/products/ProductDetailScreen.tsx:191:21](../../components/products/ProductDetailScreen.tsx#L191) | 返回 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-9810ac2136af<br>[components/products/ProductDetailScreen.tsx:194:15](../../components/products/ProductDetailScreen.tsx#L194) | 資料庫異常 | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-52f448e66bb2<br>[components/products/ProductDetailScreen.tsx:205:15](../../components/products/ProductDetailScreen.tsx#L205) | 本機資料庫無法正常存取 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-de0cabdf0342<br>[components/products/ProductDetailScreen.tsx:208:15](../../components/products/ProductDetailScreen.tsx#L208) | 系統無法讀取本地資料庫，可能因瀏覽器儲存空間不足、隱私模式，或資料庫結構損壞。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-7c46a03461cb<br>[components/products/ProductDetailScreen.tsx:212:17](../../components/products/ProductDetailScreen.tsx#L212) | 請保留這台裝置的資料，重新開啟頁面；若問題持續，可前往支援頁取得協助。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>dbStatus.ok === false → dbStatus.recoverable |
| UI-cb1b9dd896e7<br>[components/products/ProductDetailScreen.tsx:219:15](../../components/products/ProductDetailScreen.tsx#L219) | 取得協助 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-f9b0c4abe589<br>[components/products/ProductDetailScreen.tsx:225:15](../../components/products/ProductDetailScreen.tsx#L225) | 返回商品列表 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ProductDetailScreen<br>dbStatus.ok === false |
| UI-ab156828f008<br>[components/products/ProductDetailScreen.tsx:241:26](../../components/products/ProductDetailScreen.tsx#L241) | 返回商品列表 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | ProductDetailScreen · aria-label<br>!product |
| UI-dfb5b1bdeccd<br>[components/products/ProductDetailScreen.tsx:245:21](../../components/products/ProductDetailScreen.tsx#L245) | 返回 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>!product |
| UI-0692ab653c4a<br>[components/products/ProductDetailScreen.tsx:248:15](../../components/products/ProductDetailScreen.tsx#L248) | 找不到商品 | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>!product |
| UI-346aa5ff6a0a<br>[components/products/ProductDetailScreen.tsx:257:15](../../components/products/ProductDetailScreen.tsx#L257) | 找不到此商品 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>!product |
| UI-5a8de9e14efb<br>[components/products/ProductDetailScreen.tsx:260:15](../../components/products/ProductDetailScreen.tsx#L260) | 此商品可能已被刪除或不存在 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>!product |
| UI-d82118abaa6e<br>[components/products/ProductDetailScreen.tsx:266:15](../../components/products/ProductDetailScreen.tsx#L266) | 返回商品列表 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ProductDetailScreen<br>!product |
| UI-db547acd70f4<br>[components/products/ProductDetailScreen.tsx:279:47](../../components/products/ProductDetailScreen.tsx#L279) | 不限 | **來源候選** · 候選，非已證實提示<br>stockLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | stockLabel<br>product.unlimitedStock |
| UI-ef99676427fe<br>[components/products/ProductDetailScreen.tsx:288:24](../../components/products/ProductDetailScreen.tsx#L288) | 返回商品列表 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | ProductDetailScreen · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d9e3d712e815<br>[components/products/ProductDetailScreen.tsx:292:19](../../components/products/ProductDetailScreen.tsx#L292) | 返回 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-87aa978ae5b0<br>[components/products/ProductDetailScreen.tsx:296:16](../../components/products/ProductDetailScreen.tsx#L296) | ${product.name} | **動態文字入口** · 執行時綁定入口<br>h1 接收執行時文字；內容需追查所列綁定與生產端 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3336f4020ed0<br>[components/products/ProductDetailScreen.tsx:299:16](../../components/products/ProductDetailScreen.tsx#L299) | ${categoryStyle.text} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c7c62db1c493<br>[components/products/ProductDetailScreen.tsx:308:64](../../components/products/ProductDetailScreen.tsx#L308) | 商品摘要 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8896146456c4<br>[components/products/ProductDetailScreen.tsx:325:39](../../components/products/ProductDetailScreen.tsx#L325) | 販售中 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>product.isActive |
| UI-3cc8ed87ac5e<br>[components/products/ProductDetailScreen.tsx:325:47](../../components/products/ProductDetailScreen.tsx#L325) | 已停用 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>否則 product.isActive |
| UI-7219df80b95c<br>[components/products/ProductDetailScreen.tsx:328:20](../../components/products/ProductDetailScreen.tsx#L328) | ${categoryStyle.text} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d71a32966cb1<br>[components/products/ProductDetailScreen.tsx:331:65](../../components/products/ProductDetailScreen.tsx#L331) | 售價 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ebf61261daa4<br>[components/products/ProductDetailScreen.tsx:342:65](../../components/products/ProductDetailScreen.tsx#L342) | 成本 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>canShowSensitiveProductData |
| UI-30452f68f375<br>[components/products/ProductDetailScreen.tsx:344:68](../../components/products/ProductDetailScreen.tsx#L344) | - | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>canShowSensitiveProductData → 否則 product.cost |
| UI-669b0935c3e3<br>[components/products/ProductDetailScreen.tsx:348:65](../../components/products/ProductDetailScreen.tsx#L348) | 利潤率 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>canShowSensitiveProductData |
| UI-ab2acf5394bd<br>[components/products/ProductDetailScreen.tsx:350:46](../../components/products/ProductDetailScreen.tsx#L350) | - | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>canShowSensitiveProductData → profitMargin === null |
| UI-885d8ee93c7f<br>[components/products/ProductDetailScreen.tsx:350:52](../../components/products/ProductDetailScreen.tsx#L350) | ${profitMargin}% | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>canShowSensitiveProductData → 否則 profitMargin === null |
| UI-b3cbf161cee0<br>[components/products/ProductDetailScreen.tsx:357:61](../../components/products/ProductDetailScreen.tsx#L357) | 庫存 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e3293f6557a4<br>[components/products/ProductDetailScreen.tsx:358:80](../../components/products/ProductDetailScreen.tsx#L358) | ${stockLabel} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e3bf8e1d7df4<br>[components/products/ProductDetailScreen.tsx:361:61](../../components/products/ProductDetailScreen.tsx#L361) | 已售出 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ProductDetailScreen<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2e2da461a4fd<br>[components/products/ProductDetailScreen.tsx:372:15](../../components/products/ProductDetailScreen.tsx#L372) | 編輯與管理 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ProductDetailScreen<br>canEditProductActions |
| UI-306d34ae4fd3<br>[components/products/ProductDetailScreen.tsx:380:70](../../components/products/ProductDetailScreen.tsx#L380) | 商品描述 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | ProductDetailScreen<br>product.description |
| UI-acb4b708f467<br>[components/products/ProductDetailScreen.tsx:382:16](../../components/products/ProductDetailScreen.tsx#L382) | ${product.description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | ProductDetailScreen<br>product.description |

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

## lib/navigation/product-detail-route.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-3e8012aef60b<br>[lib/navigation/product-detail-route.ts:11:25](../../lib/navigation/product-detail-route.ts#L11) | A product id is required to build a product detail URL. | **錯誤來源** · 文案生產端，須查使用端<br>TypeError：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | buildProductDetailHref<br>!normalizedProductId |

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
