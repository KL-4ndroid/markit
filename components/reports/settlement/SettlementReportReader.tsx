'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, ChevronRight, FileText } from 'lucide-react';
import { formatCurrency, formatDisplayDateRange } from '@/lib/presentation/formatters';
import { buildReportEntityHref, isValidReportPeriod, presetReportPeriod, type ReportPeriodSelection, type ReportReaderView } from '@/lib/reporting/settlement-report-navigation';
import type { SettlementReportModel } from '@/lib/reporting/settlement-report';
import type { ReadingMarketRow } from '@/lib/reporting/settlement-report-reading';
import type { SettlementReportPreviewModel } from '@/lib/reporting/settlement-report-preview';
import { marketJournalsEnabled } from '@/lib/markets/market-journal';

const sectionClass = 'scroll-mt-6 rounded-card border border-atelier-line bg-atelier-paper p-4 sm:p-6';
const linkClass = 'inline-flex min-h-11 items-center gap-2 rounded-control text-sm font-medium text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';
const fieldClass = 'min-h-11 min-w-0 rounded-control border border-atelier-line bg-atelier-paper px-3 text-base';
const number = (value: number) => new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0}).format(value);
const states = {recorded:'已有收入紀錄',missing:'待補收入',upcoming:'尚未開攤','activity-only':'收入結果待確認'};

export function ReportPeriodControls({ period, today, forceCustom=false, onApply }: {
  period: ReportPeriodSelection; today: string; forceCustom?: boolean; onApply: (period: ReportPeriodSelection) => void;
}) {
  const date = new Date(`${today}T12:00:00`);
  const current = presetReportPeriod('current',date);
  const previous = presetReportPeriod('previous',date);
  const selected = (candidate: ReportPeriodSelection) => period.startDate === candidate.startDate && period.endDate === candidate.endDate;
  const [custom,setCustom] = useState(forceCustom);
  const [error,setError] = useState<string|null>(null);
  return <div className="rounded-control border border-atelier-line bg-atelier-paper p-3">
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="報告期間快捷選擇">
      {([['本月',current],['上月',previous]] as const).map(([label,next])=><button key={label} type="button" aria-pressed={selected(next) && !custom} className={`${linkClass} px-3 ${selected(next) && !custom ? 'bg-primary text-white' : 'bg-atelier-canvas'}`} onClick={()=>{setCustom(false);setError(null);onApply(next);}}>{label}</button>)}
      <button type="button" aria-expanded={custom} aria-controls={custom ? 'report-custom-period' : undefined} className={`${linkClass} px-3 ${custom || (!selected(current) && !selected(previous)) ? 'bg-primary text-white' : 'bg-atelier-canvas'}`} onClick={()=>setCustom(value=>!value)}>自訂</button>
    </div>
    <p className="mt-2 text-sm text-muted-foreground">{formatDisplayDateRange(period.startDate,period.endDate)}</p>
    {custom && <form id="report-custom-period" className="mt-3 grid min-w-0 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" aria-label="自訂報告期間" onSubmit={event=>{
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const draft = {kind:period.kind,startDate:String(fields.get('start')),endDate:String(fields.get('end'))};
      if (!isValidReportPeriod(draft)) {setError('請確認日期，結束日期不可早於開始日期。');return;}
      setError(null);setCustom(false);onApply(draft);
    }}>
      <label className="min-w-0 text-sm font-medium">開始日期<input name="start" type="date" required className={`${fieldClass} mt-1 w-full`} defaultValue={period.startDate} /></label>
      <label className="min-w-0 text-sm font-medium">結束日期<input name="end" type="date" required className={`${fieldClass} mt-1 w-full`} defaultValue={period.endDate} /></label>
      <button type="submit" className="min-h-11 rounded-control bg-primary px-4 text-sm font-medium text-white">查看報告</button>
      {error && <p role="alert" className="text-sm text-danger sm:col-span-3">{error}</p>}
    </form>}
  </div>;
}

export function ReportReaderHeader({children}: {children:ReactNode}) {
  return <header id="report-top" className="rounded-b-[2rem] bg-atelier-sage-soft px-4 pb-5 pt-4 sm:px-6">
    <div className="mx-auto max-w-6xl"><Link href="/analytics" className={linkClass}><ArrowLeft className="h-4 w-4" aria-hidden="true" />返回分析</Link>
      <h1 className="mb-3 mt-2 flex items-center gap-2 text-2xl font-semibold"><FileText className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />完整結算報告</h1>{children}</div>
  </header>;
}

export function SettlementReportReader({report,productIds,exportActions,view,onViewChange}: {
  report:SettlementReportModel; preview?:SettlementReportPreviewModel; productIds:readonly string[]; exportActions:ReactNode;
  view?:ReportReaderView; onViewChange?:(view:ReportReaderView)=>void;
}) {
  const [localView,setLocalView] = useState<ReportReaderView>({markets:5,products:5,sort:'date'});
  const state = view ?? localView;
  const change = (next:ReportReaderView) => onViewChange ? onViewChange(next) : setLocalView(next);
  const reading = report.reading;
  const journalsAvailable = marketJournalsEnabled();
  if (!reading) return <p role="status" className="p-5">請重新整理以載入新版報告。</p>;
  if (!reading.rows.length) return <article className="mx-auto max-w-6xl px-4 py-5 sm:px-6" aria-label="完整結算報告內容"><section className={sectionClass}><h2 className="text-lg font-semibold">本期沒有可納入的市集</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">此期間沒有可納入回顧的市集，可調整日期查看。</p><Link className={`${linkClass} mt-3`} href="/analytics">返回分析</Link></section></article>;
  const knownProducts = new Set(productIds);
  const actionIssues = reading.issues.filter(issue=>issue.kind === 'action');
  const statusIssues = reading.issues.filter(issue=>issue.kind === 'status');
  const methodIssues = reading.issues.filter(issue=>issue.kind === 'method');
  const costDates = reading.issues.find(issue=>issue.key === 'cost')?.datesByMarket;
  const upcomingRows = reading.rows.filter(row=>row.state === 'upcoming');
  const href = (type:'market'|'product',id:string,task?:string,date?:string) => buildReportEntityHref(type,id,report.period,state,task,date);
  const titleLink = (type:'market'|'product',id:string,name:string,task?:string,date?:string) => type === 'market' || knownProducts.has(id)
    ? <Link href={href(type,id,task,date)} className={`${linkClass} min-w-0 break-words [overflow-wrap:anywhere]`}><span>{name}</span><ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>
    : <span className="break-words [overflow-wrap:anywhere]">{name}<small className="mt-1 block text-xs text-muted-foreground">商品資料待補齊</small></span>;
  const sorted = reading.rows.filter(row=>row.state !== 'upcoming').sort((a,b)=>{
    const score = (row:ReadingMarketRow) => state.sort === 'revenue' ? row.state === 'recorded' && row.revenueUsable ? row.revenue : null : state.sort === 'daily' ? row.dailyRevenue : row.estimatedProfit;
    if (state.sort !== 'date') { const left=score(a);const right=score(b);if(left===null && right!==null)return 1;if(left!==null && right===null)return -1;if(left!==null && right!==null && left!==right)return right-left; }
    return ({recorded:0,missing:1,'activity-only':1,upcoming:2}[a.state]-{recorded:0,missing:1,'activity-only':1,upcoming:2}[b.state])||b.startDate.localeCompare(a.startDate)||a.marketName.localeCompare(b.marketName);
  });
  const marketLimit = Math.max(state.markets,sorted.findIndex(row=>row.marketId===state.focusMarket)+1);
  const productLimit = Math.max(state.products,report.productRows.findIndex(row=>row.productId===state.focusProduct)+1);
  const markets = sorted.slice(0,marketLimit);
  const products = report.productRows.slice(0,productLimit);
  const marketName = (id:string) => reading.rows.find(row=>row.marketId===id)?.marketName ?? '查看場次';
  const revenue = (row:ReadingMarketRow) => row.state === 'recorded' ? row.revenueUsable ? formatCurrency(row.revenue) : '待核對' : states[row.state];
  const profit = (row:ReadingMarketRow) => row.estimatedProfit === null ? '待確認' : formatCurrency(row.estimatedProfit);
  const chapter = [['overview','本期總覽'],['markets','市集表現'],...(report.productRows.length ? [['products','商品表現']] : []),['costs','成本說明'],...(actionIssues.length ? [['quality','紀錄待確認']] : [])];
  const focus = state.focusMarket && reading.rows.some(row=>row.marketId===state.focusMarket)
    ? {label:marketName(state.focusMarket),anchor:`market-${state.focusMarket}`}
    : state.focusProduct && report.productRows.some(row=>row.productId===state.focusProduct)
      ? {label:report.productRows.find(row=>row.productId===state.focusProduct)!.productName,anchor:`product-${state.focusProduct}`} : null;

  return <article className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6" aria-label="完整結算報告內容">
    <p className="break-words text-sm font-medium">{report.brandName} · {report.period.label}<small className="mt-1 block font-normal text-muted-foreground">紀錄截至 {reading.asOfDate}</small></p>
    {focus && <><a href={`#${focus.anchor}`} className={`${linkClass} w-full border border-atelier-line bg-atelier-paper px-3 py-2 md:hidden`}>繼續查看：{focus.label}<ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" /></a><a href={`#table-${focus.anchor}`} className={`${linkClass} hidden w-full border border-atelier-line bg-atelier-paper px-3 py-2 md:inline-flex`}>繼續查看：{focus.label}<ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" /></a></>}
    <section id="overview" className={sectionClass} aria-labelledby="report-overview-title">
      <h2 id="report-overview-title" className="text-lg font-semibold">本期總覽</h2>
      <dl className="mt-3 grid min-w-0 grid-cols-2 gap-3">
        <div className="min-w-0"><dt className="text-sm text-muted-foreground">已記錄收入</dt><dd className="mt-1 break-words text-3xl font-semibold tabular-nums">{reading.revenueUsable ? formatCurrency(report.money.totalRevenue) : '待核對'}</dd></div>
        <div className="min-w-0"><dt className="text-sm text-muted-foreground">估計淨利</dt><dd className="mt-1 break-words text-xl font-semibold tabular-nums">{reading.estimatedProfit === null ? reading.recordedCount === 0 ? '—' : <a href={actionIssues.length ? "#quality" : "#costs"} className="text-primary underline underline-offset-4">待確認</a> : formatCurrency(reading.estimatedProfit)}</dd></div>
        <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-atelier-line pt-3 text-sm"><div><dt className="inline text-muted-foreground">有收入紀錄 </dt><dd className="inline font-medium">{reading.recordedCount} 場</dd></div><div><dt className="inline text-muted-foreground">成交 </dt><dd className="inline font-medium">{reading.revenueUsable ? `${number(report.activity.totalDeals)} 筆` : '待核對'}</dd></div></div>
      </dl>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{reading.highlights[0]}</p>
      {reading.estimatedProfit === null && reading.confirmedProfit && <details className="mt-3 border-t border-atelier-line pt-1"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">已確認 {reading.confirmedProfit.count} 場估計淨利小計 {formatCurrency(reading.confirmedProfit.amount)}</summary><p className="text-xs leading-6 text-muted-foreground">僅包含下列收入日期完整、成本足夠的場次；其餘 {reading.rows.filter(row=>row.state !== 'upcoming').length-reading.confirmedProfit.count} 場未納入，不代表全期淨利。</p><ul>{reading.confirmedProfit.marketIds.map(id=><li key={id}>{titleLink('market',id,marketName(id))}</li>)}</ul></details>}
      {actionIssues.length > 0 && <a href="#quality" className={`${linkClass} mt-2`}>查看 {actionIssues.length} 項待確認事項<ChevronRight className="h-4 w-4" aria-hidden="true" /></a>}
    </section>

    <nav aria-label="報告章節" className="flex flex-wrap gap-x-4 gap-y-1 border-y border-atelier-line py-1">{chapter.map(([id,label])=><a key={id} href={`#${id}`} className={linkClass}>{label}</a>)}</nav>

    {reading.highlights.length > 1 && <section className={sectionClass} aria-label="本期值得注意"><h2 className="font-semibold">本期值得注意</h2><ul className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{reading.highlights.slice(1,4).map(text=><li key={text}>{text}</li>)}</ul></section>}

    {reading.comparison && reading.recordedCount > 0 && <section className={sectionClass} aria-labelledby="report-comparison-title"><h2 id="report-comparison-title" className="font-semibold">與前一個同長期間比較</h2>
      <p className="mt-2 text-sm text-muted-foreground">比較基準：{formatDisplayDateRange(reading.comparison.startDate,reading.comparison.endDate)}</p>
      {reading.comparison.available ? <><table className="mt-3 w-full table-fixed text-right text-sm"><caption className="sr-only">前期與本期收入及出攤量比較</caption><thead><tr className="border-b border-atelier-line"><th scope="col" className="w-2/5 py-3 text-left">項目</th><th scope="col">前期</th><th scope="col">本期</th></tr></thead><tbody>{[
        ['已記錄收入',formatCurrency(reading.comparison.previousRevenue),formatCurrency(report.money.totalRevenue)],
        ['有收入紀錄場次',`${reading.comparison.previousMarkets} 場`,`${reading.comparison.currentMarkets} 場`],
        ['場次紀錄日',`${reading.comparison.previousDays} 日`,`${reading.recordedDays} 日`],
        ['每場紀錄日平均',formatCurrency(reading.comparison.previousDailyRevenue ?? 0),formatCurrency(reading.comparison.currentDailyRevenue ?? 0)],
      ].map(([label,before,now])=><tr key={label} className="border-b border-atelier-line"><th scope="row" className="py-3 pr-2 text-left font-normal">{label}</th><td className="break-words tabular-nums">{before}</td><td className="break-words tabular-nums">{now}</td></tr>)}</tbody></table><p className="mt-3 text-sm">本期收入差額 <strong className="tabular-nums">{formatCurrency(reading.comparison.difference!)}</strong></p></> : null}
      <p className="mt-3 text-xs leading-6 text-muted-foreground">{reading.comparison.reason}</p>
    </section>}

    <section id="markets" className={sectionClass} aria-labelledby="report-markets-title">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="report-markets-title" className="text-lg font-semibold">市集表現 <span className="text-sm font-normal text-muted-foreground">{reading.rows.length} 場</span></h2>
        {sorted.length > 1 && <label className="flex items-center gap-2 text-sm">排序<select aria-label="市集排序" className={fieldClass} value={state.sort} onChange={event=>change({...state,sort:event.target.value as ReportReaderView['sort']})}><option value="date">有紀錄優先</option><option value="revenue">已記錄收入</option><option value="daily">每場紀錄日平均</option><option value="profit">可比較的估計淨利</option></select></label>}</div>
      {state.sort === 'profit' && <p className="mt-3 text-sm leading-6 text-muted-foreground">僅比較有成本紀錄且日期完整的場次，其餘場次列於後方；未填費用仍可能影響估計。</p>}
      {!markets.length ? <p className="mt-3 text-sm text-muted-foreground">本期市集尚未開攤，開始記錄後即可回顧。</p> : <>
        <div className="mt-4 space-y-3 md:hidden">{markets.map(row=><div key={row.marketId} id={`market-${row.marketId}`} className="scroll-mt-6 rounded-control border border-atelier-line p-3">
          {titleLink('market',row.marketId,row.marketName)}<p className="text-xs leading-5 text-muted-foreground">{formatDisplayDateRange(row.startDate,row.endDate)} · {states[row.state]}{row.isPartial ? ' · 金額僅計本期日期' : ''}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">收入</dt><dd className="mt-1 font-semibold tabular-nums">{revenue(row)}</dd></div><div><dt className="text-muted-foreground">估計淨利</dt><dd className="mt-1 tabular-nums">{row.state === 'recorded' ? profit(row) : '—'}</dd></div></dl>
          {row.state === 'recorded' && <p className="mt-2 text-xs text-muted-foreground">{row.dealCount} 筆成交 · {row.recordedDays} 個紀錄日{row.dailyRevenue !== null ? ` · 每場紀錄日平均 ${formatCurrency(row.dailyRevenue)}` : ''}</p>}
          {row.missingDates.length > 0 && <Link href={href('market',row.marketId,'performance')} className={linkClass}>查看 {row.missingDates.length} 個待補日期</Link>}
          <div className="mt-2 flex flex-wrap gap-x-4">{journalsAvailable && <Link className={linkClass} href={href('market',row.marketId,'journal')}>回顧出攤心得</Link>}{row.state === 'recorded' && !row.costRecorded && <Link className={linkClass} href={href('market',row.marketId,'performance',costDates?.[row.marketId]?.[0])}>核對每日銷售成本</Link>}</div>
        </div>)}</div>
        <div className="mt-4 hidden md:block"><table className="w-full table-fixed text-left text-sm"><caption className="sr-only">市集紀錄狀態、收入與估計淨利比較</caption><thead><tr className="border-b border-atelier-line"><th scope="col" className="w-2/5 py-3">市集／紀錄狀態</th><th scope="col">收入</th><th scope="col">每日平均</th><th scope="col">估計淨利</th></tr></thead><tbody>{markets.map(row=><tr key={row.marketId} id={`table-market-${row.marketId}`} className="border-b border-atelier-line"><th scope="row" className="py-3 pr-4 font-medium">{titleLink('market',row.marketId,row.marketName)}<p className="text-xs font-normal text-muted-foreground">{formatDisplayDateRange(row.startDate,row.endDate)} · {states[row.state]} · {row.recordedDays} 個紀錄日</p>{journalsAvailable && <Link className={linkClass} href={href('market',row.marketId,'journal')}>出攤心得</Link>}</th><td className="break-words tabular-nums">{revenue(row)}</td><td className="break-words tabular-nums">{row.dailyRevenue === null ? '—' : formatCurrency(row.dailyRevenue)}</td><td className="break-words tabular-nums">{row.state === 'recorded' ? profit(row) : '—'}</td></tr>)}</tbody></table></div>
        {markets.length < sorted.length && <button type="button" className={`${linkClass} mt-3 w-full justify-center border border-atelier-line px-3`} onClick={()=>change({...state,markets:markets.length+10})}>顯示更多市集（已顯示 {markets.length}／{sorted.length} 場）</button>}
        <p className="mt-3 text-xs leading-6 text-muted-foreground">每場紀錄日平均按各場有紀錄日期計算，沒有完整日期紀錄時暫不比較；不代表每小時收入。</p>
      </>}
      {upcomingRows.length > 0 && <details className="mt-3 border-t border-atelier-line pt-1" open={upcomingRows.some(row=>row.marketId === state.focusMarket) || undefined}><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">尚未開攤 {upcomingRows.length} 場</summary><ul className="space-y-2">{upcomingRows.map(row=><li id={`market-${row.marketId}`} key={row.marketId}><span id={`table-market-${row.marketId}`} />{titleLink('market',row.marketId,row.marketName)}<p className="text-xs text-muted-foreground">{formatDisplayDateRange(row.startDate,row.endDate)}</p></li>)}</ul></details>}
    </section>

    {products.length > 0 ? <section id="products" className={sectionClass} aria-labelledby="report-products-title"><h2 id="report-products-title" className="text-lg font-semibold">商品表現 <span className="text-sm font-normal text-muted-foreground">依已記錄銷量排列</span></h2>
      <p className="mt-2 text-sm leading-6">有商品明細收入 {formatCurrency(reading.productCoverage.itemizedRevenue)}／已記錄總收入 {reading.revenueUsable ? formatCurrency(reading.productCoverage.totalRevenue) : '待核對'}</p>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">{reading.productCoverage.status === 'invalid' ? '明細與總收入範圍不一致，請先核對來源，不據此判斷完整商品表現。' : reading.productCoverage.status === 'partial' ? '部分收入沒有商品明細，以下件數只代表已記錄商品。' : '只包含有商品明細的成交，總額收入不會推算成商品銷量。'}</p>
      <div className="mt-3 space-y-3 md:hidden">{products.map(row=><div key={row.productId} id={`product-${row.productId}`} className="scroll-mt-6 rounded-control border border-atelier-line p-3">{titleLink('product',row.productId,row.productName)}<p className="mt-2 text-sm">售出 {number(row.quantity)} 件 · 收入 {formatCurrency(row.revenue)}</p>{reading.inventory[row.productId] && <p className="mt-1 text-xs text-muted-foreground">目前庫存：{reading.inventory[row.productId].unlimited ? '不限' : reading.inventory[row.productId].stock ?? '未記錄'}</p>}</div>)}</div>
      <div className="mt-3 hidden md:block"><table className="w-full table-fixed text-left text-sm"><caption className="sr-only">已記錄商品銷量與收入</caption><thead><tr className="border-b border-atelier-line"><th className="w-1/2 py-3" scope="col">商品</th><th scope="col">售出</th><th scope="col">收入</th><th scope="col">目前庫存</th></tr></thead><tbody>{products.map(row=><tr key={row.productId} id={`table-product-${row.productId}`} className="border-b border-atelier-line"><th scope="row" className="py-2 pr-4 font-medium">{titleLink('product',row.productId,row.productName)}</th><td>{number(row.quantity)} 件</td><td>{formatCurrency(row.revenue)}</td><td>{reading.inventory[row.productId]?.unlimited ? '不限' : reading.inventory[row.productId]?.stock ?? '未記錄'}</td></tr>)}</tbody></table></div>
      {products.length < report.productRows.length && <button type="button" className={`${linkClass} mt-3 w-full justify-center border border-atelier-line px-3`} onClick={()=>change({...state,products:products.length+10})}>顯示更多商品（已顯示 {products.length}／{report.productRows.length} 項）</button>}
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">查看商品毛利估算</summary><p className="text-xs leading-6 text-muted-foreground">依目前商品成本估算，非成交當時成本；修改商品成本後，這項估算也會改變，不影響上方每日統計保存的收入與成本。</p><ul className="mt-3 space-y-2 text-sm">{products.map(row=><li key={row.productId} className="flex justify-between gap-3"><span className="min-w-0 break-words">{row.productName}</span><span className="shrink-0">{row.estimatedGrossProfit === null ? '成本待補' : formatCurrency(row.estimatedGrossProfit)}</span></li>)}</ul></details>
    </section> : <p className="px-1 text-sm leading-6 text-muted-foreground">本期以收入紀錄回顧，未提供商品明細分析。</p>}

    <section id="costs" className={sectionClass} aria-labelledby="report-costs-title"><h2 id="report-costs-title" className="text-lg font-semibold">成本說明</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{reading.costRecordedCount} 場有商品成本紀錄；淨利仍依已填費用估算，未填費用不視為免費。</p>
      <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">查看成本與分攤明細</summary><p className="mb-3 text-xs leading-6 text-muted-foreground">金額僅彙總有收入紀錄且未取消的場次。取消、延期場次及其費用沿既有規則不納入，若有取消支出需另核對。</p><dl className="space-y-3 text-sm">{[['每日紀錄中的商品成本',report.money.productCost],['本期分攤的固定場次費用',report.money.fixedMarketCost],['營收抽成',report.money.commissionFee]].map(([label,value])=><div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="shrink-0 tabular-nums">{formatCurrency(value as number)}</dd></div>)}</dl>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">固定費用依活動日期逐日均攤，優先使用場次選取日期，舊資料使用起訖日期；尾差歸較早日期。保證金不列為費用。</p>
        {reading.unrecordedFixedCost !== 0 && <p className="mt-2 text-sm leading-6">尚未有收入紀錄的場次另有本期分攤費用 {formatCurrency(reading.unrecordedFixedCost)}，未混入上方已有紀錄場次的估計淨利。</p>}
        {methodIssues.length > 0 && <ul className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground">{methodIssues.map(issue=><li key={issue.key}>{issue.title}：{issue.marketIds.length} 場。{issue.detail}</li>)}</ul>}
      </details>
      {statusIssues.map(issue=><p key={issue.key} className="mt-2 text-xs leading-6 text-muted-foreground">{issue.title}：{issue.marketIds.length} 場。{issue.detail}</p>)}
    </section>

    {actionIssues.length > 0 && <section id="quality" className={sectionClass} aria-labelledby="report-quality-title"><h2 id="report-quality-title" className="text-lg font-semibold">紀錄待確認</h2>
      <div className="mt-2 divide-y divide-atelier-line">{actionIssues.map(issue=><details key={issue.key} className="py-2"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">{issue.title} · {issue.marketIds.length} 場</summary><p className="text-sm leading-7 text-muted-foreground">{issue.detail}</p><ul className="mt-2 space-y-1">{issue.marketIds.map(id=><li key={id}>{titleLink('market',id,marketName(id),issue.task,issue.datesByMarket?.[id]?.[0])}{issue.datesByMarket?.[id]?.length ? <p className="text-xs text-muted-foreground">需核對日期：{issue.datesByMarket[id].join('、')}</p> : null}</li>)}</ul></details>)}</div>
    </section>}
    <section className={sectionClass} aria-label="選用匯出"><details><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">匯出 PDF（選用）</summary><p className="mb-3 text-xs leading-6 text-muted-foreground">依相同期間與費用口徑產生五頁報告；PDF 有列數限制，完整紀錄可在本頁展開查看。</p>{exportActions}</details></section>
    <footer className="flex flex-wrap justify-between gap-4 pb-5"><Link href="/analytics" className={linkClass}><ArrowLeft className="h-4 w-4" aria-hidden="true" />返回分析</Link><a href="#report-top" className={linkClass}><ArrowUp className="h-4 w-4" aria-hidden="true" />回到頂部</a></footer>
  </article>;
}
