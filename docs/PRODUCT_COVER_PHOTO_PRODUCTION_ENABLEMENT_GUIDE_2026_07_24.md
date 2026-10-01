# 商品封面照片正式啟用指南

日期：2026-07-24；S5 更新：2026-07-29
適用範圍：Supabase Production、Vercel Production、既有 Cloudflare R2 私有 bucket  
目標：訂閱功能上線前，開放所有具商品編輯權限的使用者使用商品封面照片；一般 staff 維持唯讀。

## 0. 啟用原則

1. 不要把任何 `SUPABASE_SECRET_KEY`、legacy service-role key 或 R2 密鑰貼到對話、Issue、文件或截圖。
2. migration 必須先於新版程式部署完成。
3. 現階段使用 `PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=open`，不需要建立 entitlement。
4. 未來經批准改為 `required` 時，BFF 會在 claim 前與 finalize 前檢查 migration 063 的 shared account capability。
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
  'public.claim_product_cover_photo_upload(uuid,uuid,uuid,integer,integer,bigint,boolean)'
) AS claim_rpc,
to_regprocedure(
  'public.delete_product_cover_photo(uuid,uuid)'
) AS delete_rpc;
```

預期結果：

- 兩個 table 都不是 `null`。
- `account_entitlements` 是 migration 062 的相容性 bridge；S5 application route 不再把它當成方案權威來源。
- index 清單包含 `product_cover_photos_one_active_per_product`。
- `claim_rpc` 與 `delete_rpc` 都不是 `null`。

## 2. 現階段不需要設定付費 owner

`PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=open` 時，owner 與具有商品編輯權限的 manager 可直接管理封面照片。一般 staff 只能查看。

Capability API 會回傳 `open_access`，不會把這個狀態宣稱為 Pro 或已付款。現階段不需要 `subscription_accounts` row，也不應為商品照片建立 `account_entitlements` row。

以下 UUID 與方案操作只保留給未來已批准的 `required` 模式測試，現階段請跳至第 4 節。

### 未來：找出付費測試帳戶的 owner UUID

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

## 3. 未來 required 模式才啟用指定 Pro／Team 帳戶

只有在 S4 production gates 與 `PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=required` 均獲批准時，才由受信任的維運人員執行本節 SQL。現階段不要為了商品照片手動建立付費狀態，也不要覆寫 billing 或 promotion 來源。

```sql
INSERT INTO public.subscription_accounts (
  owner_id,
  plan_code,
  plan_source,
  billing_status,
  entitlement_status,
  entitlement_ends_at,
  updated_at
)
VALUES (
  'replace-with-owner-uuid',
  'pro',
  'admin',
  'none',
  'active',
  NULL,
  pg_catalog.clock_timestamp()
)
ON CONFLICT (owner_id) DO UPDATE SET
  plan_code = EXCLUDED.plan_code,
  plan_source = EXCLUDED.plan_source,
  billing_status = EXCLUDED.billing_status,
  entitlement_status = EXCLUDED.entitlement_status,
  entitlement_ends_at = EXCLUDED.entitlement_ends_at,
  updated_at = pg_catalog.clock_timestamp();
```

驗證：

```sql
SELECT owner_id,
       plan_code,
       plan_source,
       billing_status,
       entitlement_status,
       entitlement_ends_at,
       updated_at
FROM public.subscription_accounts
WHERE owner_id = 'replace-with-owner-uuid';
```

將 admin 測試帳戶降回 Free 時，更新成完整的 Free shape，不要刪除既有照片：

```sql
UPDATE public.subscription_accounts
SET plan_code = 'free',
    plan_source = 'free',
    billing_status = 'none',
    entitlement_status = 'active',
    entitlement_ends_at = NULL,
    updated_at = pg_catalog.clock_timestamp()
WHERE owner_id = 'replace-with-owner-uuid'
  AND plan_source = 'admin';
```

降級後既有照片仍可查看與刪除，但不能新增或更換。

## 4. 核對 R2 與 Supabase server 環境變數

以下變數必須存在於 Vercel Production，且只能是 server-side 變數：

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SECRET_KEY
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
PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=open
```

說明：

- `READ_ENABLED`：允許讀取既有封面。
- `READ_ALLOW_PRODUCTION`：明確允許 Production 讀取。
- `UPLOAD_ENABLED`：允許具商品編輯權限的帳戶提出上傳。
- `UPLOAD_ALLOW_PRODUCTION`：明確允許 Production 上傳。
- `DELETE_ENABLED`：允許具商品管理權限者刪除封面。
- `MAX_ACCOUNT_BYTES`：每個 owner 的 server-side 安全上限；`25000000` 約為 25MB。
- `ENTITLEMENT_MODE=open`：正式訂閱 enforcement 上線前不檢查付費資格；未來經批准改成 `required` 才讀 shared account capability。

建議先套用至 Preview 驗證，再套用 Production。不要使用縮寫名稱 `READ_ALLOW_PRODUCTION` 或 `UPLOAD_ENABLED`；程式只讀取上述完整名稱。

## 6. 重新部署

修改 Vercel 環境變數後，既有 deployment 不會自動取得新值。請對包含商品封面功能的最新 commit 執行 Redeploy。

部署完成後先確認：

1. deployment 狀態為 Ready。
2. `/api/health` 正常。
3. 商品頁能正常載入，沒有整頁 500。
4. owner 與 manager 顯示「加入照片」。
5. 一般 staff 不可新增、更換或刪除照片。

## 7. Production smoke test

使用一般 owner 帳戶完成：

1. 新增商品並選擇一張 JPEG、PNG 或 WebP。
2. 確認商品建立不會被照片上傳失敗阻擋。
3. 確認列表顯示 4:3 縮圖。
4. 進入詳情，確認顯示較大版本。
5. 更換照片，確認上傳期間舊圖仍可讀取，完成後才切換新圖。
6. 刪除照片，確認列表與詳情都回到分類圖示。
7. 以 manager 與一般 staff 分別確認可編輯與唯讀邊界。

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
- `NEXT_PUBLIC_SUPABASE_URL` 與 `SUPABASE_SECRET_KEY` 是否存在。
- read/upload feature gates 是否使用完整名稱。
- migration 062 是否已套用到目前 deployment 連線的 Supabase 專案。

### 畫面仍顯示付費功能限制

確認 `PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=open` 已套用到目前 deployment，且變數修改後已重新部署。

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
- `PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=open` 已生效，不需要 `subscription_accounts` row。
- R2 維持 private 且 read/write smoke test 通過。
- owner、manager 與一般 staff 行為符合目前權限矩陣。
- 新增、更換、刪除、離線等待上傳均通過。
- Production logs 不包含 object key、service role key 或 R2 credentials。
- 確認回滾只需關閉 feature gates，不需要破壞資料。
