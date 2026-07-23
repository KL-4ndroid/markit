'use client';

import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { recordInteraction } from '@/lib/db/hooks';
import { getInteractionButtons, type InteractionButton } from '@/lib/interaction-buttons-store';
import { InteractionRoleIcon } from '@/components/interactions/InteractionRoleIcon';

interface InteractionButtonsProps {
  marketId: string;
  onInteractionRecorded?: () => void;
}

const INTERACTION_SURFACES = [
  'bg-atelier-sage-soft hover:bg-atelier-sage-soft/75',
  'bg-atelier-apricot-soft hover:bg-atelier-apricot-soft/75',
  'bg-atelier-blue-soft hover:bg-atelier-blue-soft/75',
  'bg-atelier-rose-soft hover:bg-atelier-rose-soft/75',
] as const;

export function InteractionButtons({ marketId, onInteractionRecorded }: InteractionButtonsProps) {
  const [buttons, setButtons] = useState<InteractionButton[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clickingButton, setClickingButton] = useState<string | null>(null);
  const [lastRecordedLabel, setLastRecordedLabel] = useState<string | null>(null);
  const lastClickTime = useRef(0);

  useEffect(() => {
    setButtons(getInteractionButtons());

    const handleStorageChange = () => setButtons(getInteractionButtons());
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleInteraction = async (buttonId: string, label: string) => {
    const now = Date.now();
    if (now - lastClickTime.current < 500) {
      toast.error('操作太快', {
        description: '請稍等一下再記錄',
        duration: 1000,
      });
      return;
    }
    if (isProcessing) return;

    lastClickTime.current = now;
    setIsProcessing(true);
    setClickingButton(buttonId);

    let didRecord = false;
    try {
      await recordInteraction(marketId, buttonId);
      didRecord = true;
      setLastRecordedLabel(label);
      toast.success(label, {
        description: '互動已記錄',
        duration: 1500,
      });
      onInteractionRecorded?.();
    } catch (error) {
      console.error('記錄互動失敗：', error);
      toast.error('記錄失敗，請稍後再試');
    } finally {
      setIsProcessing(false);
      if (didRecord) {
        window.setTimeout(() => {
          setClickingButton(null);
          setLastRecordedLabel(null);
        }, 900);
      } else {
        setClickingButton(null);
      }
    }
  };

  return (
    <div>
      <div className="relative grid grid-cols-3 gap-2">
        {buttons.map((button, buttonIndex) => (
          <button
            key={button.id}
            type="button"
            onClick={() => void handleInteraction(button.id, button.label)}
            disabled={isProcessing}
            className={`relative min-h-24 overflow-hidden rounded-control p-3 shadow-atelier-key transition-[transform,box-shadow,background-color] duration-150 active:translate-y-0.5 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${
              clickingButton === button.id
                ? 'bg-status-good-bg ring-2 ring-status-good-border'
                : INTERACTION_SURFACES[buttonIndex % INTERACTION_SURFACES.length]
            }`}
          >
            {clickingButton === button.id && (
              <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-status-good-text" aria-hidden="true" />
            )}
            <InteractionRoleIcon role={button.role} className="mx-auto mb-2 h-6 w-6 text-atelier-ink" />
            <div className="text-center text-sm font-semibold text-atelier-ink">{button.label}</div>
          </button>
        ))}
      </div>
      <p className="mt-2 min-h-5 text-center text-xs font-medium text-status-good-text" aria-live="polite">
        {lastRecordedLabel ? `${lastRecordedLabel}已記錄` : ''}
      </p>
    </div>
  );
}
