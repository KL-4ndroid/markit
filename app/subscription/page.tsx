/**
 * 訂閱管理頁面
 * 
 * 顯示訂閱方案和管理訂閱
 */

'use client';

import { useState } from 'react';
import { ArrowLeft, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PricingCard, type PlanType } from '@/components/subscription/PricingCard';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<PlanType>('free'); // 模擬當前方案
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleSelectPlan = (plan: PlanType) => {
    // TODO: 實際付款流程
    toast.success('功能開發中', {
      description: `您選擇了${plan === 'pro' ? '專業版' : '企業版'}，付款功能即將推出`,
    });
  };

  const handleCancelSubscription = () => {
    // TODO: 實際取消訂閱流程
    toast.success('訂閱已取消', {
      description: '您的訂閱將在本期結束後停止',
    });
    setShowCancelDialog(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="japanese-gradient-header rounded-b-[2rem] px-6 pb-8 pt-12">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            訂閱方案
          </h1>
          <p className="text-white/80 text-sm">
            選擇最適合您的方案，隨時可以升級或降級
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-4 pb-12">
        {/* 當前訂閱狀態卡片 */}
        {currentPlan !== 'free' && (
          <div className="japanese-surface-card mb-8 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">
                  目前訂閱
                </h2>
                <p className="text-muted-foreground text-sm">
                  {currentPlan === 'pro' ? '專業版' : '企業版'}
                </p>
              </div>
              <div className="bg-soft-green text-primary px-3 py-1 rounded-full text-sm font-medium">
                使用中
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3 p-3 bg-soft-pink rounded-xl">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">下次扣款日</p>
                  <p className="text-sm font-medium text-foreground">2026/03/24</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-soft-pink rounded-xl">
                <CreditCard className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">付款方式</p>
                  <p className="text-sm font-medium text-foreground">信用卡 •••• 1234</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCancelDialog(true)}
              className="text-sm text-danger hover:underline"
            >
              取消訂閱
            </button>
          </div>
        )}

        {/* 方案選擇 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-6 text-center">
            選擇適合您的方案
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              plan="free"
              isCurrentPlan={currentPlan === 'free'}
              onSelect={() => handleSelectPlan('free')}
            />
            <PricingCard
              plan="pro"
              isCurrentPlan={currentPlan === 'pro'}
              onSelect={() => handleSelectPlan('pro')}
            />
            <PricingCard
              plan="enterprise"
              isCurrentPlan={currentPlan === 'enterprise'}
              onSelect={() => handleSelectPlan('enterprise')}
            />
          </div>
        </div>

        {/* 常見問題 */}
        <div className="japanese-surface-card p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">
            常見問題
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                可以隨時取消訂閱嗎？
              </h3>
              <p className="text-sm text-muted-foreground">
                可以，您可以隨時取消訂閱。取消後將在本期結束時停止扣款，您仍可使用至期末。
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                降級後數據會消失嗎？
              </h3>
              <p className="text-sm text-muted-foreground">
                不會，您的數據會保留 30 天。在此期間您可以隨時升級恢復完整存取權限。
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                支援哪些付款方式？
              </h3>
              <p className="text-sm text-muted-foreground">
                我們支援信用卡、LINE Pay、街口支付等多種付款方式。
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                需要開立發票嗎？
              </h3>
              <p className="text-sm text-muted-foreground">
                是的，我們會自動開立電子發票並寄送至您的信箱。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 取消訂閱確認對話框 */}
      {showCancelDialog && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-deep/35 backdrop-blur-sm"
            onClick={() => setShowCancelDialog(false)}
          />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <div 
              className="japanese-surface-card w-full max-w-md p-8 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-2xl bg-soft-pink flex items-center justify-center mb-6 mx-auto">
                <AlertCircle className="w-8 h-8 text-danger" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground text-center mb-3">
                確定要取消訂閱嗎？
              </h2>
              
              <p className="text-muted-foreground text-center mb-6">
                取消後，您將在本期結束時（2026/03/24）失去專業版功能，但數據會保留 30 天。
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/85 transition-colors"
                >
                  保留訂閱
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 py-3 rounded-xl bg-soft-pink text-danger font-medium hover:bg-[#E8D8DA] transition-colors"
                >
                  確定取消
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
