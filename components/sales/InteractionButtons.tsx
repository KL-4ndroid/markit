'use client';

import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { recordInteraction } from '@/lib/db/hooks';
import { deleteInteractionEventById } from '@/lib/markets/event-deletion-service';
import { getInteractionButtons, type InteractionButton } from '@/lib/interaction-buttons-store';
import { InteractionRoleIcon } from '@/components/interactions/InteractionRoleIcon';

interface InteractionButtonsProps {
  marketId: string;
  onInteractionRecorded?: () => void;
  variant?: 'card' | 'dock' | 'inline';
}

const INTERACTION_SURFACES = [
  'bg-atelier-sage-soft hover:bg-atelier-sage-soft/75',
  'bg-atelier-apricot-soft hover:bg-atelier-apricot-soft/75',
  'bg-atelier-blue-soft hover:bg-atelier-blue-soft/75',
  'bg-atelier-rose-soft hover:bg-atelier-rose-soft/75',
] as const;

export function InteractionButtons({ marketId, onInteractionRecorded, variant = 'card' }: InteractionButtonsProps) {
  const [buttons, setButtons] = useState<InteractionButton[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clickingButton, setClickingButton] = useState<string | null>(null);
  const [lastRecordedInteraction, setLastRecordedInteraction] = useState<{
    eventId: string;
    label: string;
  } | null>(null);
  const lastClickTime = useRef(0);
  const undoingEventIds = useRef(new Set<string>());
  const isCompact = variant !== 'card';

  useEffect(() => {
    setButtons(getInteractionButtons());

    const handleStorageChange = () => setButtons(getInteractionButtons());
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleUndoInteraction = async (eventId: string, label: string) => {
    if (undoingEventIds.current.has(eventId)) return;

    undoingEventIds.current.add(eventId);
    setIsProcessing(true);
    try {
      await deleteInteractionEventById(eventId, {
        allowDelete: true,
        sameDayOnly: true,
      });
      setLastRecordedInteraction((current) => (current?.eventId === eventId ? null : current));
      onInteractionRecorded?.();
      toast.success(`${label}已復原`);
    } catch (error) {
      undoingEventIds.current.delete(eventId);
      console.error('復原互動失敗：', error);
      toast.error('復原失敗，請從最近紀錄處理');
    } finally {
      setIsProcessing(false);
    }
  };

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
      const eventId = await recordInteraction(marketId, buttonId);
      didRecord = true;
      setLastRecordedInteraction({ eventId, label });
      toast.success(label, {
        description: '互動已記錄',
        duration: 5000,
        action: {
          label: '復原',
          onClick: () => void handleUndoInteraction(eventId, label),
        },
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
        }, 900);
      } else {
        setClickingButton(null);
      }
    }
  };

  return (
    <div className="relative">
      <div className="relative grid grid-cols-3 gap-2">
        {buttons.map((button, buttonIndex) => (
          <button
            key={button.id}
            type="button"
            onClick={() => void handleInteraction(button.id, button.label)}
            disabled={isProcessing}
            className={`relative overflow-hidden rounded-control shadow-atelier-key transition-[transform,box-shadow,background-color] duration-150 active:translate-y-0.5 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${isCompact ? 'flex min-h-12 min-w-0 items-center justify-center gap-1.5 px-2 py-1.5' : 'min-h-16 p-2 sm:min-h-24 sm:p-3'} ${
              clickingButton === button.id
                ? 'bg-status-good-bg ring-2 ring-status-good-border'
                : INTERACTION_SURFACES[buttonIndex % INTERACTION_SURFACES.length]
            }`}
          >
            {clickingButton === button.id && (
              <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-status-good-text" aria-hidden="true" />
            )}
            <InteractionRoleIcon role={button.role} className={`${isCompact ? 'h-4 w-4 shrink-0' : 'mx-auto mb-1 h-5 w-5 sm:mb-2 sm:h-6 sm:w-6'} text-atelier-ink`} />
            <div className={`${isCompact ? 'truncate text-xs' : 'text-center text-sm'} min-w-0 font-semibold text-atelier-ink`}>{button.label}</div>
          </button>
        ))}
      </div>
      <div className={`${variant === 'dock' && lastRecordedInteraction ? 'absolute bottom-[calc(100%+0.65rem)] left-0 right-0 mx-auto w-fit max-w-full rounded-control border border-status-good-border bg-atelier-paper px-3 py-2 shadow-atelier-lift' : variant === 'dock' ? 'hidden' : 'mt-2 flex min-h-8'} items-center justify-center gap-3 text-xs font-medium`}>
        <span className="text-status-good-text" aria-live="polite">
          {lastRecordedInteraction ? `${lastRecordedInteraction.label}已記錄` : ''}
        </span>
        {lastRecordedInteraction && (
          <button
            type="button"
            onClick={() =>
              void handleUndoInteraction(lastRecordedInteraction.eventId, lastRecordedInteraction.label)
            }
            disabled={isProcessing}
            className="rounded-control px-2 py-1 font-semibold text-atelier-ink underline decoration-atelier-line underline-offset-4 disabled:opacity-50"
          >
            復原
          </button>
        )}
      </div>
    </div>
  );
}
