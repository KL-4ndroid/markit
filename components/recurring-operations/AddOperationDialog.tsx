'use client';

import { CalendarPlus, CalendarRange, ChevronRight, Settings2 } from 'lucide-react';
import { AppDialog } from '@/components/ui/AppDialog';
import { Button } from '@/components/ui/Button';

interface AddOperationDialogProps {
  open: boolean;
  onClose: () => void;
  onSingle: () => void;
  onWeekly: () => void;
  onManage: () => void;
}

const choiceClass = 'group flex min-h-24 w-full items-center gap-4 rounded-[1.25rem] border border-primary/15 bg-atelier-paper p-4 text-left shadow-sm transition hover:border-primary/35 hover:bg-soft-green/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';

export function AddOperationDialog({ open, onClose, onSingle, onWeekly, onManage }: AddOperationDialogProps) {
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="新增營業"
      description="選擇這次營業的安排方式。"
      size="md"
      footer={(
        <Button variant="ghost" onClick={onManage} leadingIcon={<Settings2 className="h-4 w-4" />}>
          管理固定安排
        </Button>
      )}
    >
      <div className="space-y-3">
        <button type="button" onClick={onSingle} className={choiceClass}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-soft-pink text-primary">
            <CalendarPlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-foreground">單次營業</span>
            <span className="mt-1 block text-sm leading-6 text-muted-foreground">適合市集、快閃或臨時活動</span>
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
        </button>

        <button type="button" onClick={onWeekly} className={choiceClass}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-soft-yellow text-secondary">
            <CalendarRange className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-foreground">每週固定</span>
            <span className="mt-1 block text-sm leading-6 text-muted-foreground">設定常用地點、星期與時間</span>
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
        </button>
      </div>
    </AppDialog>
  );
}
