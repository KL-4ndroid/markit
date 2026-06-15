/**
 * RoleLoadingFallback - 角色載入中的中性 Skeleton（C2.28B）
 *
 * 設計原則：
 * - 不顯示任何 owner-only / staff-only 元素
 * - 不洩漏當前 ownerId
 * - 不預測 isStaff 結果
 * - 載入時間通常 < 2 秒，視覺衝擊小
 *
 * 為什麼要這個：
 * - 角色查詢仍在進行時，useUserRole 給的 userRole 可能是緩存或預設值
 *   - 即使 C2.28 已把 isOwner/canEdit 改為 fail-closed
 *   - 但 page render 仍可能 useMarkets({ ownerId: currentOwnerId })
 *   - 載入期間如果 currentOwnerId 是 user.id（owner 預設）
 *   - 員工會在 < 2 秒內看到 owner 的市集列表渲染
 *
 * 使用方式：
 * ```tsx
 * const { isLoading: isRoleLoading, roleError } = useUserRole();
 * if (isRoleLoading || roleError) {
 *   return <RoleLoadingFallback />;
 * }
 * ```
 */

export function RoleLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
      <div className="max-w-lg mx-auto px-6 w-full">
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-12 text-center">
          <div
            className="w-12 h-12 mx-auto mb-4 border-4 border-[#7B9FA6]/30 border-t-[#7B9FA6] rounded-full animate-spin"
            role="status"
            aria-label="正在載入"
          />
          <p className="text-sm text-[#6B6B6B]">正在確認身分...</p>
        </div>
      </div>
    </div>
  );
}
