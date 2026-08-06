import { ChecklistPanel } from '@/components/markets/ChecklistPanel';
import { FieldNotesPanel } from '@/components/markets/FieldNotesPanel';
import { MarketReferenceNotePanel } from '@/components/markets/MarketReferenceNotePanel';

interface MarketFieldOpsSectionProps {
  marketId: string;
  referenceNote?: string | null;
  canManageFieldNotes: boolean;
  canManageChecklist: boolean;
  canToggleChecklistItem: boolean;
}

export function MarketFieldOpsSection({
  marketId,
  referenceNote,
  canManageFieldNotes,
  canManageChecklist,
  canToggleChecklistItem,
}: MarketFieldOpsSectionProps) {
  return (
    <div className="mb-6 space-y-4">
      <MarketReferenceNotePanel note={referenceNote} />
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
