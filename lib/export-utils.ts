/**
 * 數據匯出工具
 */

import type { Market } from '@/types/db';
import { getAppPlatform } from '@/lib/platform';

/**
 * 將市集數據匯出為 CSV 格式
 * 
 * @param markets - 市集列表
 * @returns CSV 字串
 */
export function exportMarketsToCSV(markets: Market[]): string {
  // CSV 標題行
  const headers = [
    '市集名稱',
    '地點',
    '開始日期',
    '結束日期',
    '狀態',
    '總收入',
    '總利潤',
    '攤位費',
    '保證金',
    '桌租',
    '椅租',
    '傘租',
    '桌巾租',
    '抽成比例(%)',
    '抽成金額',
    '總成本',
    '總互動數',
    '總成交數',
    '轉換率(%)',
    '平均客單價',
  ];

  // 狀態映射
  const statusMap: Record<string, string> = {
    'registered': '已報名',
    'accepted': '已錄取',
    'paid': '已繳費',
    'ongoing': '營業中',
    'completed': '已完成',
    'postponed': '已延期',
    'cancelled': '已取消',
  };

  // 轉換數據行
  const rows = markets.map(market => {
    // 計算各項成本
    const boothCost = market.boothCost || 0;
    const deposit = market.deposit || 0;
    const tableRental = market.tableFree ? 0 : (market.tableRental || 0);
    const chairRental = market.chairFree ? 0 : (market.chairRental || 0);
    const umbrellaRental = market.umbrellaFree ? 0 : (market.umbrellaRental || 0);
    const tableclothRental = market.tableclothFree ? 0 : (market.tableclothRental || 0);
    const commissionRate = market.commissionRate || 0;
    const commissionAmount = ((market.totalRevenue || 0) * commissionRate) / 100;
    const totalCost = boothCost + deposit + tableRental + chairRental + umbrellaRental + tableclothRental + commissionAmount;

    // 計算轉換率
    const totalInteractions = market.totalInteractions || 0;
    const totalDeals = market.totalDeals || 0;
    const conversionRate = totalInteractions > 0 ? (totalDeals / totalInteractions * 100) : 0;

    // 計算平均客單價
    const averageOrderValue = totalDeals > 0 ? (market.totalRevenue || 0) / totalDeals : 0;

    return [
      market.name,
      market.location,
      market.startDate,
      market.endDate,
      statusMap[market.status] || market.status,
      market.totalRevenue || 0,
      market.totalProfit || 0,
      boothCost,
      deposit,
      tableRental,
      chairRental,
      umbrellaRental,
      tableclothRental,
      commissionRate,
      commissionAmount.toFixed(0),
      totalCost.toFixed(0),
      totalInteractions,
      totalDeals,
      conversionRate.toFixed(2),
      averageOrderValue.toFixed(0),
    ];
  });

  // 組合 CSV 內容
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // 處理包含逗號或換行的內容，用雙引號包裹
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
  ].join('\n');

  // 加入 BOM (Byte Order Mark) 以確保 Excel 正確識別 UTF-8 編碼
  return '\uFEFF' + csvContent;
}

/**
 * 觸發瀏覽器下載 CSV 檔案
 * 
 * @param csvContent - CSV 內容
 * @param filename - 檔案名稱（不含副檔名）
 */
export async function downloadCSV(csvContent: string, filename: string): Promise<void> {
  // 建立 Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  await getAppPlatform().files.saveFile({ filename: `${filename}.csv`, data: blob });

  // 建立下載連結


  // 觸發下載

  // 清理
}

/**
 * 生成檔案名稱（包含日期）
 * 
 * @param prefix - 檔案名稱前綴
 * @returns 格式化的檔案名稱
 */
export function generateFilename(prefix: string = 'MarketPulse_Report'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${prefix}_${year}${month}${day}`;
}

/**
 * 一鍵匯出市集報表
 * 
 * @param markets - 市集列表
 */
export async function exportMarketReport(markets: Market[]): Promise<void> {
  const csvContent = exportMarketsToCSV(markets);
  const filename = generateFilename('MarketPulse_Report');
  await downloadCSV(csvContent, filename);
}
