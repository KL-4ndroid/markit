/**
 * 生成測試數據工具
 * 用於快速生成市集、商品、互動、成交等測試數據
 */

import { createMarket, createProduct, recordInteraction, recordDeal } from '@/lib/db/hooks';
import type { MarketCreatedPayload, ProductCreatedPayload } from '@/types/db';

// 市集名稱池
const MARKET_NAMES = [
  '華山文創市集', '松菸創意市集', '西門紅樓市集', '師大夜市擺攤',
  '公館水岸市集', '信義誠品市集', '中山創意市集', '大稻埕碼頭市集',
  '寶藏巖藝術市集', '剝皮寮文創市集', '四四南村市集', '光點華山市集',
  '台北當代藝術館市集', '北投溫泉市集', '淡水老街市集', '九份老街市集',
  '鶯歌陶瓷市集', '三峽老街市集', '板橋435市集', '新莊廟街市集',
  '中壢夜市擺攤', '桃園藝文特區市集', '新竹城隍廟市集', '台中草悟道市集',
  '台南藍晒圖市集', '高雄駁二市集', '墾丁大街市集', '花蓮東大門市集',
  '宜蘭幾米廣場市集', '羅東夜市擺攤'
];

// 地點池
const LOCATIONS = [
  '台北市中正區', '台北市大同區', '台北市中山區', '台北市松山區',
  '台北市大安區', '台北市萬華區', '台北市信義區', '台北市士林區',
  '台北市北投區', '台北市內湖區', '新北市板橋區', '新北市新莊區',
  '新北市中和區', '新北市永和區', '新北市淡水區', '桃園市中壢區',
  '新竹市東區', '台中市西區', '台南市中西區', '高雄市鹽埕區'
];

// 商品名稱池
const PRODUCT_NAMES = [
  '手工皂', '香氛蠟燭', '陶瓷杯', '帆布袋', '手作飾品',
  '乾燥花束', '明信片', '貼紙', '手工餅乾', '果醬',
  '手沖咖啡', '茶葉', '精油', '護手霜', '口罩套',
  '鑰匙圈', '書籤', '筆記本', '手機殼', '耳環'
];

// 商品類別池
const CATEGORIES: Array<'handmade' | 'food' | 'accessory' | 'clothing' | 'art' | 'stationery' | 'other'> = [
  'handmade', 'food', 'accessory', 'stationery', 'other'
];

// 商品圖示池
const ICONS = ['🎨', '🧼', '🕯️', '☕', '🍪', '🌸', '💍', '👜', '📚', '🎁'];

// 顏色池
const COLORS = ['#7B9FA6', '#D4A574', '#E8B4B8', '#A8D5BA', '#F4E4C1', '#C9B8D9'];

/**
 * 生成隨機日期（過去 90 天內）
 */
function getRandomDate(daysAgo: number = 90): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 生成隨機時間
 */
function getRandomTime(start: number = 9, end: number = 18): string {
  const hour = Math.floor(Math.random() * (end - start)) + start;
  const minute = Math.random() > 0.5 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

/**
 * 生成隨機金額
 */
function getRandomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成隨機數組元素
 */
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 生成多選日期（不連續）
 */
function generateMultipleDates(baseDate: string, count: number): string[] {
  const dates: string[] = [];
  const base = new Date(baseDate);
  
  for (let i = 0; i < count; i++) {
    const offset = i * (Math.random() > 0.5 ? 2 : 3); // 間隔 2-3 天
    const date = new Date(base);
    date.setDate(base.getDate() + offset);
    dates.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
  }
  
  return dates;
}

/**
 * 生成連續日期
 */
function generateContinuousDates(startDate: string, days: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
  }
  
  return dates;
}

/**
 * 生成測試市集
 */
async function generateTestMarket(index: number): Promise<{ marketId: string; dates: string[] }> {
  const name = MARKET_NAMES[index % MARKET_NAMES.length];
  const location = getRandomItem(LOCATIONS);
  
  // 隨機決定日期類型
  const dateType = Math.random();
  let dates: string[];
  
  if (dateType < 0.4) {
    // 40% 單日市集
    dates = [getRandomDate()];
  } else if (dateType < 0.7) {
    // 30% 連續日期（2-3天）
    const startDate = getRandomDate();
    const days = Math.random() > 0.5 ? 2 : 3;
    dates = generateContinuousDates(startDate, days);
  } else {
    // 30% 多選日期（3-5天，不連續）
    const baseDate = getRandomDate();
    const count = Math.floor(Math.random() * 3) + 3; // 3-5天
    dates = generateMultipleDates(baseDate, count);
  }
  
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  
  const marketData: MarketCreatedPayload = {
    name,
    location,
    dates,
    startDate,
    endDate,
    startTime: getRandomTime(9, 11),
    endTime: getRandomTime(17, 20),
    
    // 時間軸
    earlyEntryEnabled: Math.random() > 0.5,
    earlyEntryTime: getRandomTime(8, 9),
    checkInTime: getRandomTime(9, 10),
    operatingStartTime: getRandomTime(10, 11),
    operatingEndTime: getRandomTime(17, 19),
    
    // 財務
    registrationFee: getRandomAmount(0, 500),
    boothCost: getRandomAmount(500, 3000),
    deposit: Math.random() > 0.7 ? getRandomAmount(1000, 3000) : 0,
    tableRental: Math.random() > 0.5 ? getRandomAmount(100, 300) : 0,
    chairRental: Math.random() > 0.5 ? getRandomAmount(50, 150) : 0,
    umbrellaRental: Math.random() > 0.5 ? getRandomAmount(100, 200) : 0,
    commissionRate: Math.random() > 0.7 ? getRandomAmount(5, 15) : 0,
    
    // 免費標記
    tableFree: Math.random() > 0.7,
    chairFree: Math.random() > 0.7,
    umbrellaFree: Math.random() > 0.8,
    
    notes: `測試市集 #${index + 1}`,
  };
  
  // ✅ createMarket 返回的是事件 ID，不是市集 ID
  const eventId = await createMarket(marketData);
  console.log(`✅ 市集事件已記錄，ID: ${eventId}`);
  
  // 等待一段時間讓 transaction 完成
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 從事件中獲取市集 ID
  const { db } = await import('@/lib/db');
  const event = await db.events.get(eventId);
  if (!event || !event.market_id) {
    throw new Error(`無法獲取市集 ID，事件 ID: ${eventId}`);
  }
  
  const marketId = event.market_id;
  console.log(`✅ 市集 ID: ${marketId}`);
  
  // 等待市集確實寫入資料庫
  const market = await db.markets.get(marketId);
  
  if (!market) {
    console.error(`❌ 市集未寫入資料庫: ${name} (ID: ${marketId})`);
    
    // 再等待一次
    await new Promise(resolve => setTimeout(resolve, 1000));
    const retryMarket = await db.markets.get(marketId);
    
    if (!retryMarket) {
      throw new Error(`市集創建失敗（超時）：${name}`);
    }
    
    console.log(`✅ 重試成功: ${retryMarket.name}`);
  } else {
    console.log(`✅ 已建立市集 ${index + 1}/30: ${market.name}`);
  }
  
  return { marketId, dates };
}

/**
 * 生成測試商品
 */
async function generateTestProducts(count: number = 10): Promise<string[]> {
  const productIds: string[] = [];
  const { db } = await import('@/lib/db');
  
  console.log(`開始生成 ${count} 個商品...`);
  
  for (let i = 0; i < count; i++) {
    const productData: ProductCreatedPayload = {
      name: PRODUCT_NAMES[i % PRODUCT_NAMES.length],
      category: getRandomItem(CATEGORIES),
      price: getRandomAmount(50, 500),
      cost: getRandomAmount(20, 200),
      iconName: getRandomItem(ICONS),
      colorCode: getRandomItem(COLORS),
      stock: Math.random() > 0.3 ? getRandomAmount(10, 100) : 0,
      unlimitedStock: Math.random() > 0.7,
      description: `測試商品 #${i + 1}`,
    };
    
    console.log(`正在創建商品 ${i + 1}/${count}: ${productData.name}...`);
    
    try {
      // ✅ createProduct 返回的是事件 ID，不是商品 ID
      // 我們需要從事件中獲取商品 ID
      const eventId = await createProduct(productData);
      console.log(`✅ 事件已記錄，ID: ${eventId}`);
      
      // 等待一段時間讓 transaction 完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 從事件中獲取商品 ID
      const event = await db.events.get(eventId);
      if (!event || !event.payload) {
        throw new Error(`無法獲取事件：${eventId}`);
      }
      
      const productId = (event.payload as any).productId;
      if (!productId) {
        throw new Error(`事件中沒有 productId：${eventId}`);
      }
      
      console.log(`✅ 商品 ID: ${productId}`);
      
      // 檢查商品是否存在
      const product = await db.products.get(productId);
      
      if (!product) {
        console.error(`❌ 商品未寫入資料庫: ${productData.name} (ID: ${productId})`);
        
        // 再等待一次
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryProduct = await db.products.get(productId);
        
        if (!retryProduct) {
          throw new Error(`商品創建失敗：${productData.name} (ID: ${productId})`);
        }
        
        console.log(`✅ 重試成功: ${retryProduct.name}`);
        productIds.push(productId);
      } else {
        console.log(`✅ 已建立商品 ${i + 1}/${count}: ${product.name}`);
        productIds.push(productId);
      }
      
    } catch (error) {
      console.error(`❌ 創建商品失敗:`, error);
      throw error;
    }
  }
  
  console.log(`✅ 已建立 ${count} 個商品`);
  return productIds;
}

/**
 * 生成測試互動和成交
 */
async function generateTestInteractionsAndDeals(
  marketId: string,
  productIds: string[],
  dates: string[]
): Promise<void> {
  // 驗證所有商品 ID 是否存在
  const { db } = await import('@/lib/db');
  for (const productId of productIds) {
    const product = await db.products.get(productId);
    if (!product) {
      throw new Error(`商品不存在於資料庫：ID ${productId}`);
    }
  }
  
  // 為每個日期生成互動和成交
  for (const date of dates) {
    // 生成 5-15 次互動
    const interactionCount = getRandomAmount(5, 15);
    for (let i = 0; i < interactionCount; i++) {
      const types = ['touch', 'inquiry', 'interest'];
      await recordInteraction(
        marketId,
        getRandomItem(types),
        Math.random() > 0.5 ? [getRandomItem(productIds)] : undefined
      );
    }
    
    // 生成 2-8 筆成交，金額更真實
    const dealCount = getRandomAmount(2, 8);
    for (let i = 0; i < dealCount; i++) {
      const itemCount = getRandomAmount(1, 3);
      const items = [];
      
      for (let j = 0; j < itemCount; j++) {
        const productId = getRandomItem(productIds);
        
        // 再次驗證商品存在
        const product = await db.products.get(productId);
        if (!product) {
          console.error(`❌ 商品不存在：${productId}`);
          continue; // 跳過這個商品
        }
        
        // 更真實的價格分布
        let price: number;
        const priceType = Math.random();
        if (priceType < 0.3) {
          // 30% 低價商品 (50-150)
          price = getRandomAmount(50, 150);
        } else if (priceType < 0.7) {
          // 40% 中價商品 (150-350)
          price = getRandomAmount(150, 350);
        } else {
          // 30% 高價商品 (350-800)
          price = getRandomAmount(350, 800);
        }
        
        items.push({
          productId,
          quantity: getRandomAmount(1, 3),
          price,
        });
      }
      
      // 如果沒有有效商品，跳過這筆交易
      if (items.length === 0) {
        continue;
      }
      
      const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      await recordDeal({
        marketId,
        items,
        totalAmount,
        paymentMethod: getRandomItem(['cash', 'card', 'mobile', 'other']),
        dealDate: date,
        isBackfill: true, // 標記為補登，不扣庫存
      });
    }
  }
  
  console.log(`✅ 已為市集生成互動和成交記錄`);
}

/**
 * 主函數：生成 30 筆測試數據
 */
export async function generateTestData(
  onProgress?: (current: number, total: number, message: string) => void
): Promise<void> {
  const total = 30;
  
  try {
    // 1. 先生成商品（共用）
    onProgress?.(0, total, '正在生成測試商品...');
    const productIds = await generateTestProducts(20);
    
    console.log('✅ 所有商品已確認寫入資料庫');
    
    // 2. 生成 30 個市集
    for (let i = 0; i < total; i++) {
      onProgress?.(i + 1, total, `正在生成市集 ${i + 1}/${total}...`);
      
      const { marketId, dates } = await generateTestMarket(i);
      
      // 為市集生成互動和成交
      await generateTestInteractionsAndDeals(marketId, productIds, dates);
      
      // ✅ 設定市集狀態
      const { updateMarketStatus } = await import('@/lib/db/hooks');
      
      // 根據日期決定狀態
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDate = new Date(dates[0]);
      const lastDate = new Date(dates[dates.length - 1]);
      
      let targetStatus: 'paid' | 'ongoing' | 'completed';
      
      if (lastDate < today) {
        // 過去的市集：已完成
        targetStatus = 'completed';
      } else if (firstDate <= today && lastDate >= today) {
        // 進行中的市集：如期舉行
        targetStatus = 'ongoing';
      } else {
        // 未來的市集：已繳費
        targetStatus = 'paid';
      }
      
      // 更新狀態（從 registered -> paid -> ongoing/completed）
      if (targetStatus === 'paid' || targetStatus === 'ongoing' || targetStatus === 'completed') {
        await updateMarketStatus(marketId, 'paid');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (targetStatus === 'ongoing' || targetStatus === 'completed') {
        await updateMarketStatus(marketId, 'ongoing');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (targetStatus === 'completed') {
        await updateMarketStatus(marketId, 'ongoing');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // 延遲一下，避免過快
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    onProgress?.(total, total, '✅ 測試數據生成完成！');
    console.log('🎉 所有測試數據生成完成！');
    
  } catch (error) {
    console.error('❌ 生成測試數據失敗:', error);
    throw error;
  }
}
