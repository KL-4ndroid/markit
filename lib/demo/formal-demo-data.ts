export type DemoView = 'today' | 'markets' | 'products' | 'analytics' | 'more';

export type DemoMarketStatus = 'operating' | 'preparing' | 'ended';

export type DemoProductTone = 'pink' | 'green' | 'yellow' | 'blue';

export interface DemoMarket {
  id: string;
  name: string;
  dateLabel: string;
  location: string;
  time: string;
  status: DemoMarketStatus;
  revenue: number;
  deals: number;
  interactions: number;
  note: string;
  dates: string[];
  checkInTime: string;
  operatingStartTime: string;
  operatingEndTime: string;
  boothCost: number;
  deposit: number;
  commissionRate: number;
  tableRental: number;
  chairRental: number;
  umbrellaRental: number;
  tableFree: boolean;
  chairFree: boolean;
  umbrellaFree: boolean;
  salesPhotoEvidenceRequired: boolean;
}

export interface DemoProduct {
  id: string;
  name: string;
  category: '手作' | '食品' | '飾品' | '服飾' | '藝術' | '文具' | '其他';
  price: number;
  stock: number;
  sold: number;
  cost: number;
  unlimitedStock: boolean;
  isActive: boolean;
  description: string;
  tone: DemoProductTone;
}

export interface DemoActivity {
  id: string;
  type: 'sale' | 'interaction';
  label: string;
  detail: string;
  time: string;
}

export const INITIAL_DEMO_MARKETS: readonly DemoMarket[] = [
  {
    id: 'market-summer',
    name: '夏日手作散步市集',
    dateLabel: '7/18（六）',
    location: '台北・松山文創園區',
    time: '11:00 - 19:00',
    status: 'operating',
    revenue: 4860,
    deals: 12,
    interactions: 28,
    note: '午後人潮最集中，帆布小花袋與檸檬塔詢問度最高。',
    dates: ['2026-07-18'],
    checkInTime: '10:30',
    operatingStartTime: '11:00',
    operatingEndTime: '19:00',
    boothCost: 1200,
    deposit: 500,
    commissionRate: 0,
    tableRental: 200,
    chairRental: 100,
    umbrellaRental: 0,
    tableFree: false,
    chairFree: false,
    umbrellaFree: true,
    salesPhotoEvidenceRequired: false,
  },
  {
    id: 'market-riverside',
    name: '河畔日和小市集',
    dateLabel: '7/23（四）',
    location: '新北・淡水金色水岸',
    time: '14:00 - 20:00',
    status: 'preparing',
    revenue: 0,
    deals: 0,
    interactions: 0,
    note: '記得準備夜間照明與延長線。',
    dates: ['2026-07-23'],
    checkInTime: '13:30',
    operatingStartTime: '14:00',
    operatingEndTime: '20:00',
    boothCost: 1500,
    deposit: 500,
    commissionRate: 5,
    tableRental: 0,
    chairRental: 0,
    umbrellaRental: 0,
    tableFree: true,
    chairFree: true,
    umbrellaFree: true,
    salesPhotoEvidenceRequired: true,
  },
  {
    id: 'market-spring',
    name: '春風生活祭',
    dateLabel: '6/28（日）',
    location: '台中・審計新村',
    time: '12:00 - 18:00',
    status: 'ended',
    revenue: 9280,
    deals: 24,
    interactions: 51,
    note: '回購客比例很高，下次可多帶飾品系列。',
    dates: ['2026-06-28'],
    checkInTime: '11:30',
    operatingStartTime: '12:00',
    operatingEndTime: '18:00',
    boothCost: 1100,
    deposit: 0,
    commissionRate: 0,
    tableRental: 200,
    chairRental: 100,
    umbrellaRental: 0,
    tableFree: false,
    chairFree: false,
    umbrellaFree: true,
    salesPhotoEvidenceRequired: false,
  },
];

export const INITIAL_DEMO_PRODUCTS: readonly DemoProduct[] = [
  {
    id: 'product-flower-bag',
    name: '帆布小花袋',
    category: '手作',
    price: 480,
    stock: 8,
    sold: 5,
    cost: 180,
    unlimitedStock: false,
    isActive: true,
    description: '柔軟厚磅帆布搭配手繡小花，每一只都有些微不同。',
    tone: 'pink',
  },
  {
    id: 'product-lemon-tart',
    name: '檸檬奶油塔',
    category: '食品',
    price: 180,
    stock: 12,
    sold: 9,
    cost: 65,
    unlimitedStock: false,
    isActive: true,
    description: '酸甜平衡的手工檸檬凝乳，搭配酥香杏仁塔皮。',
    tone: 'yellow',
  },
  {
    id: 'product-glass-earring',
    name: '晨霧玻璃耳環',
    category: '飾品',
    price: 620,
    stock: 5,
    sold: 3,
    cost: 230,
    unlimitedStock: false,
    isActive: true,
    description: '以霧面玻璃與天然淡水珠組成的輕盈耳飾。',
    tone: 'blue',
  },
  {
    id: 'product-leaf-note',
    name: '森日便箋組',
    category: '文具',
    price: 160,
    stock: 16,
    sold: 7,
    cost: 45,
    unlimitedStock: false,
    isActive: true,
    description: '收錄四款溫柔植物線稿，適合日常手帳與小卡。',
    tone: 'green',
  },
];

export const INITIAL_DEMO_ACTIVITIES: readonly DemoActivity[] = [
  {
    id: 'activity-1',
    type: 'sale',
    label: '售出 帆布小花袋',
    detail: 'NT$ 480・現金',
    time: '15:42',
  },
  {
    id: 'activity-2',
    type: 'interaction',
    label: '顧客追蹤 Instagram',
    detail: '對晨霧玻璃耳環有興趣',
    time: '15:35',
  },
  {
    id: 'activity-3',
    type: 'sale',
    label: '售出 檸檬奶油塔',
    detail: 'NT$ 180・行動支付',
    time: '15:18',
  },
];

export function createInitialDemoMarkets(): DemoMarket[] {
  return INITIAL_DEMO_MARKETS.map(market => ({ ...market, dates: [...market.dates] }));
}

export function createInitialDemoProducts(): DemoProduct[] {
  return INITIAL_DEMO_PRODUCTS.map(product => ({ ...product }));
}

export function createInitialDemoActivities(): DemoActivity[] {
  return INITIAL_DEMO_ACTIVITIES.map(activity => ({ ...activity }));
}
