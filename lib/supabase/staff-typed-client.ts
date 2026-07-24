/**
 * Staff-Scoped Supabase Client（C2.29B-2.2 type-level guard）
 *
 * 設計目的：
 * - 在 TypeScript **編譯期**阻擋員工 session 對底表 `markets` / `products` / `events` 的查詢
 * - 防止未來新增的程式碼不小心讓員工走底表
 * - 對 Owner session 沒有任何限制（Owner 應可拿完整資料）
 *
 * 真正的安全防線仍是 **041 底表 RLS 收緊**（C2.29B-2.1）：
 * - 即使攻擊者改程式碼繞過 type check，RLS 仍會把員工的 direct SELECT 擋到 0 row
 * - 本檔案只是「編譯期 fail-fast」的第二層防線
 *
 * 設計原則：
 * - Conditional Return Type：呼叫端不需要做任何 runtime 標註
 *   `const client = createStaffClient(true).from('markets')` → 編譯期報錯
 * - Owner client：完全不檢查（既有 supabase client 行為不變）
 * - Staff client：`from('markets')` / `from('products')` / `from('events')` 回傳 `never`
 *   → 後續 `.select()/.insert()/.update()/.delete()` 全部都不可用
 *
 * 用法：
 * ```ts
 * import { createStaffClient, createOwnerClient } from '@/lib/supabase/staff-typed-client';
 *
 * // 員工 session
 * const client = createStaffClient(true);
 * await client.from('staff_accessible_markets').select('*');  // ✅ 編譯期通過
 * await client.from('markets').select('*');                    // ❌ 編譯期報錯
 *
 * // Owner session
 * const client = createOwnerClient(false);
 * await client.from('markets').select('*');  // ✅ 編譯期通過
 * ```
 *
 * 注意：
 * - 本檔案是 **編譯期**保護
 * - **DevTools 攻擊者仍可繞過**（自行改程式碼或直接呼叫 supabase client）
 * - 真正的安全防線仍是 Supabase RLS（041）
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseAuthStorage } from '@/lib/supabase/auth-storage-bridge';

/**
 * 員工 session 禁止查詢的底表清單（C2.29B-2.2）
 *
 * 為什麼是這 3 個：
 * - `markets`：含 `booth_cost` / `total_profit` / `commission_rate` 等敏感 financial fields
 * - `products`：含 `cost`
 * - `events`：含 `payload`（內含 `boothCost` / `cost` / `supplierInfo` 等敏感 key）
 *
 * 對應的 staff-accessible view：
 * - `staff_accessible_markets` / `staff_accessible_products` / `staff_accessible_events`（039 已建立）
 */
const STAFF_FORBIDDEN_BASE_TABLES = ['markets', 'products', 'events'] as const;
type StaffForbiddenBaseTable = (typeof STAFF_FORBIDDEN_BASE_TABLES)[number];

/**
 * Staff client 的型別簽名
 *
 * - 對禁止的底表：`from()` 直接回傳 `never`（任何後續操作都不可用）
 * - 對其他 table（`staff_accessible_*` / `market_members` / `profiles`）：維持原 `SupabaseClient` 行為
 *
 * Conditional Type 設計：
 * - `from()` 接受泛型 `TableName extends string`
 * - 若 `TableName extends StaffForbiddenBaseTable` → 回傳 `never`
 * - 否則 → 回傳原 Supabase client 的 from 結果
 *
 * 為什麼不用 intersection 而用 never：
 * - `never` 強制任何後續 chain（`.select()/.insert()/.update()/.delete()/.eq()`）都不可用
 * - 編譯期錯誤訊息：「Property 'X' does not exist on type 'never'」
 * - 攻擊者就算改程式碼也無法繞過（除非完全重寫 client）
 */
type StaffClient = Omit<SupabaseClient, 'from'> & {
  from<TableName extends string>(
    table: TableName
  ): TableName extends StaffForbiddenBaseTable
    ? never
    : ReturnType<SupabaseClient['from']>;
};

/**
 * 建立 Staff Session 的 Supabase Client
 *
 * @param isStaff 是否為員工（從 useUserRole 取得）
 * @returns 編譯期阻擋底表查詢的 typed client
 *
 * 注意：此 client 內部仍用同一個 Supabase session，**真正的安全靠 RLS**
 *       本函式只是提供編譯期 fail-fast
 */
export function createStaffClient(isStaff: boolean): StaffClient {
  if (!isStaff) {
    // 不應發生：非員工卻用 createStaffClient
    // 為避免 runtime 隱性 bug，這裡在 dev mode 警告
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[staff-typed-client] createStaffClient() called with isStaff=false. ' +
        'Use createOwnerClient() instead.'
      );
    }
  }
  return getBaseSupabaseClient() as unknown as StaffClient;
}

/**
 * 建立 Owner Session 的 Supabase Client（不限制）
 *
 * @param isOwner 是否為 owner（從 useUserRole 取得）
 * @returns 原始 Supabase client（完全不限制 table）
 */
export function createOwnerClient(_isOwner: boolean): SupabaseClient {
  return getBaseSupabaseClient();
}

/**
 * 取得 base Supabase client
 *
 * 為什麼要再包一層：
 * - 避免在 module 載入時就建立 client（測試環境可能沒有 env vars）
 * - 統一管理 isConfigured 檢查
 */
function getBaseSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured = !!(supabaseUrl && supabaseAnonKey);

  if (!isConfigured) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[staff-typed-client] Supabase env vars missing; using placeholder client.'
      );
    }
  }

  return createClient(
    isConfigured ? (supabaseUrl as string) : 'https://placeholder.supabase.co',
    isConfigured ? (supabaseAnonKey as string) : 'placeholder-anon-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: supabaseAuthStorage,
      },
    }
  );
}

/**
 * 導出常數供其他檔案使用
 */
export { STAFF_FORBIDDEN_BASE_TABLES };
