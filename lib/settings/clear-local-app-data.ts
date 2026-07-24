export async function clearLocalAppData(
  userId?: string,
  forceDiscardLocalChanges = false,
): Promise<boolean> {
  const [databaseModule, syncModule, roleModule, reportModule] = await Promise.all([
    import('@/lib/db'),
    import('@/hooks/useSync'),
    import('@/hooks/useUserRole'),
    import('@/lib/sync/local-pending-write-report'),
  ]);
  const { clearAllData, db } = databaseModule;
  const { resetInitialSyncFlag } = syncModule;
  const { clearRoleCache } = roleModule;
  const { getLocalPendingWriteReport } = reportModule;
  const report = await getLocalPendingWriteReport(userId);
  if (!report.isClean && !forceDiscardLocalChanges) return false;

  try {
    await clearAllData();
  } catch (error) {
    console.error('清除本地資料表失敗:', error);
  }

  try {
    db.close();
  } catch (error) {
    console.error('關閉本地資料庫失敗:', error);
  }

  try {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('MarketPulseDB');
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('刪除 IndexedDB 失敗:', request.error);
        resolve();
      };
      request.onblocked = () => resolve();
    });
  } catch (error) {
    console.error('刪除 IndexedDB 失敗:', error);
  }

  try {
    ['user_role_cache', 'logout_history', 'hasCompletedInitialSync'].forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('清除 localStorage 快取失敗:', error);
  }

  try {
    sessionStorage.clear();
  } catch (error) {
    console.error('清除 sessionStorage 快取失敗:', error);
  }

  try {
    resetInitialSyncFlag();
    clearRoleCache();
  } catch (error) {
    console.error('重置同步或角色快取失敗:', error);
  }

  return true;
}
