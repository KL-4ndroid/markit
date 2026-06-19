import { ChecklistPanel } from '@/components/markets/ChecklistPanel';
import { FieldNotesPanel } from '@/components/markets/FieldNotesPanel';

interface MarketFieldOpsSectionProps {
  marketId: string;
  canManageFieldNotes: boolean;
  canManageChecklist: boolean;
  canToggleChecklistItem: boolean;
}

export function MarketFieldOpsSection({
  marketId,
  canManageFieldNotes,
  canManageChecklist,
  canToggleChecklistItem,
}: MarketFieldOpsSectionProps) {
  return (
    <div className="mb-6 space-y-4">
      <FieldNotesPanel
        marketId={marketId}
        canManage={canManageFieldNotes}
      />
      <ChecklistPanel
        marketId={marketId}
        canManage={canManageChecklist}
        canToggle={canToggleChecklistItem}
      />
    </div>
  );
}
