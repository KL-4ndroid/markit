'use client';

import dynamic from 'next/dynamic';
import { Edit, MousePointerClick, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  getInteractionButtons,
  isInteractionSetupComplete,
  resetInteractionButtons,
  type InteractionButton,
} from '@/lib/interaction-buttons-store';

const InteractionSetupWizard = dynamic(
  () => import('@/components/settings/InteractionSetupWizard').then((module) => module.InteractionSetupWizard),
  { ssr: false },
);

const STAGE_LABELS = ['有興趣', '有互動', '轉換'] as const;

export function InteractionSettingsPanel() {
  const [buttons, setButtons] = useState<InteractionButton[]>([]);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  useEffect(() => {
    setButtons(getInteractionButtons());
    setIsSetupComplete(isInteractionSetupComplete());
  }, []);

  const refreshSettings = () => {
    setButtons(getInteractionButtons());
    setIsSetupComplete(isInteractionSetupComplete());
    window.dispatchEvent(new Event('storage'));
  };

  const confirmReset = () => {
    resetInteractionButtons();
    refreshSettings();
    setShowResetConfirmation(false);
    toast.success('已重置互動記錄設定');
  };

  return (
    <section className="rounded-card border border-primary/10 bg-white p-5" aria-labelledby="interaction-settings-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MousePointerClick className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="interaction-settings-title" className="text-base font-semibold text-foreground">互動記錄</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            設定現場快速記錄的三個階段，用來比較不同市集的顧客反應。
          </p>
        </div>
      </div>

      {isSetupComplete ? (
        <div className="mt-5">
          <ol className="grid grid-cols-3 gap-2" aria-label="目前互動階段">
            {buttons.map((button, index) => (
              <li key={button.id} className="min-w-0 rounded-control border border-primary/10 bg-background p-3 text-center">
                <span className="block text-xl" aria-hidden="true">{button.emoji}</span>
                <span className="mt-1 block truncate text-xs font-semibold text-foreground">{button.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{STAGE_LABELS[index]}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              className="sm:flex-1"
              leadingIcon={<Edit className="h-4 w-4" aria-hidden="true" />}
              onClick={() => setShowWizard(true)}
            >
              重新設定
            </Button>
            <Button
              className="sm:flex-1"
              variant="secondary"
              leadingIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
              onClick={() => setShowResetConfirmation(true)}
            >
              重置
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 border-t border-primary/10 pt-4">
          <p className="text-sm font-medium text-foreground">尚未設定快速互動按鈕</p>
          <p className="mt-1 text-sm text-muted-foreground">完成設定後，營業畫面會顯示三個快速記錄動作。</p>
          <Button className="mt-4 w-full sm:w-auto" onClick={() => setShowWizard(true)}>
            開始設定
          </Button>
        </div>
      )}

      {showWizard && (
        <InteractionSetupWizard
          isOpen
          onClose={() => setShowWizard(false)}
          onComplete={refreshSettings}
        />
      )}

      <ConfirmDialog
        open={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        onConfirm={confirmReset}
        title="重置互動記錄設定？"
        description="目前的三個互動按鈕會恢復為未設定狀態，之後可以重新建立。"
        confirmLabel="重置設定"
      />
    </section>
  );
}
