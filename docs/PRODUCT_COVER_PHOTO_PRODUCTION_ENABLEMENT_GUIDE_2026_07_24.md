# 商品封面照片正式啟用指南

日期：2026-07-24  
適用範圍：Supabase Production、Vercel Production、既有 Cloudflare R2 私有 bucket  
目標：先開放指定付費測試帳戶，再逐步開放商品封面照片的讀取、上傳與刪除。

## 0. 啟用原則

1. 不要把任何 `SUPABASE_SERVICE_ROLE_KEY` 或 R2 密鑰貼到對話、Issue、文件或截圖。
2. migration 必須先於新版程式部署完成。
3. 缺少 entitlement 時系統預設拒絕上傳，不會把免費帳戶誤判成付費帳戶。
4. 先指定單一內部帳戶測試，再擴大 entitlement 名單。
5. 回滾時先關閉上傳；不要刪除資料表、metadata 或 R2 物件。

## 1. 套用 Supabase migration 062

在正確的 Supabase Production 專案中開啟 SQL Editor，執行完整檔案：

```text
supabase/migrations/062_add_product_cover_photos.sql
```

檔案已包含 `BEGIN` 與 `COMMIT`，請一次執行完整內容，不要只執行其中一段。

執行後使用以下唯讀 SQL 驗證：

```sql
SELECT to_regclass('public.account_entitlements') AS entitlement_table,
       to_regclass('public.product_cover_photos') AS photo_table;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'product_cover_photos'
ORDER BY indexname;

SELECT to_regprocedure(
  'public.claim_product_cover_photo_upload(uuid,uuid,uuid,integer,integer,bigint)'
) AS claim_rpc,
to_regprocedure(
  'public.delete_product_cover_photo(uuid,uuid)'
) AS delete_rpc;
```

預期結果：

- 兩個 table 都不是 `null`。
- index 清單包含 `product_cover_photos_one_active_per_product`。
- `claim_rpc` 與 `delete_rpc` 都不是 `null`。

## 2. 找出付費測試帳戶的 owner UUID

先以 email 找到帳戶 UUID。不要用員工 UUID；entitlement 必須掛在商品 owner 身上。

```sql
SELECT id, email, created_at
FROM auth.users
WHERE lower(email) = lower('replace-with-test-owner@example.com');
```

確認該 UUID 同時存在於 profile：

```sql
SELECT id
FROM public.profiles
WHERE id = 'replace-with-owner-uuid';
```

若 profile 不存在，先修復帳戶 profile 建立流程，不要略過外鍵或手動製造不一致資料。

## 3. 啟用指定付費帳戶

```sql
INSERT INTO public.account_entitlements (
  owner_id,
  product_cover_photo_enabled,
  source,
  updated_at
)
VALUES (
  'replace-with-owner-uuid',
  true,
  'admin',
  pg_catalog.clock_timestamp()
)
ON CONFLICT (owner_id) DO UPDATE SET
  product_cover_photo_enabled = EXCLUDED.product_cover_photo_enabled,
  source = EXCLUDED.source,
  updated_at = EXCLUDED.updated_at;
```

驗證：

```sql
SELECT owner_id, product_cover_photo_enabled, source, updated_at
FROM public.account_entitlements
WHERE owner_id = 'replace-with-owner-uuid';
```

暫停某帳戶新增／更換照片時，只要關閉 entitlement，不要刪除既有照片：

```sql
UPDATE public.account_entitlements
SET product_cover_photo_enabled = false,
    source = 'free',
    updated_at = pg_catalog.clock_timestamp()
WHERE owner_id = 'replace-with-owner-uuid';
```

降級後既有照片仍可查看與刪除，但不能新增或更換。

## 4. 核對 R2 與 Supabase server 環境變數

以下變數必須存在於 Vercel Production，且只能是 server-side 變數：

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

選用：

```text
R2_ENDPOINT
```

檢查事項：

- R2 bucket 維持 private，不要開 public URL。
- R2 API token 對指定 bucket 具備 Object Read and Write 權限。
- 不要新增任何 `NEXT_PUBLIC_R2_*` 變數。
- 商品照片與成交照片可以共用目前的私有 bucket，object key 前綴不同。

## 5. 設定商品照片 feature gates

在 Vercel 專案的 Settings > Environment Variables 新增以下完整名稱。值使用字串 `1`：

```text
PRODUCT_COVER_PHOTO_READ_ENABLED=1
PRODUCT_COVER_PHOTO_READ_ALLOW_PRODUCTION=1
PRODUCT_COVER_PHOTO_UPLOAD_ENABLED=1
PRODUCT_COVER_PHOTO_UPLOAD_ALLOW_PRODUCTION=1
PRODUCT_COVER_PHOTO_DELETE_ENABLED=1
PRODUCT_COVER_PHOTO_MAX_ACCOUNT_BYTES=25000000
```

說明：

- `READ_ENABLED`：允許讀取既有封面。
- `READ_ALLOW_PRODUCTION`：明確允許 Production 讀取。
- `UPLOAD_ENABLED`：允許符合 entitlement 的帳戶提出上傳。
- `UPLOAD_ALLOW_PRODUCTION`：明確允許 Production 上傳。
- `DELETE_ENABLED`：允許具商品管理權限者刪除封面。
- `MAX_ACCOUNT_BYTES`：每個 owner 的 server-side 安全上限；`25000000` 約為 25MB。

建議先套用至 Preview 驗證，再套用 Production。不要使用縮寫名稱 `READ_ALLOW_PRODUCTION` 或 `UPLOAD_ENABLED`；程式只讀取上述完整名稱。

## 6. 重新部署

修改 Vercel 環境變數後，既有 deployment 不會自動取得新值。請對包含商品封面功能的最新 commit 執行 Redeploy。

部署完成後先確認：

1. deployment 狀態為 Ready。
2. `/api/health` 正常。
3. 商品頁能正常載入，沒有整頁 500。
4. 免費帳戶顯示付費功能鎖定狀態。
5. 指定付費測試帳戶顯示「加入照片」。

## 7. Production smoke test

使用指定付費 owner 帳戶完成：

1. 新增商品並選擇一張 JPEG、PNG 或 WebP。
2. 確認商品建立不會被照片上傳失敗阻擋。
3. 確認列表顯示 4:3 縮圖。
4. 進入詳情，確認顯示較大版本。
5. 更換照片，確認上傳期間舊圖仍可讀取，完成後才切換新圖。
6. 刪除照片，確認列表與詳情都回到分類圖示。
7. 暫時關閉 entitlement，確認仍可查看／刪除，但不能重新加入或更換。

唯讀 metadata 驗證：

```sql
SELECT product_id,
       owner_id,
       status,
       version,
       display_size_bytes,
       thumbnail_size_bytes,
       width,
       height,
       pending_photo_id,
       last_error_code,
       updated_at,
       deleted_at
FROM public.product_cover_photos
WHERE owner_id = 'replace-with-owner-uuid'
ORDER BY updated_at DESC;
```

正常完成的目前封面應為：

- `status = 'uploaded'`
- `pending_photo_id IS NULL`
- display 不超過 600000 bytes
- thumbnail 不超過 150000 bytes
- 寬高都不超過 1600px

## 8. 問題判讀

### 顯示「商品照片目前無法使用」

檢查：

- deployment 是否在變數修改後重新部署。
- `NEXT_PUBLIC_SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY` 是否存在。
- read/upload feature gates 是否使用完整名稱。
- migration 062 是否已套用到目前 deployment 連線的 Supabase 專案。

### 顯示付費功能，但帳戶應為付費版

檢查 `account_entitlements.owner_id` 是否為商品 owner UUID，以及 `product_cover_photo_enabled` 是否為 `true`。

### 商品已建立，但照片等待上傳

這是預期的 fail-safe 行為。先確認商品事件已同步到雲端，再重新打開商品編輯頁；系統會重試本機保留的壓縮照片。接著檢查 R2 變數、容量上限與網路。

### 回傳 `storage_quota_exceeded`

帳戶已達 `PRODUCT_COVER_PHOTO_MAX_ACCOUNT_BYTES`。先確認是否存在應刪除的舊商品封面；不要未經評估直接取消容量限制。

## 9. 緊急回滾

第一步只關閉新上傳：

```text
PRODUCT_COVER_PHOTO_UPLOAD_ENABLED=0
```

重新部署後，既有照片仍可讀取與刪除。

若刪除路徑有問題，再關閉：

```text
PRODUCT_COVER_PHOTO_DELETE_ENABLED=0
```

只有讀取路徑本身不安全時才關閉：

```text
PRODUCT_COVER_PHOTO_READ_ENABLED=0
```

不要以 drop table、清除 metadata、刪除整個 R2 前綴或停用 Supabase RLS 作為回滾手段。

## 10. 完成條件

- migration 062 驗證通過。
- 至少一個指定付費 owner entitlement 正確。
- R2 維持 private 且 read/write smoke test 通過。
- 免費、付費、降級、owner、manager 與一般 staff 行為符合權限矩陣。
- 新增、更換、刪除、離線等待上傳均通過。
- Production logs 不包含 object key、service role key 或 R2 credentials。
- 確認回滾只需關閉 feature gates，不需要破壞資料。
