"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Market } from "@/types/db";
import {
  buildRegionAnalytics,
  validRegionDate,
} from "@/lib/analytics/region-analytics";
import { formatCashCents } from "@/lib/markets/market-cash";
import { StateView } from "@/components/ui/StateView";

export function RegionAnalyticsPanel({
  ownerId,
  markets,
  today,
  productNames,
  refreshRevision,
}: {
  ownerId: string;
  markets: Market[];
  today: string;
  productNames: Map<string, string>;
  refreshRevision: number;
}) {
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`),
    [to, setTo] = useState(today);
  const events = useLiveQuery(
    () =>
      db.events.where("type").anyOf(["deal_closed", "deal_deleted"]).toArray(),
    [ownerId, refreshRevision],
  );
  const result = useMemo(() => {
    if (!events) return null;
    try {
      return {
        data: buildRegionAnalytics({
          ownerId,
          markets,
          events,
          startDate: from,
          endDate: to,
          today,
          productNames,
        }),
        error: "",
      };
    } catch (e) {
      return { data: null, error: (e as Error).message };
    }
  }, [ownerId, markets, events, from, to, today, productNames]);
  const model = result?.data;
  const percentage = (part: number, total: number) =>
    total > 0 ? `${Math.round((part / total) * 100)}%` : "尚無金額";
  return (
    <section aria-label="縣市分析" className="space-y-4">
      <div className="rounded-card border border-primary/10 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold">縣市表現</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          按這段期間的有效成交統計。場次狀態與有成交紀錄的日數分開；尚未確認的零成交出攤日不列入平均。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            分析起日
            <input
              type="date"
              value={from}
              max={today}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 min-h-11 w-full min-w-0 rounded-xl border bg-white px-3 text-base sm:text-sm"
            />
          </label>
          <label className="text-sm">
            分析迄日
            <input
              type="date"
              value={to}
              min={validRegionDate(from) ? from : undefined}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 min-h-11 w-full min-w-0 rounded-xl border bg-white px-3 text-base sm:text-sm"
            />
          </label>
        </div>
        <Link
          href="/markets/regions"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
        >
          整理未分類縣市
        </Link>
      </div>
      {result === null ? (
        <StateView title="正在整理縣市成交資料" />
      ) : result.error ? (
        <StateView title="日期範圍待確認" description={result.error} />
      ) : (
        model && (
          <>
            <div className="rounded-card border border-primary/10 bg-white p-4 text-sm">
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt>已記錄營收</dt>
                  <dd className="mt-1 text-xl font-semibold">
                    {formatCashCents(model.totalRevenueCents)}
                  </dd>
                </div>
                <div>
                  <dt>縣市分類覆蓋</dt>
                  <dd className="mt-1 font-semibold">
                    {model.classifiedMarketCount}／{model.totalMarkets} 場
                  </dd>
                </div>
                <div>
                  <dt>已分類收入佔比</dt>
                  <dd>
                    {percentage(
                      model.classifiedRevenueCents,
                      model.totalRevenueCents,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>有效成交紀錄</dt>
                  <dd>{model.saleCount} 筆</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                包含未分類的收入；成交紀錄筆數不等於補登內的成交次數。取消場次若仍有有效成交，收入保留並單列狀態。這不是各縣市淨利排行。
              </p>
            </div>
            {(model.pendingCount > 0 ||
              model.projectionMismatchCount > 0 ||
              model.undatedCount > 0 ||
              model.invalidAmountCount > 0 ||
              model.futureCount > 0) && (
              <div
                role="status"
                className="space-y-1 rounded-card border border-status-warn-border bg-status-warn-bg p-4 text-sm"
              >
                <p className="font-semibold">資料範圍待確認</p>
                {model.pendingCount > 0 && (
                  <p>{model.pendingCount} 筆本機成交／撤回尚未確認同步。</p>
                )}
                {model.projectionMismatchCount > 0 && (
                  <p>
                    {model.projectionMismatchCount}{" "}
                    場的成交明細與整場總額尚不一致，可能仍有資料未完整載入。以下保留已讀到的紀錄。
                  </p>
                )}
                {model.undatedCount > 0 && (
                  <p>
                    {model.undatedCount}{" "}
                    筆成交缺少有效營業日，尚未納入期間統計。
                  </p>
                )}
                {model.invalidAmountCount > 0 && (
                  <p>
                    {model.invalidAmountCount} 筆期間內金額待確認，未當成零元。
                  </p>
                )}
                {model.futureCount > 0 && (
                  <p>{model.futureCount} 筆日期晚於今天的成交未列入。</p>
                )}
              </div>
            )}
            <div className="grid gap-4 xl:grid-cols-2">
              {model.rows.map((row) => (
                <article
                  key={row.code ?? "unclassified"}
                  className="min-w-0 rounded-card border border-primary/10 bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold">{row.label}</h3>
                    <p className="text-lg font-semibold">
                      {formatCashCents(row.revenueCents)}
                    </p>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">期間場次</dt>
                      <dd>{row.marketCount} 場</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">有成交紀錄場次</dt>
                      <dd>{row.recordedMarketCount} 場</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        有成交紀錄場次日
                      </dt>
                      <dd>{row.recordedDayCount} 天</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">紀錄日平均營收</dt>
                      <dd>
                        {row.averageCents === null
                          ? "尚無成交日紀錄"
                          : formatCashCents(row.averageCents)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    報名中{" "}
                    {(row.statuses.registered ?? 0) +
                      (row.statuses.accepted ?? 0) +
                      (row.statuses.paid ?? 0)}{" "}
                    場 · 取消 {row.statuses.cancelled ?? 0} 場 · 延期{" "}
                    {row.statuses.postponed ?? 0} 場 · 其他狀態{" "}
                    {(row.statuses.ongoing ?? 0) +
                      (row.statuses.completed ?? 0)}{" "}
                    場
                  </p>
                  {row.recordedMarketCount < 3 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      樣本仍少，先看原始紀錄，不據此判斷哪個縣市較好賣。
                    </p>
                  )}
                  <details className="mt-3 border-t border-primary/10 pt-3">
                    <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-primary">
                      商品表現與場次明細
                    </summary>
                    <p className="mb-2 text-xs text-muted-foreground">
                      商品明細收入覆蓋：
                      {percentage(row.detailRevenueCents, row.revenueCents)}
                      。純金額補登不推算商品；整單折扣按商品原價占比分配，可能有分位差。
                    </p>
                    {row.products.length === 0 ? (
                      <p className="text-sm">尚無可歸屬商品明細。</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {row.products.slice(0, 10).map((p) => (
                          <li key={p.id} className="flex justify-between gap-3">
                            <span className="min-w-0 break-words">
                              {p.name}
                              {p.unknown ? "（識別資料不足）" : ""}
                              <span className="block text-xs text-muted-foreground">
                                {p.quantity} 件
                              </span>
                            </span>
                            <span className="shrink-0">
                              {formatCashCents(p.revenueCents)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <ul className="mt-3 space-y-1">
                      {row.markets.map((m) => (
                        <li key={m.id}>
                          <Link
                            className="inline-flex min-h-11 items-center break-words text-sm text-primary underline underline-offset-4"
                            href={`/markets/detail?id=${encodeURIComponent(m.id)}`}
                          >
                            {m.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </article>
              ))}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              同日兩場計兩個場次日，多日同一市集仍計一場。縣市更正後按目前場次快照重新歸類；不使用自由文字猜測。資料來自這台裝置，尚未送達或未載入的其他裝置紀錄可能使結果改變。
              {model.updatedAt > 0
                ? `本機場次更新：${new Date(model.updatedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`
                : ""}
            </p>
          </>
        )
      )}
    </section>
  );
}
