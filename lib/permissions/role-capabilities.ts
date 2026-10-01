/**
 * Role Capabilities 純 helper（P5-3）
 *
 * 設計目標：
 * - 從 (isOwner, staffRole) 推導 15 個 named capabilities
 * - 純函式，無副作用、無 React / hook 依賴
 * - 每次回傳新 object，避免外部 mutate 影響後續呼叫
 * - owner 由 isOwner=true 判斷（owner 不在 StaffRole union 內）
 * - 未知 / null / undefined staffRole 一律 fail-closed（全 false）
 *
 * 邊界聲明（§P5-1 §11.1 + §3.2 hard rules）：
 * - 本 helper 不接 UI，本階段（P5-3）沒有任何 component 消費它
 * - canEdit / canViewSensitiveData / infoLevel / PermissionGate / role-fail-closed
 *   行為完全不變
 * - operator / manager 在 P5-3 不開放任何 runtime 動作；
 *   helper 回傳的 true 僅描述「未來 P5-4+ 可能具備的能力」
 *
 * @module role-capabilities
 */

import type { StaffRole } from '@/types/staff';

/**
 * 員工（含 owner）所有可命名的操作能力。
 * 全部 boolean，預設 false（fail-closed）。
 */
export type RoleCapabilities = {
  // 員工日常紀錄（operator 起步）
  canRecordInteraction: boolean;
  canRecordDeal: boolean;
  canCreateFieldNote: boolean;
  canManageFieldNotes: boolean;

  // 基本資料管理（manager）
  canEditMarketBasic: boolean;
  canEditProductBasic: boolean;
  canManageChecklist: boolean;
  canToggleChecklistItem: boolean;

  // 員工自己當日紀錄（manager，future / gated）
  canEditOwnSameDayRecord: boolean;
  canDeleteOwnSameDayRecord: boolean;

  // owner-only
  canManageStaff: boolean;
  canChangeStaffRole: boolean;
  canViewOwnerFinance: boolean;
  canUseRepairTools: boolean;
  canImportExport: boolean;
  canDeleteMarket: boolean;
  canDeleteProduct: boolean;
};

export type StaffCapability = keyof RoleCapabilities;

export type DeriveRoleCapabilitiesInput = {
  /** 是否為 owner（由 useUserRole 的 isOwner 傳入） */
  isOwner: boolean;
  /** 員工角色（owner 為 null / undefined；非 owner 但未登入 / 失敗亦為 null） */
  staffRole?: StaffRole | null;
};

// ─── 內部常數（每次 return 都 copy，避免外部 mutate） ────────────────────────────

const OWNER_CAPABILITIES: RoleCapabilities = {
  canRecordInteraction: true,
  canRecordDeal: true,
  canCreateFieldNote: true,
  canManageFieldNotes: true,
  canEditMarketBasic: true,
  canEditProductBasic: true,
  canManageChecklist: true,
  canToggleChecklistItem: true,
  canEditOwnSameDayRecord: true,
  canDeleteOwnSameDayRecord: true,
  canManageStaff: true,
  canChangeStaffRole: true,
  canViewOwnerFinance: true,
  canUseRepairTools: true,
  canImportExport: true,
  canDeleteMarket: true,
  canDeleteProduct: true,
};

const NONE_CAPABILITIES: RoleCapabilities = {
  canRecordInteraction: false,
  canRecordDeal: false,
  canCreateFieldNote: false,
  canManageFieldNotes: false,
  canEditMarketBasic: false,
  canEditProductBasic: false,
  canManageChecklist: false,
  canToggleChecklistItem: false,
  canEditOwnSameDayRecord: false,
  canDeleteOwnSameDayRecord: false,
  canManageStaff: false,
  canChangeStaffRole: false,
  canViewOwnerFinance: false,
  canUseRepairTools: false,
  canImportExport: false,
  canDeleteMarket: false,
  canDeleteProduct: false,
};

const VIEWER_CAPABILITIES: RoleCapabilities = { ...NONE_CAPABILITIES };

const OPERATOR_CAPABILITIES: RoleCapabilities = {
  ...NONE_CAPABILITIES,
  canRecordInteraction: true,
  canRecordDeal: true,
  canToggleChecklistItem: true,
  canEditOwnSameDayRecord: true,
  canDeleteOwnSameDayRecord: true,
};

const MANAGER_CAPABILITIES: RoleCapabilities = {
  ...NONE_CAPABILITIES,
  canRecordInteraction: true,
  canRecordDeal: true,
  canCreateFieldNote: true,
  canManageFieldNotes: true,
  canEditMarketBasic: true,
  canEditProductBasic: true,
  canManageChecklist: true,
  canToggleChecklistItem: true,
  canEditOwnSameDayRecord: true,
  canDeleteOwnSameDayRecord: true,
};

/**
 * 從 (isOwner, staffRole) 推導 15 個 named capabilities。
 *
 * 規則（§P5-3 spec）：
 * - isOwner=true → 全部 true（owner 不在 StaffRole union，staffRole 忽略）
 * - isOwner=false + staffRole=viewer → 全部 false
 * - isOwner=false + staffRole=operator → 僅 canRecordInteraction = true
 * - isOwner=false + staffRole=manager → 6 個 manager 能力 = true（其他 false）
 * - isOwner=false + staffRole ∈ {null, undefined, unknown} → 全部 false（fail-closed）
 *
 * 重要：
 * - 每次呼叫回傳新 object；不可直接回傳 shared constant
 * - 不讀取 useUserRole，不讀取 PermissionGate
 * - 不可觀察外部狀態
 */
export function deriveRoleCapabilities(
  input: DeriveRoleCapabilitiesInput
): RoleCapabilities {
  if (input.isOwner) {
    return { ...OWNER_CAPABILITIES };
  }

  switch (input.staffRole) {
    case 'viewer':
      return { ...VIEWER_CAPABILITIES };
    case 'operator':
      return { ...OPERATOR_CAPABILITIES };
    case 'manager':
      return { ...MANAGER_CAPABILITIES };
    default:
      // null / undefined / 任何未知字串 → fail-closed
      return { ...NONE_CAPABILITIES };
  }
}

/**
 * 檢查指定 capability 是否為 true。
 *
 * 純布林讀取；不做角色推導、不做 userRole 解讀。
 */
export function hasCapability(
  capabilities: RoleCapabilities,
  capability: StaffCapability
): boolean {
  return capabilities[capability] === true;
}
