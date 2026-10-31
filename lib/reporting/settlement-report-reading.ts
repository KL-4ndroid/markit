import { marketBusinessDates } from '@/lib/markets/market-business-dates';
import { assessDailyFinancialRecord, assessFixedMarketFee, isDailySalesProfitUsable, type FinancialZeroConfirmation } from '@/lib/analytics/financial-record-quality';
import { buildSettlementReportModel, type BuildSettlementReportModelInput, type SettlementMarketRow, type SettlementReportModel, type SettlementReportPeriod } from './settlement-report';

export type ReportRecordState = 'recorded' | 'missing' | 'upcoming' | 'activity-only';
export type ReadingMarketRow = SettlementMarketRow & {
  state: ReportRecordState;
  recordedDays: number;
  missingDates: string[];
  costRecorded: boolean;
  revenueUsable: boolean;
  canCompare: boolean;
  dailyRevenue: number | null;
  estimatedProfit: number | null;
  fixedCostTotal: number;
  fixedFeeState: ReturnType<typeof assessFixedMarketFee>;
  isPartial: boolean;
};
export type ReportReadingIssue = { key: string; title: string; detail: string; marketIds: string[]; task: 'performance' | 'costs'; kind: 'action' | 'status' | 'method'; datesByMarket?: Record<string,string[]> };
export type SettlementReportReading = {
  version: 2;
  asOfDate: string;
  rows: ReadingMarketRow[];
  recordedCount: number;
  completedCount: number;
  upcomingCount: number;
  pendingCount: number;
  recordedDays: number;
  costRecordedCount: number;
  estimatedProfit: number | null;
  confirmedProfit: { amount: number; count: number; marketIds: string[] } | null;
  productCoverage: { itemizedRevenue: number; totalRevenue: number; status: 'none' | 'partial' | 'complete' | 'invalid' };
  revenueUsable: boolean;
  issues: ReportReadingIssue[];
  highlights: string[];
  unrecordedFixedCost: number;
  inventory: Record<string,{stock:number|null;unlimited:boolean}>;
  comparison: { startDate: string; endDate: string; available: boolean; reason: string; previousRevenue: number; previousMarkets: number; currentMarkets: number; previousDays: number; previousDailyRevenue: number | null; currentDailyRevenue: number | null; difference: number | null } | null;
};

const DAY = 86_400_000;
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY;
const dayString = (day: number) => new Date(day * DAY).toISOString().slice(0,10);
const money = (value: number) => Math.round(value * 100) / 100;
const sum = (values: number[]) => money(values.reduce((total,value)=>total+value,0));
const validCommissionRate = (rate:number|undefined) => Number.isFinite(rate ?? 0) && (rate ?? 0) >= 0 && (rate ?? 0) <= 100;

/** Only pass source-bound confirmations loaded through the authorized persistence contract. */
export type BuildReadableSettlementReportInput = BuildSettlementReportModelInput & {
  generatedAtDate: string;
  financialConfirmations?: Readonly<Record<string, {
    fees?: readonly FinancialZeroConfirmation[];
    days?: Readonly<Record<string, readonly FinancialZeroConfirmation[]>>;
  }>>;
};

/** Equal allocation in cents; earlier event dates receive any remainder. */
export function allocateReportFixedCost(total: number, dates: readonly string[], period: Pick<SettlementReportPeriod,'startDate'|'endDate'>): number {
  const days = [...new Set(dates)].sort();
  if (!days.length || !Number.isFinite(total)) return 0;
  const cents = Math.round(total * 100);
  const base = Math.trunc(cents / days.length);
  const remainder = cents - base * days.length;
  return days.reduce((amount,date,index)=>date >= period.startDate && date <= period.endDate
    ? amount + base + (index < Math.abs(remainder) ? Math.sign(remainder) : 0) : amount,0) / 100;
}

/** Compare equal calendar-length, non-overlapping periods; never project future sales. */
export function reportComparisonPeriod(period: SettlementReportPeriod, asOf: string): SettlementReportPeriod | null {
  const effectiveEnd = period.endDate < asOf ? period.endDate : asOf;
  if (effectiveEnd < period.startDate) return null;
  const days = dayNumber(effectiveEnd) - dayNumber(period.startDate) + 1;
  if (!Number.isFinite(days) || days <= 0 || days > 3660) return null;
  const endDate = dayString(dayNumber(period.startDate)-1);
  const startDate = dayString(dayNumber(period.startDate)-days);
  return {kind:period.kind,startDate,endDate,label:`${startDate}–${endDate}`};
}

function buildOne(input: BuildReadableSettlementReportInput): SettlementReportModel {
  const asOf = input.generatedAtDate;
  const businessDates = new Map(input.markets.map(market=>[market.id ?? '',marketBusinessDates(market)]));
  const scopedMarkets = input.markets.filter(market=>(businessDates.get(market.id ?? '') ?? []).some(date=>date >= input.period.startDate && date <= input.period.endDate));
  const validStats = input.dailyStats.filter(stat=>stat.marketId && stat.date <= asOf && (businessDates.get(stat.marketId) ?? []).includes(stat.date));
  const report = buildSettlementReportModel({...input,markets:scopedMarkets,dailyStats:validStats});
  const marketById = new Map(scopedMarkets.map(market=>[market.id ?? '',market]));
  const issues: ReportReadingIssue[] = [];
  const rows: ReadingMarketRow[] = report.marketRows.map(row=>{
    const market = marketById.get(row.marketId)!;
    const dates = businessDates.get(row.marketId) ?? [];
    const expected = dates.filter(date=>date >= input.period.startDate && date <= input.period.endDate && date <= asOf);
    const stats = validStats.filter(stat=>stat.marketId === row.marketId && stat.date >= input.period.startDate && stat.date <= input.period.endDate);
    const recordedDates = [...new Set(stats.map(stat=>stat.date))];
    const confirmations = input.financialConfirmations?.[row.marketId];
    const quality = (stat:typeof stats[number]) => assessDailyFinancialRecord(stat,confirmations?.days?.[stat.date]);
    const hasFinancial = stats.some(stat=>stat.revenue !== 0 || stat.dealCount !== 0 || stat.cost !== 0 || stat.profit !== 0);
    const upcoming = expected.length === 0;
    const activityOnly = stats.length > 0 && !hasFinancial && market.status !== 'completed' && !stats.every(stat=>quality(stat).zeroIncomeConfirmed);
    const state: ReportRecordState = upcoming ? 'upcoming' : !stats.length ? 'missing' : activityOnly ? 'activity-only' : 'recorded';
    const missingDates = expected.filter(date=>!recordedDates.includes(date));
    const hasOffDate = input.dailyStats.some(stat=>stat.marketId === row.marketId && stat.date >= input.period.startDate && stat.date <= input.period.endDate && stat.date <= asOf && !dates.includes(stat.date));
    const revenueUsable = !hasOffDate && recordedDates.length === stats.length && stats.every(stat=>quality(stat).revenueValid);
    const costRecorded = state === 'recorded' && revenueUsable && stats.every(stat=>isDailySalesProfitUsable(stat,confirmations?.days?.[stat.date]));
    const fixedFeeState = assessFixedMarketFee(market,row.fixedMarketCost,confirmations?.fees);
    const allocated = allocateReportFixedCost(row.fixedMarketCost,dates,input.period);
    const inProgress = market.status !== 'completed' && dates.some(date=>date >= asOf && date >= input.period.startDate && date <= input.period.endDate && !stats.some(stat=>stat.date===date && quality(stat).zeroIncomeConfirmed));
    const canCompare = state === 'recorded' && revenueUsable && missingDates.length === 0 && !inProgress;
    return {...row,state,recordedDays:recordedDates.length,missingDates,costRecorded,revenueUsable,canCompare,
      fixedCostTotal:row.fixedMarketCost,fixedFeeState,fixedMarketCost:allocated,netProfit:money(row.grossProfit-allocated-row.commissionFee),
      estimatedProfit:costRecorded && canCompare && (fixedFeeState === 'recorded' || fixedFeeState === 'confirmed-zero') && row.commissionFee >= 0 && validCommissionRate(market.commissionRate) ? money(row.grossProfit-allocated-row.commissionFee) : null,
      dailyRevenue:canCompare && recordedDates.length ? row.revenue/recordedDates.length : null,
      isPartial:dates.some(date=>date < input.period.startDate || date > input.period.endDate)};
  }).sort((a,b)=>({recorded:0,missing:1,'activity-only':1,upcoming:2}[a.state]-{recorded:0,missing:1,'activity-only':1,upcoming:2}[b.state])||b.startDate.localeCompare(a.startDate)||a.marketName.localeCompare(b.marketName));
  const recorded = rows.filter(row=>row.state === 'recorded');
  const issue = (key: string,title: string,detail: string,affected: ReadingMarketRow[],task: ReportReadingIssue['task'],kind:ReportReadingIssue['kind']='action')=>{
    if (affected.length) issues.push({key,title,detail,marketIds:affected.map(row=>row.marketId),task,kind,
      datesByMarket:task === 'performance' ? Object.fromEntries(affected.map(row=>[row.marketId,
        key === 'cost' ? validStats.filter(stat=>{
          const quality = assessDailyFinancialRecord(stat,input.financialConfirmations?.[row.marketId]?.days?.[stat.date]);
          return stat.marketId === row.marketId && stat.date >= input.period.startDate && stat.date <= input.period.endDate
            && (!quality.costConsistent || stat.revenue !== 0 && !quality.costUsable);
        }).map(stat=>stat.date).sort()
          : row.missingDates])) : undefined});
  };
  issue('records','有出攤紀錄待確認','未填收入與已記錄零收入會分開呈現；補齊後才能比較完整期間。',rows.filter(row=>row.state === 'missing'||row.state === 'activity-only'||row.missingDates.length > 0),'performance');
  issue('invalid','有收入紀錄需要核對','同一天重複、日期歸屬或收入／成交數不正確時，先核對來源紀錄，再進行比較。',rows.filter(row=>!row.revenueUsable),'performance');
  issue('cost','有銷售成本待確認',input.financialConfirmations ? '請核對對應日期的銷售成本總額，攤位與設備費另列。保存核對金額即可，請勿重複補登同筆收入。' : '請核對對應日期的成交與銷售成本，攤位與設備費另列。目前僅供核對，請勿重複補登同筆收入。',recorded.filter(row=>row.revenueUsable && !row.costRecorded),'performance');
  issue('in-progress','有場次仍在進行','收入可先回顧，收攤後再比較完整期間的淨利與每日表現。',recorded.filter(row=>row.revenueUsable && row.missingDates.length === 0 && !row.canCompare),'performance','status');
  issue('zero-fee','有場次固定費用待確認','請核對未確認的零費用、不正確的金額，或舊報名費與攤位費不一致的紀錄。收入與成本明細仍保留，核對前暫不列入淨利比較。',recorded.filter(row=>['unknown','invalid'].includes(row.fixedFeeState) || row.commissionFee < 0 || !validCommissionRate(marketById.get(row.marketId)?.commissionRate)),'costs');
  issue('partial','跨期場次已分攤固定費用','固定費用按活動日期均攤，尾差分配至較早日期；保證金不列為費用。',rows.filter(row=>row.isPartial),'costs','method');
  const revenueUsable = rows.every(row=>row.revenueUsable);
  const estimatedProfit = recorded.length > 0 && rows.every(row=>row.state === 'upcoming'||row.estimatedProfit !== null)
    ? sum(recorded.map(row=>row.estimatedProfit!)) : null;
  report.marketRows = rows;
  report.money = {
    totalRevenue:sum(recorded.map(row=>row.revenue)),productCost:sum(recorded.map(row=>row.productCost)),
    grossProfit:sum(recorded.map(row=>row.grossProfit)),fixedMarketCost:sum(recorded.map(row=>row.fixedMarketCost)),
    commissionFee:sum(recorded.map(row=>row.commissionFee)),netProfit:sum(recorded.map(row=>row.netProfit)),
  };
  report.activity = {...report.activity,totalDeals:recorded.reduce((n,row)=>n+row.dealCount,0),
    averageOrderValue:0,marketsWithSalesCount:recorded.filter(row=>row.revenue > 0).length};
  report.activity.averageOrderValue = report.activity.totalDeals ? report.money.totalRevenue/report.activity.totalDeals : 0;
  report.productRows = [...report.productRows].sort((a,b)=>b.quantity-a.quantity||b.revenue-a.revenue);
  const eligibleProfitRows = recorded.filter(row=>row.estimatedProfit !== null);
  const itemizedRevenue = sum(report.productRows.map(row=>row.revenue));
  const totalRevenue = report.money.totalRevenue;
  const productCoverage: SettlementReportReading['productCoverage'] = {itemizedRevenue,totalRevenue,
    status: !revenueUsable || !Number.isFinite(itemizedRevenue) || itemizedRevenue < 0 || itemizedRevenue > totalRevenue + 0.02 ? 'invalid'
      : !report.productRows.length ? 'none' : Math.abs(itemizedRevenue-totalRevenue) < 0.02 && totalRevenue > 0 ? 'complete' : 'partial'};
  const pendingCount = rows.filter(row=>row.state === 'missing'||row.state === 'activity-only'||row.missingDates.length > 0).length;
  const partialRecorded = recorded.filter(row=>row.missingDates.length > 0).length;
  const noIncomeCount = rows.filter(row=>row.state==='missing'||row.state==='activity-only').length;
  const upcomingCount = rows.filter(row=>row.state === 'upcoming').length;
  const summary = `本期 ${[`${recorded.length} 場有收入紀錄${partialRecorded ? `（其中 ${partialRecorded} 場有日期待補）` : ''}`,
    ...(noIncomeCount ? [`${noIncomeCount} 場收入結果待確認`] : []), ...(upcomingCount ? [`${upcomingCount} 場尚未開攤`] : [])].join('，')}。`;
  const comparable = recorded.filter(row=>row.dailyRevenue !== null);
  const best = [...comparable].sort((a,b)=>b.dailyRevenue!-a.dailyRevenue!)[0];
  const highlights = [summary];
  if (best && comparable.length >= 2 && comparable.filter(row=>row.dailyRevenue === best.dailyRevenue).length === 1) highlights.push(`${best.marketName}：每場紀錄日平均收入 ${Math.round(best.dailyRevenue!)} 元；本期共 ${comparable.length} 場具備完整收入日期可供比較。`);
  if (productCoverage.status === 'complete' && report.productRows.length > 1 && report.productRows[0].quantity > report.productRows[1].quantity)
    highlights.push(`已記錄件數最多：${report.productRows[0].productName}，共 ${report.productRows[0].quantity} 件。`);
  report.decision = {...report.decision,summary,scoreComponents:[]};
  report.content = {...report.content,marketActions:highlights.slice(1,2),productActions:highlights.slice(2),dataActions:issues.map(row=>`${row.title}：${row.detail}`)};
  report.reading = {version:2,asOfDate:asOf,rows,recordedCount:recorded.length,completedCount:rows.filter(row=>marketById.get(row.marketId)?.status === 'completed' || (businessDates.get(row.marketId) ?? []).every(date=>date < asOf)).length,
    pendingCount,upcomingCount:rows.filter(row=>row.state === 'upcoming').length,
    recordedDays:recorded.reduce((n,row)=>n+row.recordedDays,0),costRecordedCount:recorded.filter(row=>row.costRecorded).length,
    estimatedProfit,confirmedProfit:eligibleProfitRows.length ? {amount:sum(eligibleProfitRows.map(row=>row.estimatedProfit!)),count:eligibleProfitRows.length,marketIds:eligibleProfitRows.map(row=>row.marketId)} : null,
    productCoverage,revenueUsable,issues,highlights,unrecordedFixedCost:sum(rows.filter(row=>row.state !== 'recorded').map(row=>row.fixedMarketCost)),
    inventory:Object.fromEntries((input.products ?? []).filter(product=>product.id).map(product=>[product.id!,{stock:typeof product.stock === 'number' && Number.isFinite(product.stock) ? product.stock : null,unlimited:product.unlimitedStock === true}])),comparison:null};
  return report;
}

/** Report-only read model: original events, costs, payment state and inventory are never rewritten. */
export function buildReadableSettlementReport(input: BuildReadableSettlementReportInput): SettlementReportModel {
  const current = buildOne(input);
  const previousPeriod = reportComparisonPeriod(input.period,input.generatedAtDate);
  if (previousPeriod) {
    const previous = buildOne({...input,period:previousPeriod});
    const now = current.reading!; const before = previous.reading!;
    const available = now.recordedCount > 0 && before.recordedCount > 0 && now.rows.every(row=>row.state === 'upcoming'||row.canCompare) && before.rows.every(row=>row.canCompare);
    now.comparison = {startDate:previousPeriod.startDate,endDate:previousPeriod.endDate,available,
      reason:available ? '比較同樣日數的前一期間；每日平均按各場有紀錄日期加總計算。' : now.recordedCount === 0 ? '本期尚無收入紀錄，填入後即可回顧。' : before.recordedCount === 0 ? '前一期間沒有收入紀錄，累積紀錄後即可比較。' : '目前或前期仍有待補、進行中或異常紀錄，暫不推算增減。',
      previousRevenue:previous.money.totalRevenue,previousMarkets:before.recordedCount,currentMarkets:now.recordedCount,previousDays:before.recordedDays,
      previousDailyRevenue:available && before.recordedDays ? previous.money.totalRevenue/before.recordedDays : null,
      currentDailyRevenue:available && now.recordedDays ? current.money.totalRevenue/now.recordedDays : null,
      difference:available ? money(current.money.totalRevenue-previous.money.totalRevenue) : null};
  }
  return current;
}
