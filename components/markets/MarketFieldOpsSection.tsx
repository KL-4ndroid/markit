'use client';

import { useCallback, useState } from 'react';
import { Archive, ChevronDown, ClipboardCheck } from 'lucide-react';
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
  collapsibleOnMobile?: boolean;
  defaultMobileExpanded?: boolean;
}

export function MarketFieldOpsSection({
  marketId,
  referenceNote,
  canManageFieldNotes,
  canManageChecklist,
  canToggleChecklistItem,
  onChecklistRemainingChange,
  readOnlyReason,
  collapsibleOnMobile = false,
  defaultMobileExpanded = false,
}: MarketFieldOpsSectionProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(defaultMobileExpanded);
  const [remainingCount, setRemainingCount] = useState(0);
  const panelId = `market-field-ops-${marketId}`;
  const handleRemainingChange = useCallback((remaining: number) => {
    setRemainingCount(remaining);
    onChecklistRemainingChange?.(remaining);
  }, [onChecklistRemainingChange]);

  return (
    <div className="mb-6">
      {collapsibleOnMobile && (
        <button
          type="button"
          onClick={() => setIsMobileExpanded(current => !current)}
          aria-expanded={isMobileExpanded}
          aria-controls={panelId}
          className="flex min-h-14 w-full items-center gap-3 rounded-card bg-atelier-paper px-4 py-3 text-left shadow-atelier lg:hidden"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-atelier-blue-soft text-primary">
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-atelier-ink">現場工作</span>
            <span className="mt-0.5 block truncate text-[11px] text-atelier-muted">主辦備註、交接筆記與待辦</span>
          </span>
          {remainingCount > 0 && (
            <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-atelier-clay px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {remainingCount > 99 ? '99+' : remainingCount}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-atelier-muted transition-transform ${isMobileExpanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      )}

      <div
        id={panelId}
        className={`${collapsibleOnMobile && !isMobileExpanded ? 'hidden lg:block' : 'block'} ${collapsibleOnMobile ? 'mt-3 lg:mt-0' : ''} space-y-4`}
      >
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
          onRemainingChange={handleRemainingChange}
        />
      </div>
    </div>
  );
}
