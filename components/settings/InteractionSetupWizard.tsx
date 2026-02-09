'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Check } from 'lucide-react';
import { 
  DEFAULT_SCENARIOS, 
  BOOTH_TYPES, 
  saveInteractionButtons,
  type BoothType,
  type InteractionButton 
} from '@/lib/interaction-buttons-store';
import { useAuth } from '@/lib/supabase/auth-context';
import { toast } from 'sonner';

interface InteractionSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = 'intro' | 'select-type' | 'preview' | 'understand' | 'customize';

/**
 * 互動設定精靈
 * 
 * 設計理念：使用者不是在「設定功能」，而是在「說明他怎麼賣東西」
 */
export function InteractionSetupWizard({ isOpen, onClose, onComplete }: InteractionSetupWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('intro');
  const [selectedType, setSelectedType] = useState<BoothType | null>(null);
  const [buttons, setButtons] = useState<InteractionButton[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Step 0: 開場
  const renderIntro = () => (
    <div className="text-center py-8">
      <div className="mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-3xl">📊</span>
        </div>
        <h2 className="text-2xl font-medium text-[#3A3A3A] mb-3">
          記錄顧客互動
        </h2>
        <p className="text-[#6B6B6B] text-base leading-relaxed max-w-md mx-auto">
          讓你知道哪一場市集效果最好
        </p>
      </div>

      <button
        onClick={() => setStep('select-type')}
        className="bg-[#7B9FA6] text-white px-8 py-4 rounded-2xl hover:bg-[#6A8E95] transition-colors text-lg font-medium"
      >
        開始設定
      </button>
    </div>
  );

  // Step 1: 選擇攤位類型
  const renderSelectType = () => (
    <div className="py-6">
      <h2 className="text-xl font-medium text-[#3A3A3A] mb-6 text-center">
        你 ﹝主要﹞ 產品是什麼？
      </h2>

      <div className="grid grid-cols-1 gap-3">
        {BOOTH_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => {
              setSelectedType(type.id);
              setButtons(DEFAULT_SCENARIOS[type.id]);
              setStep('preview');
            }}
            className="flex items-center gap-4 p-5 rounded-2xl border-2 border-[#7B9FA6]/20 hover:border-[#7B9FA6] hover:bg-[#7B9FA6]/5 transition-all"
          >
            <div className="text-4xl">{type.emoji}</div>
            <div className="text-lg font-medium text-[#3A3A3A]">{type.label}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // Step 2: 預覽預設組
  const renderPreview = () => (
    <div className="py-6">
      <h2 className="text-xl font-medium text-[#3A3A3A] mb-2 text-center">
        我們幫你準備了一組互動方式
      </h2>
      <p className="text-sm text-[#6B6B6B] mb-6 text-center">
        記錄顧客從「有興趣」到獲得初步「成果」的過程
      </p>

      {/* 預覽三個按鈕 */}
      <div className="bg-[#FAFAF8] rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {buttons.map((button, index) => (
            <div
              key={button.id}
              className="bg-white rounded-xl p-4 text-center border-2 border-[#7B9FA6]/20"
            >
              <div className="text-3xl mb-2">{button.emoji}</div>
              <div className="text-sm font-medium text-[#3A3A3A]">
                {button.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 按鈕 */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSave()}
          disabled={isSaving}
          className="flex-1 bg-[#7B9FA6] text-white py-4 rounded-2xl hover:bg-[#6A8E95] transition-colors font-medium disabled:opacity-50"
        >
          {isSaving ? '儲存中...' : '✅ 就用這組'}
        </button>
        <button
          onClick={() => setStep('understand')}
          className="flex-1 bg-white text-[#3A3A3A] py-4 rounded-2xl border-2 border-[#7B9FA6]/20 hover:bg-[#FAFAF8] transition-colors font-medium"
        >
          ✏️ 我想調整
        </button>
      </div>
    </div>
  );

  // Step 3: 理解三個按鈕的意義
  const renderUnderstand = () => (
    <div className="py-6">
      <h2 className="text-xl font-medium text-[#3A3A3A] mb-2 text-center">
        在調整前，先讓你知道這三個按鈕的意思
      </h2>
      <p className="text-sm text-[#6B6B6B] mb-6 text-center">
        只要照這個順序設定，後面的分析才會準
      </p>

      {/* 三張卡片 */}
      <div className="space-y-4 mb-6">
        {/* 卡片 1: 有興趣 */}
        <div className="bg-[#E8F3E8] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#7B9FA6] text-white rounded-full flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="text-lg font-medium text-[#3A3A3A]">第一個：有興趣</h3>
          </div>
          <p className="text-[#3A3A3A] mb-2 leading-relaxed">
            顧客停下來看、拿起、試試看
            <br />
            代表他對你的商品有興趣
          </p>
          <p className="text-xs text-[#6B6B6B]">
            例如：試吃 / 拿起 / 翻看
          </p>
        </div>

        {/* 卡片 2: 有互動 */}
        <div className="bg-[#FFF8E7] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#D4A574] text-white rounded-full flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="text-lg font-medium text-[#3A3A3A]">第二個：有互動</h3>
          </div>
          <p className="text-[#3A3A3A] mb-2 leading-relaxed">
            顧客開始跟你說話、問問題
            <br />
            代表他有購買或了解的意圖
          </p>
          <p className="text-xs text-[#6B6B6B]">
            例如：詢問價格 / 聊材質 / 問來源
          </p>
        </div>

        {/* 卡片 3: 轉換 */}
        <div className="bg-[#F5E6E8] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#D4A574] text-white rounded-full flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="text-lg font-medium text-[#3A3A3A]">第三個：轉換</h3>
          </div>
          <p className="text-[#3A3A3A] mb-2 leading-relaxed">
            顧客完成你想要的下一步
            <br />
            代表關係往前走了一格
          </p>
          <p className="text-xs text-[#6B6B6B] mb-3">
            例如：加 IG / 加 Line / 留下聯絡 / 加入追蹤
          </p>
          <div className="bg-white/80 rounded-lg p-3 border border-[#D4A574]/20">
            <p className="text-xs text-[#D4A574] font-medium">
              ⚠️ 這裡記錄的是「有價值的互動結果」，實際銷售金額請使用「商品交易」功能
            </p>
          </div>
        </div>
      </div>

      {/* 按鈕 */}
      <button
        onClick={() => setStep('customize')}
        className="w-full bg-[#7B9FA6] text-white py-4 rounded-2xl hover:bg-[#6A8E95] transition-colors font-medium"
      >
        我懂了，開始調整
      </button>
    </div>
  );

  // Step 4: 自訂
  const renderCustomize = () => (
    <div className="py-6">
      <h2 className="text-xl font-medium text-[#3A3A3A] mb-6 text-center">
        調整你的互動方式
      </h2>

      {/* 三個固定欄位 */}
      <div className="space-y-4 mb-6">
        {buttons.map((button, index) => (
          <div key={button.id} className="bg-[#FAFAF8] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[#7B9FA6] text-white rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <div className="text-sm font-medium text-[#3A3A3A]">
                {button.role === 'interest' && '有興趣'}
                {button.role === 'engage' && '有互動'}
                {button.role === 'convert' && '轉換'}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="block text-xs text-[#6B6B6B] mb-1">
                  顯示名稱
                </label>
                <input
                  type="text"
                  value={button.label}
                  onChange={(e) => {
                    const newButtons = [...buttons];
                    newButtons[index].label = e.target.value;
                    setButtons(newButtons);
                  }}
                  maxLength={4}
                  className="w-full px-3 py-2 border-2 border-[#7B9FA6]/15 rounded-lg focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6B6B6B] mb-1">
                  圖示
                </label>
                <input
                  type="text"
                  value={button.emoji}
                  onChange={(e) => {
                    const newButtons = [...buttons];
                    newButtons[index].emoji = e.target.value;
                    setButtons(newButtons);
                  }}
                  maxLength={2}
                  className="w-16 px-3 py-2 border-2 border-[#7B9FA6]/15 rounded-lg focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all text-center text-xl"
                />
              </div>
            </div>

            <p className="text-xs text-[#6B6B6B] mt-2">
              {button.description}
            </p>
          </div>
        ))}
      </div>

      {/* 按鈕 */}
      <button
        onClick={() => handleSave()}
        disabled={isSaving}
        className="w-full bg-[#7B9FA6] text-white py-4 rounded-2xl hover:bg-[#6A8E95] transition-colors font-medium disabled:opacity-50"
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
      toast.success('✅ 互動方式已設定完成');
      onComplete();
      onClose();
    } catch (error) {
      toast.error('儲存失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
          <div className="fixed inset-0 bg-black/50" />
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-[2rem] bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-[#7B9FA6]/10 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {step !== 'intro' && (
                      <button
                        onClick={() => {
                          if (step === 'select-type') setStep('intro');
                          else if (step === 'preview') setStep('select-type');
                          else if (step === 'understand') setStep('preview');
                          else if (step === 'customize') setStep('understand');
                        }}
                        className="text-[#6B6B6B] hover:text-[#3A3A3A] transition-colors"
                      >
                        ← 上一步
                      </button>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="text-[#6B6B6B] hover:text-[#3A3A3A] transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 max-h-[calc(90vh-5rem)] overflow-y-auto">
                  {step === 'intro' && renderIntro()}
                  {step === 'select-type' && renderSelectType()}
                  {step === 'preview' && renderPreview()}
                  {step === 'understand' && renderUnderstand()}
                  {step === 'customize' && renderCustomize()}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
