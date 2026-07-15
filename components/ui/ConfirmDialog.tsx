'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { AppDialog } from './AppDialog';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  confirmationText?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = '確認',
  cancelLabel = '取消',
  tone = 'default',
  confirmationText,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [typedText, setTypedText] = useState('');
  const confirmationInputId = useId();

  useEffect(() => {
    if (!open) {
      setIsConfirming(false);
      setTypedText('');
    }
  }, [open]);

  const canConfirm = !confirmationText || typedText === confirmationText;

  const handleConfirm = async () => {
    if (!canConfirm || isConfirming) return;
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      layer="critical"
      dismissible={!isConfirming}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={!canConfirm}
            isLoading={isConfirming}
          >
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <div className={`flex items-start gap-3 rounded-card border p-4 ${
        tone === 'danger'
          ? 'border-status-danger-border bg-status-danger-bg'
          : 'border-status-warn-border bg-status-warn-bg'
      }`}>
        <AlertTriangle
          className={`mt-0.5 h-5 w-5 shrink-0 ${tone === 'danger' ? 'text-status-danger-text' : 'text-status-warn-text'}`}
          aria-hidden="true"
        />
        <p className="text-sm leading-6 text-foreground">
          此操作會立即生效，請確認目前選擇正確。
        </p>
      </div>
      {confirmationText && (
        <div className="mt-4">
          <label htmlFor={confirmationInputId} className="text-sm font-medium text-foreground">
            請輸入「{confirmationText}」以繼續
          </label>
          <input
            id={confirmationInputId}
            value={typedText}
            onChange={event => setTypedText(event.target.value)}
            disabled={isConfirming}
            autoComplete="off"
            className="mt-2 min-h-11 w-full rounded-control border border-primary/20 bg-white px-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}
    </AppDialog>
  );
}
