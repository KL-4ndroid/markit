/**
 * 員工狀態監控組件（C3.6 修法）
 *
 * 包裝 useStaffStatusMonitor hook 為 React 組件，
 * 用於在 AuthGuard 已登入的 branch 中掛載。
 *
 * 渲染空內容（null），純粹是 hook 的執行容器。
 *
 * @see hooks/useStaffStatusMonitor.ts
 * @see docs/C3.6_LEAVE_TEAM_CLEANUP_AUDIT.md
 */

'use client';

import { useStaffStatusMonitor } from '@/hooks/useStaffStatusMonitor';

interface StaffStatusMonitorProps {
  /** 是否啟用監控（預設 true） */
  enabled?: boolean;

  /**
   * Polling 間隔（毫秒）
   *
   * 預設 180 秒（{@link DEFAULT_STAFF_POLL_INTERVAL_MS}）
   * 變更前請先閱讀 docs/C3.6.1_COST_AND_BUG_AUDIT.md
   */
  pollIntervalMs?: number;
}

export function StaffStatusMonitor({ enabled = true, pollIntervalMs }: StaffStatusMonitorProps) {
  useStaffStatusMonitor({ enabled, pollIntervalMs });

  return null;
}
