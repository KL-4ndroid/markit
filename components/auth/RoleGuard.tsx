/**
 * RoleGuard - 全域角色載入守衛（C2.28B）
 *
 * 設計目的：
 * - 在 layout 級別統一處理「角色尚未載入」或「角色查詢失敗」的渲染保護
 * - 避免每個頁面重複 `if (isRoleLoading || roleError) return <RoleLoadingFallback />`
 *
 * 為什麼不放在 AuthGuard 內部：
 * - AuthGuard 專注於「登入狀態」（user / loading）
 * - RoleGuard 專注於「角色狀態」（isStaff / ownerId / permissions）
 * - 兩者職責分離，各自獨立測試、獨立維護
 *
 * 為什麼不需要每頁再寫 guard：
 * - 在 layout 級別就會阻擋，children 永遠在「角色已載入」狀態下 render
 * - 頁面層的 useUserRole() 仍可呼叫（拿 userRole / isStaff / ownerId 做業務邏輯）
 * - 頁面層不需要再守衛「isLoading」狀態，因為到這裡一定不是 loading
 *
 * fail-closed 仍然成立：
 * - 即使 layout 級 RoleGuard 漏掉，useUserRole 回傳的 permissions 本身已經 fail-closed
 *   （deriveRolePermissions 在 isLoading=true 時 canEdit/canViewSensitiveData 都回 false）
 * - 這是雙層保護：layout 級避免 UI 閃爍 + hook 級避免資料洩漏
 *
 * 使用方式（在 app/layout.tsx）：
 * ```tsx
 * <AuthGuard>
 *   <RoleGuard>
 *     {/* 整個 app 的 children *\/}
 *   </RoleGuard>
 * </AuthGuard>
 * ```
 */

'use client';

import { usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';
import { RoleLoadingFallback } from './RoleLoadingFallback';

interface RoleGuardProps {
  children: React.ReactNode;
}

// ✅ 公開路由：不查詢角色狀態，避免 Demo / 法務頁依賴登入或權限資料。
const PUBLIC_ROUTES = ['/privacy', '/terms', '/about', '/demo'];

export function RoleGuard({ children }: RoleGuardProps) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));
  const { isLoading: isRoleLoading, roleError } = useUserRole({ enabled: !isPublicRoute });

  if (isPublicRoute) {
    return <>{children}</>;
  }

  // 角色載入中或失敗時，顯示中性 skeleton（不洩漏 owner/staff 差異）
  if (isRoleLoading || roleError) {
    return <RoleLoadingFallback />;
  }

  return <>{children}</>;
}
