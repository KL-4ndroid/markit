/**
 * 員工系統類型定義
 * 用於員工模式的權限控制和數據訪問
 */

// 訪問類型：老闆或員工
export type AccessType = 'owner' | 'staff';

// 員工權限設定
export type StaffPermissions = {
  can_view: boolean;
  can_edit: boolean;
};

// 帶有訪問權限的市集類型
export interface MarketWithAccess {
  // 原有的 market 欄位
  id: string;
  name: string;
  location?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  
  // 新增的權限欄位
  relationship_owner_id: string;  // 關係中的老闆 ID
  permissions: StaffPermissions;   // 權限設定
  access_type: AccessType;         // 訪問類型
}

// 帶有訪問權限的商品類型
export interface ProductWithAccess {
  // 原有的 product 欄位
  id: string;
  name: string;
  market_id: string;
  cost?: number;
  price?: number;
  stock?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  
  // 新增的權限欄位
  relationship_owner_id: string;  // 關係中的老闆 ID
  permissions: StaffPermissions;   // 權限設定
  access_type: AccessType;         // 訪問類型
}

// 員工關係記錄
export interface StaffRelationship {
  id: string;
  owner_id: string;           // 老闆的 user_id
  staff_id: string;           // 員工的 user_id
  staff_email: string;        // 員工的 Email
  status: 'pending' | 'active' | 'revoked';  // 狀態
  permissions: StaffPermissions;  // 權限設定
  invited_at: string;         // 邀請時間
  accepted_at?: string;       // 接受時間
  created_at: string;
  updated_at: string;
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
