/**
 * 帳號切換器組件
 * 
 * 功能：
 * 1. 顯示所有可用的帳號（老闆模式 + 員工模式）
 * 2. 切換帳號時自動切換資料庫
 * 3. 顯示每個帳號的數據量
 * 4. 支援刪除不需要的帳號數據
 */

'use client';

import { useCallback, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  Users, 
  Shield, 
  Crown, 
  ChevronRight, 
  Trash2, 
  Check,
  Database,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { useUserRole } from '@/hooks/useUserRole';
import {
  getAvailableAccounts,
  switchToOwnerMode,
  switchToStaffMode,
  deleteDatabase,
  parseDatabaseName,
  getCurrentDatabaseInfo,
} from '@/lib/db/multi-account';
import { toast } from 'sonner';

interface Account {
  id: string;
  label: string;
  type: 'owner' | 'staff';
  dbName: string;
  dataCount: number;
  isCurrent: boolean;
}

interface AccountSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountSwitcher({ isOpen, onClose }: AccountSwitcherProps) {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // 載入可用帳號
  const loadAccounts = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const availableAccounts = await getAvailableAccounts(user.id);
      setAccounts(availableAccounts);
    } catch (error) {
      console.error('載入帳號列表失敗:', error);
      toast.error('載入帳號列表失敗');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      loadAccounts();
    }
  }, [isOpen, user, loadAccounts]);

  // 切換帳號
  const handleSwitchAccount = async (account: Account) => {
    if (account.isCurrent) {
      toast.info('已經是當前帳號');
      return;
    }

    try {
      toast.loading('正在切換帳號...', { id: 'switch-account' });

      const dbInfo = parseDatabaseName(account.dbName);
      if (!dbInfo) {
        throw new Error('無效的資料庫名稱');
      }

      if (dbInfo.type === 'owner') {
        await switchToOwnerMode(dbInfo.userId);
      } else if (dbInfo.type === 'staff' && dbInfo.ownerId) {
        await switchToStaffMode(dbInfo.userId, dbInfo.ownerId);
      }

      toast.success('帳號已切換', { id: 'switch-account' });
      
      // 重新載入頁面以應用新的資料庫
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('切換帳號失敗:', error);
      toast.error('切換帳號失敗', { id: 'switch-account' });
    }
  };

  // 刪除帳號數據
  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;

    if (accountToDelete.isCurrent) {
      toast.error('無法刪除當前使用的帳號');
      return;
    }

    try {
      toast.loading('正在刪除...', { id: 'delete-account' });

      await deleteDatabase(accountToDelete.dbName);

      toast.success('帳號數據已刪除', { id: 'delete-account' });
      
      // 重新載入帳號列表
      await loadAccounts();
      
      setShowDeleteConfirm(false);
      setAccountToDelete(null);
    } catch (error) {
      console.error('刪除帳號失敗:', error);
      toast.error('刪除失敗', { id: 'delete-account' });
    }
  };

  // 獲取帳號圖標
  const getAccountIcon = (type: 'owner' | 'staff') => {
    if (type === 'owner') {
      return <Crown className="w-5 h-5 text-secondary" />;
    }
    return <Shield className="w-5 h-5 text-primary" />;
  };

  // 獲取帳號顏色
  const getAccountColor = (type: 'owner' | 'staff') => {
    if (type === 'owner') {
      return 'from-primary to-secondary';
    }
    return 'from-primary to-[#B8A6C6]';
  };

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[10000]" onClose={onClose}>
          {/* 背景遮罩 */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          {/* 對話框容器 */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all">
                  {/* 標題 */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-medium text-foreground">
                        切換帳號
                      </Dialog.Title>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        選擇要使用的帳號模式
                      </p>
                    </div>
                  </div>

                  {/* 說明 */}
                  <div className="bg-[#E8F0F8] rounded-xl p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-muted-foreground">
                        <p className="mb-1">
                          <strong>老闆模式：</strong>管理自己的市集和商品
                        </p>
                        <p>
                          <strong>員工模式：</strong>協助老闆記錄互動和成交
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 帳號列表 */}
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      載入中...
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="text-center py-8">
                      <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        沒有可用的帳號
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {accounts.map((account) => (
                        <div
                          key={account.id}
                          className={`relative rounded-xl border-2 transition-all ${
                            account.isCurrent
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent bg-background hover:border-primary/30'
                          }`}
                        >
                          <button
                            onClick={() => handleSwitchAccount(account)}
                            disabled={account.isCurrent}
                            className="w-full p-4 text-left flex items-center gap-3"
                          >
                            {/* 圖標 */}
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${getAccountColor(account.type)}`}>
                              {getAccountIcon(account.type)}
                            </div>

                            {/* 資訊 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {account.label}
                                </span>
                                {account.isCurrent && (
                                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary text-white">
                                    <Check className="w-3 h-3" />
                                    使用中
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {account.dataCount} 筆數據
                              </p>
                            </div>

                            {/* 箭頭 */}
                            {!account.isCurrent && (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                          </button>

                          {/* 刪除按鈕 */}
                          {!account.isCurrent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAccountToDelete(account);
                                setShowDeleteConfirm(true);
                              }}
                              className="absolute top-3 right-3 p-2 rounded-lg bg-soft-pink text-danger hover:bg-soft-pink/80 transition-colors"
                              title="刪除此帳號數據"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 關閉按鈕 */}
                  <button
                    onClick={onClose}
                    className="w-full mt-6 px-4 py-3 rounded-2xl bg-soft-pink text-foreground hover:bg-soft-pink/80 transition-colors font-medium"
                  >
                    關閉
                  </button>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* 刪除確認對話框 */}
      <Transition appear show={showDeleteConfirm} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-[10001]"
          onClose={() => setShowDeleteConfirm(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all">
                  <div className="text-center mb-6">
                    <div className="mx-auto w-12 h-12 rounded-full bg-soft-pink flex items-center justify-center mb-4">
                      <Trash2 className="w-6 h-6 text-danger" />
                    </div>
                    <Dialog.Title className="text-lg font-medium text-foreground mb-2">
                      確認刪除帳號數據？
                    </Dialog.Title>
                    <p className="text-sm text-muted-foreground">
                      將刪除「{accountToDelete?.label}」的所有本地數據
                    </p>
                  </div>

                  <div className="bg-soft-yellow border border-secondary/30 rounded-xl p-3 mb-6">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-secondary">⚠️ 注意：</strong>
                      此操作無法復原，但雲端數據不受影響。
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setAccountToDelete(null);
                      }}
                      className="flex-1 px-4 py-3 rounded-2xl bg-soft-pink text-foreground hover:bg-soft-pink/80 transition-colors font-medium"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="flex-1 px-4 py-3 rounded-2xl bg-danger text-white hover:bg-danger/85 transition-colors font-medium"
                    >
                      確認刪除
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
