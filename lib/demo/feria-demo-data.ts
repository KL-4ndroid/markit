import type { DemoExpense, DemoMarket, DemoProduct, DemoSale } from './feria-demo-types';

export const demoBrand = {
  name: '小島週末製作所',
  owner: 'Mina',
  plan: 'Studio Preview',
  tagline: '香氛、甜點與紙品的週末市集品牌',
};

export const demoMarkets = [
  {
    id: 'market-forest',
    name: '森之市',
    location: '台中草悟道',
    city: '台中',
    date: '2026-06-13',
    weather: '晴時多雲',
    boothFee: 2200,
    transportCost: 650,
    note: '午後人潮穩定，香氛與小禮盒詢問度高。',
  },
  {
    id: 'market-island',
    name: '島嶼生活市集',
    location: '高雄駁二大義',
    city: '高雄',
    date: '2026-06-20',
    weather: '晴朗偏熱',
    boothFee: 2600,
    transportCost: 900,
    note: '觀光客較多，單價較低的商品轉換率佳。',
  },
  {
    id: 'market-dusk',
    name: '黃昏甜點祭',
    location: '台南藍晒圖',
    city: '台南',
    date: '2026-06-27',
    weather: '午後陣雨',
    boothFee: 1800,
    transportCost: 500,
    note: '雨後人潮回升，甜點禮盒在傍晚售出明顯增加。',
  },
] satisfies DemoMarket[];

export const demoProducts = [
  {
    id: 'product-earrings',
    name: '海鹽雛菊耳飾',
    category: '飾品',
    price: 580,
    unitCost: 180,
    stock: 18,
  },
  {
    id: 'product-candle',
    name: '森林薄霧香氛蠟燭',
    category: '香氛',
    price: 680,
    unitCost: 260,
    stock: 12,
  },
  {
    id: 'product-dessert',
    name: '檸檬塔禮盒',
    category: '甜點',
    price: 420,
    unitCost: 190,
    stock: 24,
  },
  {
    id: 'product-card',
    name: '似顏繪小卡',
    category: '插畫',
    price: 320,
    unitCost: 80,
    stock: 30,
  },
  {
    id: 'product-zakka',
    name: '島嶼小花束',
    category: '生活選物',
    price: 480,
    unitCost: 210,
    stock: 16,
  },
] satisfies DemoProduct[];

export const demoSales = [
  { id: 'sale-001', marketId: 'market-forest', productId: 'product-earrings', quantity: 4, soldAt: '2026-06-13T12:20:00+08:00' },
  { id: 'sale-002', marketId: 'market-forest', productId: 'product-candle', quantity: 2, soldAt: '2026-06-13T13:15:00+08:00' },
  { id: 'sale-003', marketId: 'market-forest', productId: 'product-dessert', quantity: 5, soldAt: '2026-06-13T14:10:00+08:00' },
  { id: 'sale-004', marketId: 'market-forest', productId: 'product-card', quantity: 6, soldAt: '2026-06-13T15:30:00+08:00' },
  { id: 'sale-005', marketId: 'market-forest', productId: 'product-zakka', quantity: 3, soldAt: '2026-06-13T16:25:00+08:00' },
  { id: 'sale-006', marketId: 'market-forest', productId: 'product-earrings', quantity: 2, soldAt: '2026-06-13T17:15:00+08:00' },
  { id: 'sale-007', marketId: 'market-island', productId: 'product-dessert', quantity: 7, soldAt: '2026-06-20T14:10:00+08:00' },
  { id: 'sale-008', marketId: 'market-island', productId: 'product-card', quantity: 8, soldAt: '2026-06-20T14:55:00+08:00' },
  { id: 'sale-009', marketId: 'market-island', productId: 'product-earrings', quantity: 3, soldAt: '2026-06-20T15:40:00+08:00' },
  { id: 'sale-010', marketId: 'market-island', productId: 'product-zakka', quantity: 4, soldAt: '2026-06-20T16:30:00+08:00' },
  { id: 'sale-011', marketId: 'market-island', productId: 'product-candle', quantity: 1, soldAt: '2026-06-20T18:10:00+08:00' },
  { id: 'sale-012', marketId: 'market-island', productId: 'product-dessert', quantity: 5, soldAt: '2026-06-20T19:00:00+08:00' },
  { id: 'sale-013', marketId: 'market-dusk', productId: 'product-candle', quantity: 4, soldAt: '2026-06-27T16:20:00+08:00' },
  { id: 'sale-014', marketId: 'market-dusk', productId: 'product-dessert', quantity: 9, soldAt: '2026-06-27T17:00:00+08:00' },
  { id: 'sale-015', marketId: 'market-dusk', productId: 'product-card', quantity: 5, soldAt: '2026-06-27T17:45:00+08:00' },
  { id: 'sale-016', marketId: 'market-dusk', productId: 'product-earrings', quantity: 2, soldAt: '2026-06-27T18:20:00+08:00' },
  { id: 'sale-017', marketId: 'market-dusk', productId: 'product-zakka', quantity: 2, soldAt: '2026-06-27T19:10:00+08:00' },
  { id: 'sale-018', marketId: 'market-dusk', productId: 'product-candle', quantity: 1, soldAt: '2026-06-27T20:00:00+08:00' },
] satisfies DemoSale[];

export const demoExpenses = [
  { id: 'expense-001', marketId: 'market-forest', type: '攤位費', amount: 2200, note: '森之市攤位費' },
  { id: 'expense-002', marketId: 'market-forest', type: '交通', amount: 650, note: '停車與油資' },
  { id: 'expense-003', marketId: 'market-forest', type: '包材', amount: 380, note: '紙袋與貼紙' },
  { id: 'expense-004', marketId: 'market-island', type: '攤位費', amount: 2600, note: '島嶼生活市集攤位費' },
  { id: 'expense-005', marketId: 'market-island', type: '交通', amount: 900, note: '高雄來回油資' },
  { id: 'expense-006', marketId: 'market-island', type: '餐飲', amount: 360, note: '攤位工作餐' },
  { id: 'expense-007', marketId: 'market-dusk', type: '攤位費', amount: 1800, note: '黃昏甜點祭攤費' },
  { id: 'expense-008', marketId: 'market-dusk', type: '交通', amount: 500, note: '台南交通' },
  { id: 'expense-009', marketId: 'market-dusk', type: '材料耗損', amount: 420, note: '雨天展示耗損' },
] satisfies DemoExpense[];
