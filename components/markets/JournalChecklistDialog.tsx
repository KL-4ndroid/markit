"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppDialog } from "@/components/ui/AppDialog";
import { generateUUID } from "@/lib/db";
import type { Market } from "@/types/db";
import type { MarketJournal } from "@/lib/markets/market-journal";
import {
  followupTargets,
  journalTaskSuggestions,
  journalTasksEnabled,
  ownerFollowupError,
  prepareJournalTaskRequest,
  type JournalTaskRequest,
} from "@/lib/markets/owner-followup";
import { applyJournalTasks } from "@/lib/supabase/owner-followup";
import { toDateKeyInTimeZone } from "@/lib/recurring-operations/date-key";
import { buildMarketDetailHref } from "@/lib/navigation/market-detail-route";

const button =
  "min-h-11 rounded-xl border border-primary/20 px-3 py-2 text-sm text-primary disabled:opacity-50";
export function JournalChecklistDialog({
  journal,
  markets,
  ownerId,
  onClose,
}: {
  journal: MarketJournal;
  markets: Market[];
  ownerId: string;
  onClose: () => void;
}) {
  const today = toDateKeyInTimeZone(new Date(), "Asia/Taipei");
  const targets = followupTargets(markets, ownerId, journal.marketId, today);
  const [target, setTarget] = useState(""),
    [checked, setChecked] = useState<Record<number, boolean>>({}),
    [edits, setEdits] = useState<Record<number, string>>({}),
    [custom, setCustom] = useState("");
  const [request, setRequest] = useState<JournalTaskRequest | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<{
      appliedCount: number;
      skippedCount: number;
    } | null>(null);
  const alive = useRef(true),
    saving = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const lines = journalTaskSuggestions(journal.body).slice(0, 100);
  const selectedCount = Object.values(checked).filter(Boolean).length;
  const prepare = () => {
    try {
      const market = targets.find((m) => m.id === target);
      if (!market) throw new Error("請選擇目標市集。");
      const texts = [
        ...lines.flatMap((line, index) =>
          checked[index] ? [edits[index] ?? line] : [],
        ),
        ...custom.split(/\r?\n/).filter((line) => line.trim()),
      ];
      setRequest(
        prepareJournalTaskRequest(
          journal,
          market,
          ownerId,
          today,
          texts,
          generateUUID(),
        ),
      );
      setError("");
    } catch (e) {
      setError(ownerFollowupError(e));
    }
  };
  const save = async () => {
    if (!request || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await applyJournalTasks(ownerId, request);
      if (alive.current) setResult(next);
    } catch (e) {
      if (alive.current) setError(ownerFollowupError(e));
    } finally {
      saving.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return (
    <AppDialog
      open
      onClose={onClose}
      dismissible={!busy}
      title="另建出攤待辦"
      description="選用。把需要記得的事寫成待辦，原心得會完整保留。"
      size="lg"
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-soft-yellow p-3 text-sm leading-6">
          心得仍只供自己回顧。若這場有員工協作，具有待辦權限的員工也看得到新待辦；請只填適合分享的準備事項。
        </p>
        {!journalTasksEnabled() && (
          <p role="status" className="text-sm">
            另建待辦尚未開放，仍可正常記錄與回顧心得。
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {result ? (
          <div className="space-y-3">
            <p role="status" className="text-sm">
              已加入 {result.appliedCount} 項，相同文字略過{" "}
              {result.skippedCount} 項；原待辦的完成狀態保持不變。
            </p>
            <Link
              className={`${button} inline-flex items-center`}
              href={buildMarketDetailHref(request!.marketId, { returnTo: 'journals' })}
            >
              查看目標市集
            </Link>
            <button className={button} onClick={onClose}>
              完成
            </button>
          </div>
        ) : request ? (
          <div className="space-y-3">
            <h3 className="font-semibold">
              加入「
              {targets.find((m) => m.id === request.marketId)?.name ??
                "所選市集"}
              」
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {request.texts.map((text, index) => (
                <li key={index} className="break-words">
                  {text}
                </li>
              ))}
            </ul>
            <p className="text-xs leading-5 text-muted-foreground">
              只加入以上文字，不附心得全文或來源連結。需要連線；相同文字（包含已完成項目）會略過。
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className={`${button} bg-primary text-white`}
                disabled={busy || !journalTasksEnabled()}
                onClick={() => void save()}
              >
                {busy ? "正在加入…" : "確認加入待辦"}
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  setRequest(null);
                  setError("");
                }}
              >
                返回調整
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm">
              要記得的事（每行一項）
              <textarea
                rows={3}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="mt-1 w-full rounded-xl border p-3 text-base sm:text-sm"
                placeholder="例如：帶照明設備、提早半小時到場"
              />
            </label>
            <label className="block text-sm">
              目標市集
              <select
                className="mt-1 min-h-11 w-full min-w-0 rounded-xl border px-3 text-base sm:text-sm"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">選擇今日或接下來的其他市集</option>
                {targets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.startDate} · {m.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs leading-5 text-muted-foreground">
              請選擇適用的場次；停車與進場時間等經驗，可能只適用原來的場地。不會自動帶入每一場市集。
            </p>
            {targets.length === 0 && (
              <p className="text-sm">
                目前沒有可加入的其他市集。請先建立接下來的市集；取消、延期與已結束場次不列入。
              </p>
            )}
            <details className="rounded-xl border border-primary/10">
              <summary className="min-h-11 cursor-pointer rounded-xl px-3 py-3 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                從心得原文挑選（選用）
                {selectedCount > 0 && `・已選 ${selectedCount} 項`}
              </summary>
              <fieldset className="space-y-3 border-t border-primary/10 p-3">
                <legend className="sr-only">挑選心得文字</legend>
                <p className="text-xs leading-5 text-muted-foreground">
                  預設不勾選。只挑要執行的事項，可改寫後再加入。
                </p>
                {lines.map((line, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-primary/10 p-3"
                  >
                    <label className="flex min-h-11 items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 shrink-0"
                        checked={Boolean(checked[index])}
                        onChange={(e) =>
                          setChecked({ ...checked, [index]: e.target.checked })
                        }
                      />
                      <span className="break-words">{line}</span>
                    </label>
                    {checked[index] && (
                      <label className="mt-2 block text-xs">
                        待辦文字 {index + 1}
                        <textarea
                          rows={2}
                          value={edits[index] ?? line}
                          onChange={(e) =>
                            setEdits({ ...edits, [index]: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border p-3 text-base sm:text-sm"
                        />
                      </label>
                    )}
                  </div>
                ))}
              </fieldset>
            </details>
            <p className="text-xs text-muted-foreground">
              每項最多 200 字，一次最多 20
              項；只有自行填入與勾選的文字會進入下一步。未確認加入的內容，關閉後不保存。
            </p>
            <button
              className={`${button} bg-primary text-white`}
              disabled={!target || (!custom.trim() && selectedCount === 0)}
              onClick={prepare}
            >
              預覽待辦內容
            </button>
          </div>
        )}
      </div>
    </AppDialog>
  );
}
