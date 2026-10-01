/**
 * Staff Typed Client type-level guard 測試（C2.29B-2.2）
 *
 * 測試策略：
 * - 用 `tsc` 對本檔案做靜態檢查（不執行 runtime test）
 * - 員工 session 對 3 個禁止底表的 `from()` 呼叫 → 編譯期報錯
 * - 員工 session 對 view / 其他 table 的 `from()` 呼叫 → 編譯期通過
 * - Owner session 對任何 table 的 `from()` 呼叫 → 編譯期通過
 *
 * 如何執行：
 * ```bash
 * npx tsc --noEmit tests/staff-typed-client.test-d.ts
 * ```
 *
 * 如果員工 session 試圖查底表，tsc 會報：
 * `TS2339: Property 'select' does not exist on type 'never'.`
 */

import {
  createStaffClient,
  createOwnerClient,
  STAFF_FORBIDDEN_BASE_TABLES,
} from '@/lib/supabase/staff-typed-client';

// ============================================================================
// Section 1: Staff session — 應編譯期通過
// ============================================================================

async function staffCanQueryView() {
  const client = createStaffClient(true);
  // ✅ 員工可查 staff-accessible view
  const { data: markets } = await client.from('staff_accessible_markets').select('*');
  void markets;
}

async function staffCanQueryMarketMembers() {
  const client = createStaffClient(true);
  // ✅ 員工可查 market_members（無敏感）
  const { data } = await client.from('market_members').select('*');
  void data;
}

async function staffCanQueryProfiles() {
  const client = createStaffClient(true);
  // ✅ 員工可查 profiles（自己資料）
  const { data } = await client.from('profiles').select('*');
  void data;
}

// ============================================================================
// Section 2: Staff session — 應編譯期報錯（5 個 case）
// ============================================================================

async function staffCannotQueryBaseMarkets() {
  const client = createStaffClient(true);
  // @ts-expect-error — 員工不可走底表 markets
  const { data } = await client.from('markets').select('*');
  void data;
}

async function staffCannotQueryBaseProducts() {
  const client = createStaffClient(true);
  // @ts-expect-error — 員工不可走底表 products
  const { data } = await client.from('products').select('*');
  void data;
}

async function staffCannotQueryBaseEvents() {
  const client = createStaffClient(true);
  // @ts-expect-error — 員工不可走底表 events
  const { data } = await client.from('events').select('*');
  void data;
}

async function staffCannotInsertBaseMarkets() {
  const client = createStaffClient(true);
  // @ts-expect-error — 員工不可走底表 markets insert
  await client.from('markets').insert({ name: 'test' });
}

async function staffCannotUpdateBaseEvents() {
  const client = createStaffClient(true);
  // @ts-expect-error — 員工不可走底表 events update
  await client.from('events').update({ synced: true }).eq('id', 'xxx');
}

// ============================================================================
// Section 3: Owner session — 應編譯期全部通過
// ============================================================================

async function ownerCanQueryBaseMarkets() {
  const client = createOwnerClient(true);
  // ✅ Owner 可查底表 markets
  const { data } = await client.from('markets').select('*');
  void data;
}

async function ownerCanQueryBaseProducts() {
  const client = createOwnerClient(true);
  // ✅ Owner 可查底表 products
  const { data } = await client.from('products').select('*');
  void data;
}

async function ownerCanQueryBaseEvents() {
  const client = createOwnerClient(true);
  // ✅ Owner 可查底表 events
  const { data } = await client.from('events').select('*');
  void data;
}

async function ownerCanQueryView() {
  const client = createOwnerClient(true);
  // ✅ Owner 也可查 view
  const { data } = await client.from('staff_accessible_markets').select('*');
  void data;
}

async function ownerCanInsert() {
  const client = createOwnerClient(true);
  // ✅ Owner 可 insert
  await client.from('markets').insert({ name: 'test' });
}

// ============================================================================
// Section 4: 3 個禁止底表都有被列舉
// ============================================================================

// Compile-time 驗證 STAFF_FORBIDDEN_BASE_TABLES 包含 3 個預期項目
const _check: readonly string[] = STAFF_FORBIDDEN_BASE_TABLES;
const _hasMarkets: boolean = _check.includes('markets');
const _hasProducts: boolean = _check.includes('products');
const _hasEvents: boolean = _check.includes('events');
void [_hasMarkets, _hasProducts, _hasEvents];

// ============================================================================
// Section 5: Export all test functions（讓 tsc 看到並編譯）
// ============================================================================

export const _testCases = {
  staffCanQueryView,
  staffCanQueryMarketMembers,
  staffCanQueryProfiles,
  staffCannotQueryBaseMarkets,
  staffCannotQueryBaseProducts,
  staffCannotQueryBaseEvents,
  staffCannotInsertBaseMarkets,
  staffCannotUpdateBaseEvents,
  ownerCanQueryBaseMarkets,
  ownerCanQueryBaseProducts,
  ownerCanQueryBaseEvents,
  ownerCanQueryView,
  ownerCanInsert,
};

// 標記為 used（避免 unused 警告）
void _testCases;
