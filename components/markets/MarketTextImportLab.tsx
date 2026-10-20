'use client';

import { AlertTriangle, Beaker, FileCheck2, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  buildMarketTextImportLabReviewRecord,
  type MarketTextImportLabVerdict,
} from '@/lib/market-text-import/lab-review';
import type { EvidenceSpan, FieldCandidate, ParsedMarketDraft, ParsedMarketEvent } from '@/lib/market-text-import/types';
import { cn } from '@/lib/utils';

const FIELD_LABELS: Record<string, string> = {
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

const VERDICT_OPTIONS: Array<{ value: MarketTextImportLabVerdict; label: string }> = [
  { value: 'not_reviewed', label: '尚未判讀' },
  { value: 'correct', label: '正確' },
  { value: 'incorrect', label: '錯填／不應出現' },
  { value: 'needs_rule', label: '需要補規則或 fixture' },
];

function formatLocalDate(): string {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, '0'))
    .join('-');
}

function formatCandidateValue(value: unknown): string {
  if (value === null || value === undefined) return '沒有單一可判定值';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (Array.isArray(value)) return value.map(formatCandidateValue).join('、');
  if (typeof value !== 'object') return '有結構化資料';

  const record = value as Record<string, unknown>;
  if (typeof record.amount === 'number') return `${record.amount.toLocaleString('zh-TW')} 元`;
  if (record.kind === 'selected_dates' && Array.isArray(record.dates)) return record.dates.join('、');
  if (record.kind === 'single') return [record.start, record.end].filter(Boolean).join('－');
  if (typeof record.start === 'string' && typeof record.end === 'string') return `${record.start}－${record.end}`;
  if (typeof record.provision === 'string') return `${String(record.detail ?? record.type ?? '設備')}（${record.provision}）`;
  return '有結構化資料，請查看 evidence 與狀態';
}

interface CandidateReviewRowProps {
  candidate: FieldCandidate<unknown>;
  evidence: EvidenceSpan[];
  verdict: MarketTextImportLabVerdict;
  onVerdictChange: (candidateId: string, verdict: MarketTextImportLabVerdict) => void;
}

function CandidateReviewRow({ candidate, evidence, verdict, onVerdictChange }: CandidateReviewRowProps) {
  return (
    <article className={cn(
      'rounded-2xl border p-4',
      candidate.applyPolicy === 'never' ? 'border-primary/10 bg-muted/25' : 'border-primary/15 bg-atelier-paper',
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{FIELD_LABELS[candidate.field] ?? candidate.field}</p>
          <p className="mt-1 text-xs text-muted-foreground">{STATUS_LABELS[candidate.status]} · {candidate.reasonCode}</p>
          <p className="mt-3 text-sm leading-6 text-foreground">{formatCandidateValue(candidate.value)}</p>
        </div>
        <label className="shrink-0 text-xs font-medium text-muted-foreground">
          人工判讀
          <select
            aria-label={`判讀${FIELD_LABELS[candidate.field] ?? candidate.field}`}
            value={verdict}
            onChange={event => onVerdictChange(candidate.id, event.target.value as MarketTextImportLabVerdict)}
            className="mt-1 block min-h-11 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {VERDICT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {candidate.options?.length ? (
        <ul className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground">
          {candidate.options.map(option => <li key={option.id}>候選方案：{formatCandidateValue(option.value)}</li>)}
        </ul>
      ) : null}

      {evidence.length ? (
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="min-h-11 cursor-pointer py-3 font-medium text-primary">查看判定原文</summary>
          <div className="space-y-1 border-l-2 border-primary/15 pl-3">
            {evidence.map(item => <p key={item.id} className="whitespace-pre-wrap leading-5">{item.text}</p>)}
          </div>
        </details>
      ) : null}
    </article>
  );
}

interface EventReviewProps {
  event: ParsedMarketEvent;
  evidenceById: Map<string, EvidenceSpan>;
  verdicts: Readonly<Record<string, MarketTextImportLabVerdict | undefined>>;
  onVerdictChange: (candidateId: string, verdict: MarketTextImportLabVerdict) => void;
}

function EventReview({ event, evidenceById, verdicts, onVerdictChange }: EventReviewProps) {
  const candidates = event.candidates.filter(candidate => candidate.status !== 'not_present');

  return (
    <section className="rounded-[1.5rem] border border-primary/15 bg-white/65 p-4 sm:p-5" aria-labelledby={`market-text-import-lab-${event.id}`}>
      <h3 id={`market-text-import-lab-${event.id}`} className="text-base font-semibold text-foreground">{event.label}</h3>
      <div className="mt-4 space-y-3">
        {candidates.map(candidate => (
          <CandidateReviewRow
            key={candidate.id}
            candidate={candidate}
            evidence={candidate.evidenceIds.map(id => evidenceById.get(id)).filter((item): item is EvidenceSpan => Boolean(item))}
            verdict={verdicts[candidate.id] ?? 'not_reviewed'}
            onVerdictChange={onVerdictChange}
          />
        ))}
      </div>
    </section>
  );
}

export function MarketTextImportLab() {
  const [inputText, setInputText] = useState('');
  const [referenceDate, setReferenceDate] = useState('');
  const [draft, setDraft] = useState<ParsedMarketDraft | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, MarketTextImportLabVerdict>>({});
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    setReferenceDate(formatLocalDate());
  }, []);

  const evidenceById = useMemo(
    () => new Map(draft?.evidence.map(evidence => [evidence.id, evidence]) ?? []),
    [draft],
  );
  const reviewJson = useMemo(() => {
    if (!draft || !referenceDate) return '';
    return JSON.stringify(buildMarketTextImportLabReviewRecord({
      inputText,
      referenceDate,
      draft,
      verdicts,
      note,
    }), null, 2);
  }, [draft, inputText, note, referenceDate, verdicts]);

  const clearAnalysis = () => {
    setDraft(null);
    setVerdicts({});
    setNote('');
  };

  const handleAnalyze = async () => {
    if (!inputText.trim() || !referenceDate) {
      setMessage('請先貼上市集資訊並指定參考日期。');
      return;
    }

    setIsAnalyzing(true);
    setMessage(null);
    try {
      clearAnalysis();
      const { parseMarketText } = await import('@/lib/market-text-import/parser');
      const response = parseMarketText({ inputText, referenceDate, locale: 'zh-TW' });
      if (response.ok === false) {
        clearAnalysis();
        setMessage(response.error.code === 'input_too_long'
          ? '文字超過 20,000 個字元，請只保留本次活動相關內容。'
          : '無法分析這段文字，請確認輸入與參考日期。');
        return;
      }
      setDraft(response.draft);
      setVerdicts({});
      setNote('');
      setMessage(response.draft.disposition === 'reject'
        ? '這段文字被安全地判定為不適合建立市集，沒有產生可用活動。'
        : '分析完成。請逐欄人工判讀，再使用下方 review JSON 記錄結果。');
    } catch {
      setMessage('分析未完成；原文仍只保留在目前頁面記憶體。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <header className="rounded-[2rem] bg-primary px-5 py-7 text-white sm:px-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Beaker className="h-6 w-6" aria-hidden="true" /></span>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-white/70">INTERNAL LAB</p>
            <h1 className="mt-1 text-2xl font-semibold">市集文字解析實驗室</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80">測試純 parser、逐欄人工判讀，建立可追蹤的規則改進線索；這裡不會新增市集或連線寫入資料庫。</p>
          </div>
        </div>
      </header>

      <section className="rounded-[1.5rem] border border-primary/15 bg-soft-green/35 p-4 sm:p-5" aria-labelledby="market-text-import-lab-input-heading">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <h2 id="market-text-import-lab-input-heading" className="text-base font-semibold text-foreground">測試輸入</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">原文只存在這個頁面的記憶體；重新整理、離開頁面或關閉分頁就會清除。請不要將含個資的原文另存為 fixture。</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_13rem]">
          <label className="block text-sm font-medium text-foreground">
            市集資訊原文
            <textarea
              value={inputText}
              onChange={event => {
                setInputText(event.target.value);
                clearAnalysis();
                setMessage(null);
              }}
              rows={13}
              placeholder="貼上招募資訊、報名資訊或錄取通知……"
              className="mt-2 min-h-64 w-full resize-y rounded-2xl border border-primary/15 bg-atelier-paper px-4 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/65 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              參考日期
              <input
                type="date"
                value={referenceDate}
                onChange={event => {
                  setReferenceDate(event.target.value);
                  clearAnalysis();
                  setMessage(null);
                }}
                className="mt-2 min-h-11 w-full rounded-xl border border-primary/15 bg-atelier-paper px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <p className="text-xs leading-5 text-muted-foreground">用於解析缺少年份、相對日期等資訊；不會讀取目前市集資料。</p>
            <Button
              onClick={handleAnalyze}
              isLoading={isAnalyzing}
              disabled={!inputText.trim() || !referenceDate}
              leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              className="w-full justify-center"
            >
              分析文字
            </Button>
          </div>
        </div>
      </section>

      {message ? <p className="rounded-xl bg-atelier-paper px-4 py-3 text-sm leading-6 text-foreground" role="status" aria-live="polite">{message}</p> : null}

      {draft ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3" aria-label="分析摘要">
            <div className="rounded-2xl border border-primary/10 bg-atelier-paper p-4"><p className="text-xs text-muted-foreground">事件判定</p><p className="mt-1 text-sm font-semibold text-foreground">{draft.disposition}</p></div>
            <div className="rounded-2xl border border-primary/10 bg-atelier-paper p-4"><p className="text-xs text-muted-foreground">可審核程度</p><p className="mt-1 text-sm font-semibold text-foreground">{draft.readiness}</p></div>
            <div className="rounded-2xl border border-primary/10 bg-atelier-paper p-4"><p className="text-xs text-muted-foreground">提醒／敏感內容</p><p className="mt-1 text-sm font-semibold text-foreground">{draft.warnings.length}／{draft.sensitiveSpans.length}</p></div>
          </section>

          {draft.warnings.length ? (
            <section className="rounded-2xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">
              <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><div><p className="font-semibold">分析提醒</p><p className="mt-1 leading-6">{draft.warnings.map(warning => warning.code).join('、')}</p></div></div>
            </section>
          ) : null}

          <div className="space-y-4">
            {draft.events.map(event => (
              <EventReview
                key={event.id}
                event={event}
                evidenceById={evidenceById}
                verdicts={verdicts}
                onVerdictChange={(candidateId, verdict) => setVerdicts(previous => ({ ...previous, [candidateId]: verdict }))}
              />
            ))}
            {draft.events.length === 0 ? <p className="rounded-2xl border border-primary/10 bg-muted/30 p-4 text-sm text-muted-foreground">沒有可審核的活動欄位；請確認這是拒絕情境是否符合預期。</p> : null}
          </div>

          <section className="rounded-[1.5rem] border border-primary/15 bg-atelier-paper p-4 sm:p-5" aria-labelledby="market-text-import-lab-review-heading">
            <div className="flex items-start gap-3"><FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div><h2 id="market-text-import-lab-review-heading" className="text-base font-semibold text-foreground">Review 紀錄</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">這份 JSON 故意不包含原文、evidence、候選值與敏感內容。它可作為人工審核與規則改進的索引；要建立 fixture 時，請使用已去識別化的文字另行審核。</p></div></div>
            <label className="mt-4 block text-sm font-medium text-foreground">審核備註<textarea value={note} onChange={event => setNote(event.target.value)} rows={3} placeholder="例如：日期區間正確，但地點應保持空白。" className="mt-2 w-full resize-y rounded-xl border border-primary/15 bg-white px-3 py-2.5 text-sm leading-6 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
            <label className="mt-4 block text-sm font-medium text-foreground">Review JSON<textarea readOnly value={reviewJson} rows={14} className="mt-2 w-full resize-y rounded-xl border border-primary/15 bg-white px-3 py-2.5 font-mono text-xs leading-5 text-foreground outline-none" /></label>
          </section>
        </>
      ) : null}
    </div>
  );
}
