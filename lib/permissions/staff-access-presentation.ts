import { deriveRoleCapabilities, type RoleCapabilities } from './role-capabilities';
import type { StaffRole } from '@/types/staff';
import type { CapabilityAccessBlockReason } from '@/lib/subscription/subscription-access';

export function staffRoleWorkDetails(role?: StaffRole | null, capabilities?: RoleCapabilities) {
  if (!capabilities && role !== 'viewer' && role !== 'operator' && role !== 'manager') return ['角色尚未確認，請重新整理後再確認工作範圍。'];
  const caps = capabilities ?? deriveRoleCapabilities({ isOwner: false, staffRole: role });
  const details = ['查看目前可存取場次的市集與商品資訊'];
  if (caps.canRecordDeal || caps.canRecordInteraction) details.push('營業開放時記錄成交與現場互動');
  if (caps.canToggleChecklistItem) details.push('勾選出攤待辦');
  if (caps.canEditMarketBasic || caps.canEditProductBasic) details.push('編輯既有市集／商品的開放欄位，不含名稱、地點、分類、成本或狀態');
  if (caps.canCreateFieldNote || caps.canManageChecklist) details.push('管理現場交接筆記與出攤待辦');
  if (caps.canEditOwnSameDayRecord || caps.canDeleteOwnSameDayRecord) details.push('在允許的時段內修改或刪除自己當日建立的紀錄');
  if (!caps.canRecordDeal && !caps.canRecordInteraction) details.push('僅供查看，不能記錄成交、互動或變更資料');
  if (!caps.canViewOwnerFinance) details.push('成本與利潤僅由老闆查看');
  if (!caps.canManageStaff) details.push('新增市集／商品及管理員工由老闆處理');
  return details;
}

/** Describes availability without changing entitlement or authorization decisions. */
export function staffAccessPresentation(input: {
  role?: StaffRole | null;
  status: 'pending' | 'active' | 'suspended_by_plan' | 'revoked';
  canView: boolean;
  teamAllowed: boolean;
  simulationActive?: boolean;
  blockReason?: CapabilityAccessBlockReason;
}) {
  if (input.status === 'pending') return { title: '等待接受邀請', summary: '接受邀請並確認團隊資格後，才會開放工作區。' };
  if (input.status === 'suspended_by_plan') return { title: '存取已暫停', summary: input.teamAllowed ? '目前方案符合；此成員仍暫停，需由老闆確認後恢復存取。' : '關係與歷史已保留，需有效的高階版資格，再由老闆恢復成員存取。' };
  if (input.status === 'revoked') return { title: '已移除存取權', summary: '目前不能進入這個品牌的工作區。' };
  if (input.simulationActive) return { title: '目前為模擬顯示', summary: '角色僅供預覽，沒有開放實際團隊操作。' };
  if (!input.teamAllowed) {
    if (input.blockReason === 'plan_required' || input.blockReason === 'entitlement_inactive') return { title: '團隊存取未開放', summary: '需要有效的高階版資格；啟用後仍需確認成員存取狀態。' };
    return { title: '存取資格尚未確認', summary: '請連線重新整理，確認完成前不能保證此成員可操作。' };
  }
  if (!input.canView || !['viewer', 'operator', 'manager'].includes(input.role ?? '')) return { title: '權限需要確認', summary: '目前無法確認可查看的工作範圍，請重新整理。' };
  if (input.role === 'viewer') return { title: '僅供查看', summary: '可查看開放場次與商品資訊，不能記錄或修改資料。' };
  if (input.role === 'operator') return { title: '現場紀錄', summary: '營業開放時可記錄成交、互動，並勾選待辦。' };
  return { title: '現場紀錄與基本管理', summary: '可協助現場紀錄、交接筆記、待辦及既有資料的開放欄位。' };
}
