'use client';

import { AlertTriangle, Check, ClipboardPaste, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { buildMarketTextImportPatch, type MarketTextImportPatch } from '@/lib/market-text-import/merge';
import type {
  EvidenceSpan,
  FieldCandidate,
  MarketFormField,
  ParsedMarketDraft,
  ParsedMarketEvent,
} from '@/lib/market-text-import/types';
import { cn } from '@/lib/utils';

interface MarketTextImportPanelProps {
  inputText: string;
  currentValues: Partial<Record<MarketFormField, unknown>>;
  disabled?: boolean;
  onInputTextChange: (value: string) => void;
  onApply: (patch: MarketTextImportPatch) => void;
}

const DIRECT_SELECTION = '__direct__';

const FIELD_LABELS: Record<MarketFormField | 'warning_only', string> = {
  name: '市集名稱',
  location: '地點',
  dates: '市集日期',
  earlyEntryTime: '提前進場',
  checkInTime: '報到時間',
  operatingStartTime: '開始營業',
  operatingEndTime: '結束營業',
  boothCost: '攤位費',
  deposit: '保證金',
  commissionRate: '抽成比例',
  tableRental: '桌子租金',
  chairRental: '椅子租金',
  umbrellaRental: '傘具租金',
  tableFree: '免費桌子',
  chairFree: '免費椅子',
  umbrellaFree: '免費傘具',
  notes: '備註',
  warning_only: '提醒',
};

const STATUS_LABELS: Record<FieldCandidate<unknown>['status'], string> = {
  exact: '原文明確',
  inferable: '系統推定',
  choice_required: '需要選擇',
  conflict: '資訊衝突',
  not_present: '未提供',
  unsupported: '暫不支援套用',
  ignore: '不會填入',
};

const WARNING_LABELS: Record<string, string> = {
  event_selection_required: '原文包含多個活動，請先選擇一場。',
  choice_required: '有欄位需要你選擇正確方案。',
  core_conflict: '重要資訊互相衝突，請依原文確認。',
  external_value_unavailable: '部分資訊只存在外部連結，無法從貼上的文字判定。',
  conditional_schedule_unsupported: '日期相依或條件式時間無法安全填入單一欄位。',
  date_range_confirmation_required: '日期範圍較長，套用前請再次確認。',
  currency_unknown: '幣別無法確認，因此金額不會直接套用。',
  fee_date_mapping_unknown: '費用與日期的對應不明，金額不會直接套用。',
  private_content_detected: '原文可能包含私人資訊；系統只在此裝置分析。',
  unsupported_field: '這項資訊會保留供人工確認，不會直接填入欄位。',
};

const hasCurrentValue = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'boolean') return value;
  return value !== null && value !== undefined;
};

const localReferenceDate = (): string => {
  const date = new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, '0'))
    .join('-');
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '沒有可直接套用的單一值';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (Array.isArray(value)) return value.map(formatValue).join('、');
  if (typeof value !== 'object') return String(value);

  const record = value as Record<string, unknown>;
  if (typeof record.amount === 'number') {
    const unit = record.unit === 'per_day' ? '／日' : record.unit === 'per_item' ? '／件' : '';
    return `${record.amount.toLocaleString('zh-TW')} ${record.currency === 'TWD' ? '元' : '（幣別未確認）'}${unit}`;
  }
  if (record.kind === 'selected_dates' && Array.isArray(record.dates)) return record.dates.join('、');
  if (record.kind === 'single') return String(record.start ?? record.end ?? '');
  if (typeof record.provision === 'string') {
    const quantity = typeof record.quantity === 'number' ? ` × ${record.quantity}` : '';
    return `${String(record.detail ?? record.type ?? '設備')}${quantity}`;
  }
  if (typeof record.start === 'string' && typeof record.end === 'string') return `${record.start}－${record.end}`;
  return '保留原文供人工確認';
};

const defaultSelections = (
  event: ParsedMarketEvent,
  currentValues: Partial<Record<MarketFormField, unknown>>,
): Record<string, string> => {
  const output: Record<string, string> = {};
  for (const candidate of event.candidates) {
    if (candidate.applyPolicy !== 'eligible') continue;
    if (candidate.field === 'warning_only' || hasCurrentValue(currentValues[candidate.field])) continue;
    output[candidate.id] = DIRECT_SELECTION;
  }
  return output;
};

interface CandidateReviewCardProps {
  candidate: FieldCandidate<unknown>;
  evidence: EvidenceSpan[];
  currentValue: unknown;
  selectedValue?: string;
  disabled: boolean;
  onToggleDirect: (candidateId: string, checked: boolean) => void;
  onChooseOption: (candidate: FieldCandidate<unknown>, optionId: string, optionIndex: number) => void;
}

function CandidateReviewCard({
  candidate,
  evidence,
  currentValue,
  selectedValue,
  disabled,
  onToggleDirect,
  onChooseOption,
}: CandidateReviewCardProps) {
  const canApplyDirectly = candidate.applyPolicy === 'eligible';
  const needsChoice = candidate.applyPolicy === 'requires_option';
  const hasExisting = hasCurrentValue(currentValue);

  return (
    <article className={cn(
      'rounded-2xl border p-4',
      candidate.applyPolicy === 'never' ? 'border-primary/10 bg-muted/25' : 'border-primary/15 bg-atelier-paper',
    )}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {FIELD_LABELS[candidate.field] ?? '提醒'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{STATUS_LABELS[candidate.status]}</p>
        </div>
        {hasExisting && candidate.applyPolicy !== 'never' ? (
          <span className="rounded-full bg-soft-yellow px-2.5 py-1 text-[11px] font-medium text-secondary">
            目前已有內容
          </span>
        ) : null}
      </div>

      {needsChoice && candidate.options ? (
        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">選擇{FIELD_LABELS[candidate.field] ?? '候選值'}</legend>
          {candidate.options.map((option, index) => (
            <label key={option.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-primary/10 px-3 py-2.5 hover:border-primary/30">
              <input
                type="radio"
                name={candidate.id}
                value={option.id}
                checked={selectedValue === option.id}
                onChange={() => onChooseOption(candidate, option.id, index)}
                disabled={disabled}
                className="mt-0.5 h-4 w-4 border-primary/30 text-primary focus:ring-primary/40"
              />
              <span className="text-sm leading-5 text-foreground">{formatValue(option.value)}</span>
            </label>
          ))}
        </fieldset>
      ) : canApplyDirectly ? (
        <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl py-2">
          <input
            type="checkbox"
            aria-label={`套用${FIELD_LABELS[candidate.field] ?? '候選值'}`}
            checked={selectedValue === DIRECT_SELECTION}
            onChange={event => onToggleDirect(candidate.id, event.target.checked)}
            disabled={disabled}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-primary/30 text-primary focus:ring-primary/40"
          />
          <span className="text-sm leading-6 text-foreground">{formatValue(candidate.value)}</span>
        </label>
      ) : (
        <div className="mt-3 flex min-h-11 items-start gap-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
          <p className="text-sm leading-6 text-foreground">{formatValue(candidate.value)}</p>
        </div>
      )}

      {hasExisting && candidate.applyPolicy !== 'never' ? (
        <p className="mt-3 rounded-xl bg-soft-yellow/55 px-3 py-2 text-xs leading-5 text-secondary">
          若勾選套用，將取代目前的「{formatValue(currentValue)}」。
        </p>
      ) : null}

      {evidence.length > 0 ? (
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="min-h-11 cursor-pointer py-3 font-medium text-primary">查看判定原文</summary>
          <div className="mt-1 space-y-1 border-l-2 border-primary/15 pl-3">
            {evidence.map(item => <p key={item.id} className="whitespace-pre-wrap leading-5">{item.text}</p>)}
          </div>
        </details>
      ) : null}
    </article>
  );
}

export function MarketTextImportPanel({
  inputText,
  currentValues,
  disabled = false,
  onInputTextChange,
  onApply,
}: MarketTextImportPanelProps) {
  const [draft, setDraft] = useState<ParsedMarketDraft | null>(null);
  const [analyzedText, setAnalyzedText] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedEvent = useMemo(
    () => draft?.events.find(event => event.id === selectedEventId) ?? null,
    [draft, selectedEventId],
  );
  const evidenceById = useMemo(
    () => new Map(draft?.evidence.map(evidence => [evidence.id, evidence]) ?? []),
    [draft],
  );
  const resultIsStale = Boolean(draft && analyzedText !== inputText);

  const selectEvent = (event: ParsedMarketEvent) => {
    setSelectedEventId(event.id);
    setSelections(defaultSelections(event, currentValues));
    setMessage(null);
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setMessage('請先貼上市集資訊。');
      return;
    }
    setIsAnalyzing(true);
    setMessage(null);
    try {
      const { parseMarketText } = await import('@/lib/market-text-import/parser');
      const response = parseMarketText({
        inputText,
        referenceDate: localReferenceDate(),
        locale: 'zh-TW',
      });
      if (response.ok === false) {
        setDraft(null);
        setMessage(response.error.code === 'input_too_long' ? '貼上的內容過長，請只保留本次市集資訊。' : '目前無法分析這段文字。');
        return;
      }
      setDraft(response.draft);
      setAnalyzedText(inputText);
      const event = response.draft.events.length === 1 ? response.draft.events[0] : null;
      setSelectedEventId(event?.id ?? null);
      setSelections(event ? defaultSelections(event, currentValues) : {});
      setMessage(response.draft.disposition === 'reject'
        ? '這段文字看起來不是可新增的市集，沒有產生可套用欄位。'
        : null);
    } catch {
      console.error('分析市集文字失敗。');
      setMessage('分析沒有完成，原文與表單內容都已保留，請再試一次。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChooseOption = (
    candidate: FieldCandidate<unknown>,
    optionId: string,
    optionIndex: number,
  ) => {
    if (!selectedEvent) return;
    setSelections(previous => {
      const next = { ...previous, [candidate.id]: optionId };
      const option = candidate.options?.[optionIndex];
      for (const linkedCandidateId of option?.linkedCandidateIds ?? []) {
        if (linkedCandidateId === candidate.id) continue;
        const linkedCandidate = selectedEvent.candidates.find(item => item.id === linkedCandidateId);
        const linkedOption = linkedCandidate?.options?.[optionIndex];
        if (linkedCandidate && linkedOption) next[linkedCandidate.id] = linkedOption.id;
      }
      return next;
    });
    setMessage(null);
  };

  const handleApply = () => {
    if (!selectedEvent || resultIsStale) return;
    const selectionList = Object.entries(selections).map(([candidateId, selected]) => ({
      candidateId,
      ...(selected === DIRECT_SELECTION ? {} : { optionId: selected }),
    }));
    const patch = buildMarketTextImportPatch(selectedEvent, selectionList);
    if (patch.appliedCandidateIds.length === 0) {
      setMessage('請至少勾選一個可套用欄位。');
      return;
    }
    onApply(patch);
    setMessage(`已將 ${patch.appliedCandidateIds.length} 個欄位帶入表單，請繼續檢查後再建立市集。`);
  };

  const reviewCandidates = selectedEvent?.candidates.filter(candidate => (
    candidate.status !== 'not_present' && FIELD_LABELS[candidate.field]
  )) ?? [];
  const selectedCount = Object.keys(selections).length;
  const warnings = draft?.warnings ?? [];
  const sensitiveSpanCount = draft?.sensitiveSpans.length ?? 0;

  return (
    <section className="rounded-[1.75rem] border border-primary/15 bg-soft-green/35 p-4 sm:p-5" aria-labelledby="market-text-import-heading">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-atelier-paper text-primary shadow-sm">
          <ClipboardPaste className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="market-text-import-heading" className="text-base font-semibold text-foreground">從市集資訊帶入</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            貼上你已確認與本次市集有關的文字。分析只會提出候選值，不會建立市集或自動覆蓋欄位。
          </p>
        </div>
      </div>

      <label htmlFor="market-text-import-input" className="mt-4 block text-sm font-medium text-foreground">
        市集原文
      </label>
      <textarea
        id="market-text-import-input"
        value={inputText}
        onChange={event => {
          onInputTextChange(event.target.value);
          setMessage(null);
        }}
        disabled={disabled || isAnalyzing}
        rows={7}
        placeholder="貼上招募資訊、錄取通知或報名資訊……"
        className="mt-2 min-h-40 w-full resize-y rounded-2xl border border-primary/15 bg-atelier-paper px-4 py-3 text-sm leading-6 text-foreground shadow-sm outline-none placeholder:text-muted-foreground/65 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted/40"
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          原文只在此裝置分析，未完成草稿最多保留 30 分鐘；不會傳給 LLM、寫入市集或分析紀錄。
        </p>
        <div className="flex gap-2">
          {inputText ? (
            <Button
              variant="ghost"
              size="compact"
              disabled={disabled || isAnalyzing}
              onClick={() => {
                onInputTextChange('');
                setDraft(null);
                setSelectedEventId(null);
                setSelections({});
                setMessage(null);
              }}
            >
              清除原文
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="compact"
            leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
            isLoading={isAnalyzing}
            disabled={disabled || !inputText.trim()}
            onClick={handleAnalyze}
          >
            分析資訊
          </Button>
        </div>
      </div>

      {draft?.events.length && draft.events.length > 1 ? (
        <fieldset className="mt-5 rounded-2xl border border-primary/15 bg-atelier-paper p-4">
          <legend className="px-1 text-sm font-semibold text-foreground">這段文字包含多個活動，請選擇本次要新增的市集</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {draft.events.map(event => (
              <label key={event.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-primary/10 px-3 py-2.5 hover:border-primary/30">
                <input
                  type="radio"
                  name="market-text-import-event"
                  checked={selectedEventId === event.id}
                  onChange={() => selectEvent(event)}
                  disabled={disabled}
                  className="h-4 w-4 border-primary/30 text-primary focus:ring-primary/40"
                />
                <span className="text-sm text-foreground">{event.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {selectedEvent ? (
        <div className="mt-5 space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">確認要帶入的欄位</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">已勾選 {selectedCount} 項；灰色提醒只供參考，不會填入。</p>
            </div>
            {sensitiveSpanCount > 0 ? (
              <span className="rounded-full bg-soft-yellow px-2.5 py-1 text-[11px] font-medium text-secondary">偵測到可能的私人內容</span>
            ) : null}
          </div>

          {resultIsStale ? (
            <p className="rounded-xl border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text" role="status">
              原文已變更，請重新分析後再套用。
            </p>
          ) : null}

          {reviewCandidates.map(candidate => (
            <CandidateReviewCard
              key={candidate.id}
              candidate={candidate}
              evidence={candidate.evidenceIds.map(id => evidenceById.get(id)).filter((item): item is EvidenceSpan => Boolean(item))}
              currentValue={candidate.field === 'warning_only' ? undefined : currentValues[candidate.field]}
              selectedValue={selections[candidate.id]}
              disabled={disabled || resultIsStale}
              onToggleDirect={(candidateId, checked) => {
                setSelections(previous => {
                  const next = { ...previous };
                  if (checked) next[candidateId] = DIRECT_SELECTION;
                  else delete next[candidateId];
                  return next;
                });
                setMessage(null);
              }}
              onChooseOption={handleChooseOption}
            />
          ))}

          {warnings.length > 0 ? (
            <details className="rounded-2xl border border-primary/10 bg-atelier-paper p-4">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-foreground">
                查看 {warnings.length} 項分析提醒
              </summary>
              <ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">
                {warnings.map(warning => (
                  <li key={warning.id}>• {WARNING_LABELS[warning.code] ?? '請依原文確認這項資訊。'}</li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="flex justify-end">
            <Button
              onClick={handleApply}
              disabled={disabled || resultIsStale || selectedCount === 0}
              leadingIcon={<Check className="h-4 w-4" aria-hidden="true" />}
            >
              套用已選欄位
            </Button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-xl bg-atelier-paper px-3 py-2 text-sm leading-6 text-foreground" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </section>
  );
}
