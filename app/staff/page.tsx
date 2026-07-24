'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';

export default function StaffPage() {
  const router = useRouter();
  const { user } = useAuth();

  // 自動導向到設定頁面
  useEffect(() => {
    if (user) {
      router.replace('/settings/team');
    }
  }, [user, router]);


  // 顯示導向提示
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-xl text-center">
        <AlertCircle className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-medium text-foreground mb-2">
          員工管理已移至團隊與權限
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          正在為您導向...
        </p>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}
