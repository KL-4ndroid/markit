/**
 * 員工系統類型定義
 * 用於員工模式的權限控制和數據訪問
 */

// 訪問類型：老闆或員工
export type AccessType = 'owner' | 'staff';

// 員工角色（P2：純型別，DB 欄位由 supabase/migrations/043_staff_role_foundation.sql 提供，
// production DB 尚未確認套用，因此所有 role 欄位為 optional，且 runtime 不讀取）
export type StaffRole = 'viewer' | 'operator' | 'manager';

// 員工權限設定
// 046 起：infoLevel 為選填 runtime 欄位，由 update_staff_role RPC 同步
//   viewer   → infoLevel=0
//   operator → infoLevel=2
//   manager  → infoLevel=2
// 不直接 import lib/permissions/PermissionGate 的 InfoLevel 以避免循環依賴
export type StaffPermissions = {
  can_view: boolean;
  can_edit: boolean;
  infoLevel?: 0 | 1 | 2 | 3;
};

// 帶有訪問權限的市集類型（匹配 staff_accessible_markets 視圖）
export interface MarketWithAccess {
  // 視圖返回的所有市場欄位
  id: string;
  name: string;
  location?: string;
  dates?: string[];           // ✅ 視圖可能返回
  start_date?: string;
  end_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  is_deleted?: boolean;

  // 市集狀態欄位（從 markets 表）
  status?: string;
  early_entry_enabled?: boolean;
  early_entry_time?: string;
  check_in_time?: string;
  operating_start_time?: string;
  operating_end_time?: string;
  registration_fee?: number;
  booth_cost?: number;
  total_revenue?: number;
  total_profit?: number;
  total_interactions?: number;
  total_deals?: number;

  // 權限欄位（視圖新增）
  owner_id: string;                 // 市集擁有者
  relationship_owner_id: string;     // 關係中的老闆 ID
  permissions: StaffPermissions;       // 權限設定
  access_type: AccessType;          // 訪問類型
}

// 帶有訪問權限的商品類型（匹配 staff_accessible_products 視圖）
export interface ProductWithAccess {
  // 視圖返回的所有商品欄位
  id: string;
  owner_id?: string;                // ✅ 商品擁有者
  market_id?: string;
  name: string;
  category?: string;
  price?: number;
  cost?: number;
  icon_name?: string;
  color_code?: string;
  stock?: number;
  unlimited_stock?: boolean;
  is_active?: boolean;
  is_shared?: boolean;
  total_sold?: number;
  description?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;

  // 權限欄位（視圖新增）
  relationship_owner_id: string;     // 關係中的老闆 ID
  permissions: StaffPermissions;      // 權限設定
  access_type: AccessType;          // 訪問類型
}

// 員工關係記錄
export interface StaffRelationship {
  id: string;
  owner_id: string;           // 老闆的 user_id
  staff_id: string;           // 員工的 user_id
  staff_email: string;        // 員工的 Email
  status: 'pending' | 'active' | 'revoked';  // 狀態
  permissions: StaffPermissions;  // 權限設定
  role?: StaffRole;           // ✅ P2：optional，待 production DB 套用 043 後才可被讀取
  invited_at?: string;        // ✅ 邀請時間
  accepted_at?: string;       // 接受時間
  created_at: string;
  updated_at: string;
}

// 帶有訪問權限的事件類型（匹配 staff_accessible_events 視圖）
export interface EventWithAccess {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  actor_id: string;
  market_id?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  relationship_owner_id?: string;
  access_type?: AccessType;
}

// 員工邀請表單數據
export interface StaffInviteForm {
  staff_email: string;
  permissions?: StaffPermissions;
}

// 員工列表項目（用於 UI 顯示）
export interface StaffListItem extends StaffRelationship {
  // 可以添加額外的 UI 相關欄位
  isLoading?: boolean;
  error?: string;
}
