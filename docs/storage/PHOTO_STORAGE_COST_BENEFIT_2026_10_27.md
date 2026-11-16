# 照片儲存成本與效益比較：Supabase Storage／Cloudflare R2

核對日期：2026-10-27。金額為美元／月，不含稅、匯差、其他服務與一次性開發工時。這份紀錄沒有啟動遷移，也沒有更改儲存供應商或訂閱額度。

## 決策

以目前 App 已具備的 R2 流程、照片壓縮方式與預期擴張需求，保留 R2。沒有證據顯示 Supabase 的整體效益足以抵銷遷移與重新驗收成本，因此使用者「若 Supabase 更合適才遷移」的條件尚未成立。

Supabase 若已因資料庫需求付費 Pro，而且儲存與流量尚有額度，Storage 可以是零增額成本；不能把整筆25美元都當成照片費用。但 R2 在小用量也可能零增額成本，較大用量時又有下載流量優勢。不能單看100GB內含空間即斷定應搬移。

## 官方費率

| 項目 | R2 Standard | Supabase Free | Supabase Pro |
| --- | --- | --- | --- |
| 儲存服務門檻 | 按量計費，含免費額度 | 0 | 平台方案25美元起，並非照片專用費 |
| 儲存內含額度 | 10 GB-month／月 | 1 GB | 100 GB |
| 超額儲存 | 0.015／GB-month | 超額需依平台限制處理，不能直接套Pro單價 | 0.0213／GB-month |
| 對外下載 | R2不收egress；其他服務另計 | 未快取5GB、快取5GB，分別計算 | 未快取250GB、快取250GB，分別計算 |
| 超額下載 | R2不收egress | 非無限使用 | 未快取0.09／GB；快取0.03／GB |
| 寫／列舉請求 | A類每月100萬內含，超額4.50／百萬 | 依方案API／流量條件 | 依方案API／流量條件 |
| 讀取請求 | B類每月1000萬內含，超額0.36／百萬 | 依方案API／流量條件 | 依方案API／流量條件 |

額度不是每個App使用者各一份。Supabase的資料庫、Auth、Storage等服務共用組織egress額度；快取與未快取額度不能任意互抵。R2有計費單位進位，Standard的免費額度不適用Infrequent Access。

來源：[R2定價](https://developers.cloudflare.com/r2/pricing/)、[Supabase定價](https://supabase.com/pricing)、[Supabase流量計費](https://supabase.com/docs/guides/platform/manage-your-usage/egress)。

## 示意帳單

假設整月平均用量如下，R2 A類不超過100萬、B類不超過1000萬；下載全為未快取，無其他服務占用Supabase額度。不是實際帳單或用戶數預測。

| 月均儲存／月下載 | R2儲存與流量 | Supabase已付Pro的增額 | 為此新升Pro的基本方案加超額 |
| --- | ---: | ---: | ---: |
| 10GB／100GB | 0 | 0 | 25 |
| 100GB／1000GB | 1.35 | 67.50 | 92.50 |

第二列：R2=(100−10)×0.015；Supabase儲存在內含額度內，egress=(1000−250)×0.09。若1000GB全為快取命中，Supabase下載超額為22.50，新增基本方案後47.50。實際快取命中率、其他服務與compute大小會改變結果。

兩家免費方案在1GB儲存、未快取下載不超5GB且其他用量也在額度內時，都可能不用另付費。這不表示可無限制儲存或瀏覽。

## 專案實際接線與維護效益

- 商品照片：`lib/products/product-cover-photo-r2.server.ts`使用R2 S3 API。共用照片規則限制展示圖600000 bytes、縮圖150000 bytes，兩者合計上限750000 bytes；不是每張原圖25MB直接存雲端。1GB約能容納1333組上限大小的商品封面，10GB約13333組；僅為容量換算，不是方案承諾，成交照片及其他檔案另計。
- 成交照片：`lib/sales/photo-evidence-r2-upload-adapter.server.ts`／read adapter接R2；目前model有7天保留規則。保留規則存在不能代替雲端清理排程成功與實體刪除驗證。
- 圖片資料由Supabase保管，包含owner／角色、版本、上傳狀態、額度與保留狀態；更換檔案供應商仍須維持這些規則。083的RPC簽章與版本範圍問題仍須修復，搬移檔案不會修復資料庫契約。
- 商品圖片GET route由Vercel API驗證後回傳binary，Cache-Control為private,max-age=3600；成交照片為private,no-store。因此R2雖免egress，Vercel傳輸與Functions仍可能有費用。將相同代理路徑的底層換成Supabase，不會自動消除Vercel成本。
- Supabase的實際優勢是同一平台管理、Auth／RLS整合及私有桶／簽名URL；仍須實作owner／staff及方案規則，不能改公開桶來省事。若要避免代理binary，需要另設短效授權下載策略與權限撤銷驗證，屬另一個設計切片，這次未實作。
- 沒有量測兩者在相同地區／手機網路下的延遲，不能宣稱其中一方一定更快。兩者都可以供Web／iOS／Android使用，供應商差異留在server adapter，業務規則不需隨供應商搬家。
- Supabase資料庫備份不包含Storage檔案本體；整合到同平台不等於照片自動納入資料庫還原。

來源：[Supabase RLS](https://supabase.com/docs/guides/storage/security/access-control)、[私有檔案下載](https://supabase.com/docs/guides/storage/serving/downloads)、[資料庫備份範圍](https://supabase.com/docs/guides/platform/backups)、[Vercel傳輸計費](https://vercel.com/docs/manage-cdn-usage)。上述費用判斷依目前程式接線推論，不是負載測試結果。

## 本輪唯讀用量盤點的限制

[安全摘要](PHOTO_STORAGE_USAGE_SNAPSHOT_2026_10_27.json)沒有金鑰、物件名稱或使用者身份。只做GET／SELECT／list，未下載照片、移動或刪除檔案。

- Supabase照片metadata有23筆成交照片狀態（10 uploaded、12 expired、1 upload_failed）；recorded file_size_bytes總和約5.90MB，可能漏縮圖、包含過期紀錄，不能當實體容量或月帳單。
- 本機設定的R2桶列舉為空、Supabase Storage桶0個。尚未核對本機R2桶是否與正式Vercel一致，不能據此斷言正式照片不存在或正式儲存用量0。
- 沒有取得組織帳單、現行Supabase Free／Pro、Cloudflare全帳號額度餘量、月請求／egress、Vercel圖片流量。因此示例分成「已付Pro」與「新增Pro」，不臆測現有訂閱。

## 後續優先順序與未來遷移條件

1. 繼續083／084及既有線上驗收，確認商品照片真實保存與重讀。這次不更換供應商、不變動付費功能或照片保留政策。
2. 有實際月流量後核對兩邊儀表板帳單與production bucket，先確認Vercel代理傳輸、縮圖與重複下載的占比。這是後續建議，沒有建立排程或自動通知。
3. 若日後已付Pro、照片長期在內含額度、管理兩個平台造成可量化負擔，再評估整合。遷移須維持私有存取、先複製並逐物件驗證hash／大小、保留來源與回復路徑、處理新增上傳及刪除競態，再切換讀寫；原R2檔案不自動刪除。成交照片到期語意不能因搬移被延長。

### 後續補充

同日已獲使用者授權從Chrome進入Supabase Dashboard，專案對應的組織徽章顯示Free。這是後續實際核對，原先用量摘要的「未核對方案」保留其盤點當下狀態。083／085完成後，R2照片已實際保存並可重讀，因此這次問題不需要搬移Storage解決；正式月帳單、R2 production桶對照與Vercel總傳輸用量仍未取得。
