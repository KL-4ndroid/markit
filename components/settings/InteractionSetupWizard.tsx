'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowLeft, BarChart3, Check, Pencil } from 'lucide-react';

import { AppDialog } from '@/components/ui/AppDialog';
import { 
  DEFAULT_SCENARIOS, 
  BOOTH_TYPES, 
  saveInteractionButtons,
  type InteractionButton 
} from '@/lib/interaction-buttons-store';
import { useAuth } from '@/lib/supabase/auth-context';
import { toast } from 'sonner';

interface InteractionSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = 'intro' | 'select-type' | 'preview' | 'customize-1' | 'customize-2' | 'customize-3';

/**
 * 互動設定精靈
 * 
 * 設計理念：使用者不是在「設定功能」，而是在「說明他怎麼賣東西」
 */
export function InteractionSetupWizard({ isOpen, onClose, onComplete }: InteractionSetupWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('intro');
  const [buttons, setButtons] = useState<InteractionButton[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Step 0: 開場
  const renderIntro = () => (
    <div className="text-center py-8">
      <div className="mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-4 flex items-center justify-center">
          <BarChart3 className="h-8 w-8 text-white" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-medium text-foreground mb-3">
          記錄顧客互動
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
          讓你知道哪一場市集效果最好
        </p>
      </div>

      <button
        type="button"
        onClick={() => setStep('select-type')}
        className="bg-primary text-white px-8 py-4 rounded-2xl hover:bg-primary/85 transition-colors text-lg font-medium"
      >
        開始設定
      </button>
    </div>
  );

  // Step 1: 選擇攤位類型
  const renderSelectType = () => (
    <div className="py-6">
      <h2 className="text-xl font-medium text-foreground mb-6 text-center">
        你 ﹝主要﹞ 產品是什麼？
      </h2>

      <div className="grid grid-cols-1 gap-3">
        {BOOTH_TYPES.map((type) => (
          <button
            type="button"
            key={type.id}
            onClick={() => {
              setButtons(DEFAULT_SCENARIOS[type.id]);
              setStep('preview');
            }}
            className="flex items-center gap-4 p-5 rounded-2xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
          >
            <div className="text-4xl" aria-hidden="true">{type.emoji}</div>
            <div className="text-lg font-medium text-foreground">{type.label}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // Step 2: 預覽預設組
  const renderPreview = () => (
    <div className="py-6">
      <h2 className="text-xl font-medium text-foreground mb-2 text-center">
        我們幫你準備了一組互動方式
      </h2>
      <p className="text-sm text-muted-foreground mb-6 text-center">
        記錄顧客從「有興趣」到獲得初步「成果」的過程
      </p>

      {/* 預覽三個按鈕 */}
      <div className="mb-6 rounded-2xl bg-background p-3 sm:p-6">
        <div className="grid grid-cols-3 gap-3">
          {buttons.map((button, index) => (
            <div
              key={button.id}
              className="min-w-0 rounded-xl border-2 border-primary/20 bg-white p-2 text-center sm:p-4"
            >
              <div className="text-3xl mb-2" aria-hidden="true">{button.emoji}</div>
              <div className="text-sm font-medium text-foreground">
                {button.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 按鈕 */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary/85 disabled:opacity-50"
        >
          {!isSaving && <Check className="h-5 w-5" aria-hidden="true" />}
          {isSaving ? '儲存中...' : '就用這組'}
        </button>
        <button
          type="button"
          onClick={() => setStep('customize-1')}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-primary/20 bg-white px-4 py-3 font-medium text-foreground transition-colors hover:bg-background"
        >
          <Pencil className="h-5 w-5" aria-hidden="true" />
          我想調整
        </button>
      </div>
    </div>
  );

  // Step 3: 調整第一個按鈕（有興趣）
  const renderCustomize1 = () => (
    <div className="py-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-white rounded-full mb-3">
          <span className="text-xl font-bold">1</span>
        </div>
        <h2 className="text-xl font-medium text-foreground mb-2">
          第一個：有興趣
        </h2>
        <p className="text-sm text-muted-foreground">
          顧客停下來看、拿起、試試看
        </p>
      </div>

      {/* 說明卡片 */}
      <div className="bg-soft-green rounded-2xl p-5 mb-6">
        <p className="text-foreground mb-2 leading-relaxed">
          代表他對你的商品有興趣
        </p>
        <p className="text-xs text-muted-foreground">
          例如：試吃 / 拿起 / 翻看
        </p>
      </div>

      {/* 調整欄位 */}
      <div className="bg-background rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              顯示名稱
            </label>
            <input
              type="text"
              value={buttons[0]?.label || ''}
              onChange={(e) => {
                const newButtons = [...buttons];
                newButtons[0].label = e.target.value;
                setButtons(newButtons);
              }}
              maxLength={4}
              className="min-h-11 w-full px-3 py-2 border-2 border-primary/15 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              圖示
            </label>
            <input
              type="text"
              value={buttons[0]?.emoji || ''}
              onChange={(e) => {
                const newButtons = [...buttons];
                newButtons[0].emoji = e.target.value;
                setButtons(newButtons);
              }}
              maxLength={2}
              className="min-h-11 w-16 px-3 py-2 border-2 border-primary/15 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center text-xl"
            />
          </div>
        </div>
      </div>

      {/* 按鈕 */}
      <button
        type="button"
        onClick={() => setStep('customize-2')}
        className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-primary/85 transition-colors font-medium"
      >
        下一個
      </button>
    </div>
  );

  // Step 4: 調整第二個按鈕（有互動）
  const renderCustomize2 = () => (
    <div className="py-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary text-white rounded-full mb-3">
          <span className="text-xl font-bold">2</span>
        </div>
        <h2 className="text-xl font-medium text-foreground mb-2">
          第二個：有互動
        </h2>
        <p className="text-sm text-muted-foreground">
          顧客開始跟你說話、問問題
        </p>
      </div>

      {/* 說明卡片 */}
      <div className="bg-soft-yellow rounded-2xl p-5 mb-6">
        <p className="text-foreground mb-2 leading-relaxed">
          代表他有購買或了解的意圖
        </p>
        <p className="text-xs text-muted-foreground">
          例如：詢問價格 / 聊材質 / 問來源
        </p>
      </div>

      {/* 調整欄位 */}
      <div className="bg-background rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              顯示名稱
            </label>
            <input
              type="text"
              value={buttons[1]?.label || ''}
              onChange={(e) => {
                const newButtons = [...buttons];
                newButtons[1].label = e.target.value;
                setButtons(newButtons);
              }}
              maxLength={4}
              className="min-h-11 w-full px-3 py-2 border-2 border-primary/15 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              圖示
            </label>
            <input
              type="text"
              value={buttons[1]?.emoji || ''}
              onChange={(e) => {
                const newButtons = [...buttons];
                newButtons[1].emoji = e.target.value;
                setButtons(newButtons);
              }}
              maxLength={2}
              className="min-h-11 w-16 px-3 py-2 border-2 border-primary/15 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center text-xl"
            />
          </div>
        </div>
      </div>

      {/* 按鈕 */}
      <button
        type="button"
        onClick={() => setStep('customize-3')}
        className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-primary/85 transition-colors font-medium"
      >
        下一個
      </button>
    </div>
  );

  // Step 5: 調整第三個按鈕（轉換）
  const renderCustomize3 = () => (
    <div className="py-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary text-white rounded-full mb-3">
          <span className="text-xl font-bold">3</span>
        </div>
        <h2 className="text-xl font-medium text-foreground mb-2">
          第三個：轉換
        </h2>
        <p className="text-sm text-muted-foreground">
          顧客完成你想要的下一步
        </p>
      </div>

      {/* 說明卡片 */}
      <div className="bg-soft-pink rounded-2xl p-5 mb-6">
        <p className="text-foreground mb-2 leading-relaxed">
          代表關係往前走了一格
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          例如：加 IG / 加 Line / 留下聯絡 / 加入追蹤
        </p>
        <div className="bg-white/80 rounded-lg p-3 border border-secondary/20">
          <p className="flex gap-2 text-xs font-medium text-secondary">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>這裡記錄的是「有價值的互動結果」，實際銷售、成交使用「商品交易」功能</span>
          </p>
        </div>
      </div>

      {/* 調整欄位 */}
      <div className="bg-background rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              顯示名稱
            </label>
            <input
              type="text"
              value={buttons[2]?.label || ''}
              onChange={(e) => {
                const newButtons = [...buttons];
                newButtons[2].label = e.target.value;
                setButtons(newButtons);
              }}
              maxLength={4}
              className="min-h-11 w-full px-3 py-2 border-2 border-primary/15 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              圖示
            </label>
            <input
              type="text"
              value={buttons[2]?.emoji || ''}
              onChange={(e) => {
                const newButtons = [...buttons];
                newButtons[2].emoji = e.target.value;
                setButtons(newButtons);
              }}
              maxLength={2}
              className="min-h-11 w-16 px-3 py-2 border-2 border-primary/15 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center text-xl"
            />
          </div>
        </div>
      </div>

      {/* 按鈕 */}
      <button
        type="button"
        onClick={() => handleSave()}
        disabled={isSaving}
        className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-primary/85 transition-colors font-medium disabled:opacity-50"
      >
        {isSaving ? '儲存中...' : '完成設定'}
      </button>
    </div>
  );

  // 處理儲存
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveInteractionButtons(buttons, user?.id);
      
      // ✅ 先關閉窗口,再顯示成功訊息和執行回調
      onClose();
      
      // ✅ 使用 setTimeout 確保窗口關閉動畫完成後再顯示訊息
      setTimeout(() => {
        toast.success('互動方式已設定完成');
        onComplete();
      }, 300);
    } catch (error) {
      toast.error('儲存失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    if (step === 'select-type') setStep('intro');
    else if (step === 'preview') setStep('select-type');
    else if (step === 'customize-1') setStep('preview');
    else if (step === 'customize-2') setStep('customize-1');
    else if (step === 'customize-3') setStep('customize-2');
  };

  return (
    <AppDialog
      open={isOpen}
      onClose={onClose}
      title="互動記錄設定"
      description="設定營業畫面的三個快速互動動作"
      size="md"
    >
      {step !== 'intro' && (
        <button
          type="button"
          onClick={goBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          上一步
        </button>
      )}
      {step === 'intro' && renderIntro()}
      {step === 'select-type' && renderSelectType()}
      {step === 'preview' && renderPreview()}
      {step === 'customize-1' && renderCustomize1()}
      {step === 'customize-2' && renderCustomize2()}
      {step === 'customize-3' && renderCustomize3()}
    </AppDialog>
  );
}
