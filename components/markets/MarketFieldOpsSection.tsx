import { Archive } from 'lucide-react';
import { ChecklistPanel } from '@/components/markets/ChecklistPanel';
import { FieldNotesPanel } from '@/components/markets/FieldNotesPanel';
import { MarketReferenceNotePanel } from '@/components/markets/MarketReferenceNotePanel';

interface MarketFieldOpsSectionProps {
  marketId: string;
  referenceNote?: string | null;
  canManageFieldNotes: boolean;
  canManageChecklist: boolean;
  canToggleChecklistItem: boolean;
  onChecklistRemainingChange?: (remaining: number) => void;
  readOnlyReason?: string;
}

export function MarketFieldOpsSection({
  marketId,
  referenceNote,
  canManageFieldNotes,
  canManageChecklist,
  canToggleChecklistItem,
  onChecklistRemainingChange,
  readOnlyReason,
}: MarketFieldOpsSectionProps) {
  return (
    <div className="mb-6 space-y-4">
      {readOnlyReason && (
        <div className="flex items-start gap-3 rounded-card border border-atelier-line bg-atelier-canvas px-4 py-3 text-sm text-atelier-muted">
          <Archive className="mt-0.5 h-4 w-4 shrink-0 text-atelier-blue" aria-hidden="true" />
          <p className="leading-relaxed">{readOnlyReason}</p>
        </div>
      )}
      <MarketReferenceNotePanel note={referenceNote} />
      <FieldNotesPanel
        marketId={marketId}
        canManage={canManageFieldNotes}
      />
      <ChecklistPanel
        marketId={marketId}
        canManage={canManageChecklist}
        canToggle={canToggleChecklistItem}
        onRemainingChange={onChecklistRemainingChange}
      />
    </div>
  );
}
