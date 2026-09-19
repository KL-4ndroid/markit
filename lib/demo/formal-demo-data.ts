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
  scenarioLabel: string;
  revenue: number;
  deals: number;
  interactions: number;
  grossMargin: number;
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

type DemoMarketSeed = Pick<
  DemoMarket,
  | 'id'
  | 'name'
  | 'dateLabel'
  | 'location'
  | 'status'
  | 'scenarioLabel'
  | 'revenue'
  | 'deals'
  | 'interactions'
  | 'grossMargin'
  | 'note'
  | 'dates'
> & Partial<Omit<DemoMarket,
  | 'id'
  | 'name'
  | 'dateLabel'
  | 'location'
  | 'status'
  | 'scenarioLabel'
  | 'revenue'
  | 'deals'
  | 'interactions'
  | 'grossMargin'
  | 'note'
  | 'dates'
>>;

function defineDemoMarket(seed: DemoMarketSeed): DemoMarket {
  const operatingStartTime = seed.operatingStartTime ?? '11:00';
  const operatingEndTime = seed.operatingEndTime ?? '18:00';

  return {
    time: seed.time ?? `${operatingStartTime} - ${operatingEndTime}`,
    checkInTime: seed.checkInTime ?? '10:30',
    operatingStartTime,
    operatingEndTime,
    boothCost: seed.boothCost ?? 1200,
    deposit: seed.deposit ?? 0,
    commissionRate: seed.commissionRate ?? 0,
    tableRental: seed.tableRental ?? 0,
    chairRental: seed.chairRental ?? 0,
    umbrellaRental: seed.umbrellaRental ?? 0,
    tableFree: seed.tableFree ?? true,
    chairFree: seed.chairFree ?? true,
    umbrellaFree: seed.umbrellaFree ?? true,
    salesPhotoEvidenceRequired: seed.salesPhotoEvidenceRequired ?? false,
    ...seed,
  };
}

export const INITIAL_DEMO_MARKETS: readonly DemoMarket[] = [
  defineDemoMarket({
    id: 'market-summer',
    name: '夏日手作散步市集',
    dateLabel: '7/18（六）',
    location: '台北・松山文創園區',
    status: 'operating',
    scenarioLabel: '現場營運中',
    revenue: 4860,
    deals: 12,
    interactions: 28,
    grossMargin: 0.66,
    note: '午後人潮逐漸增加，帆布小花袋與檸檬塔詢問度最高。',
    dates: ['2026-07-18'],
    operatingEndTime: '19:00',
    boothCost: 1200,
    deposit: 500,
    tableRental: 200,
    chairRental: 100,
    tableFree: false,
    chairFree: false,
  }),
  defineDemoMarket({
    id: 'market-riverside',
    name: '河畔日和小市集',
    dateLabel: '7/23（四）',
    location: '新北・淡水金色水岸',
    status: 'preparing',
    scenarioLabel: '夜間市集準備',
    revenue: 0,
    deals: 0,
    interactions: 0,
    grossMargin: 0.65,
    note: '傍晚才開場，需要準備夜間照明、防風夾與延長線。',
    dates: ['2026-07-23'],
    checkInTime: '13:30',
    operatingStartTime: '14:00',
    operatingEndTime: '20:00',
    boothCost: 1500,
    deposit: 500,
    commissionRate: 5,
    salesPhotoEvidenceRequired: true,
  }),
  defineDemoMarket({
    id: 'market-warehouse',
    name: '老倉庫週末選物日',
    dateLabel: '8/2（日）',
    location: '高雄・駁二藝術特區',
    status: 'preparing',
    scenarioLabel: '跨城市出攤',
    revenue: 0,
    deals: 0,
    interactions: 0,
    grossMargin: 0.67,
    note: '首次跨城市出攤，需另外確認物流、住宿與備貨量。',
    dates: ['2026-08-02'],
    checkInTime: '09:30',
    operatingStartTime: '11:00',
    operatingEndTime: '18:30',
    boothCost: 2200,
    deposit: 1000,
    tableRental: 300,
    tableFree: false,
    salesPhotoEvidenceRequired: true,
  }),
  defineDemoMarket({
    id: 'market-spring',
    name: '春風生活祭',
    dateLabel: '6/28（日）',
    location: '台中・審計新村',
    status: 'ended',
    scenarioLabel: '回購客帶動成長',
    revenue: 9280,
    deals: 24,
    interactions: 51,
    grossMargin: 0.72,
    note: '回購客比例明顯提高，飾品與文具都有加購，下次可增加熟客限定組合。',
    dates: ['2026-06-28'],
    checkInTime: '11:30',
    operatingStartTime: '12:00',
    boothCost: 1100,
    tableRental: 200,
    chairRental: 100,
    tableFree: false,
    chairFree: false,
  }),
  defineDemoMarket({
    id: 'market-rainy',
    name: '梅雨小巷市集',
    dateLabel: '6/14（日）',
    location: '台北・赤峰街',
    status: 'ended',
    scenarioLabel: '雨天人流不足',
    revenue: 2150,
    deals: 7,
    interactions: 23,
    grossMargin: 0.58,
    note: '午後大雨讓人流提早散去，低單價商品有成交，但營收不足以覆蓋攤位與設備成本。',
    dates: ['2026-06-14'],
    boothCost: 1800,
    tableRental: 300,
    chairRental: 200,
    tableFree: false,
    chairFree: false,
    umbrellaRental: 400,
    umbrellaFree: false,
  }),
  defineDemoMarket({
    id: 'market-urban-design',
    name: '城市設計選品展',
    dateLabel: '5/30（六）',
    location: '台北・華山文創園區',
    status: 'ended',
    scenarioLabel: '高營收但成本偏高',
    revenue: 16800,
    deals: 28,
    interactions: 85,
    grossMargin: 0.46,
    note: '營收創新高，但高攤位費、抽成與包裝成本壓縮利潤，需要重新評估高價場次。',
    dates: ['2026-05-30'],
    operatingStartTime: '10:30',
    operatingEndTime: '20:00',
    boothCost: 3000,
    commissionRate: 12,
    tableRental: 200,
    chairRental: 100,
    tableFree: false,
    chairFree: false,
  }),
  defineDemoMarket({
    id: 'market-community',
    name: '社區晨光小聚',
    dateLabel: '5/17（日）',
    location: '新竹・將軍村',
    status: 'ended',
    scenarioLabel: '低人流高轉換',
    revenue: 6200,
    deals: 10,
    interactions: 14,
    grossMargin: 0.7,
    note: '人流不大，但客群明確、停留時間長，多數詢問都能轉為成交，適合帶完整系列。',
    dates: ['2026-05-17'],
    operatingStartTime: '09:00',
    operatingEndTime: '14:00',
    boothCost: 600,
  }),
  defineDemoMarket({
    id: 'market-campus',
    name: '青春校園創意祭',
    dateLabel: '5/2（六）',
    location: '台南・成功大學',
    status: 'ended',
    scenarioLabel: '高人流低轉換',
    revenue: 5400,
    deals: 11,
    interactions: 96,
    grossMargin: 0.64,
    note: '停留與試用很多，但價格超出學生預算；下次應增加入門商品或小型組合。',
    dates: ['2026-05-02'],
    boothCost: 900,
  }),
  defineDemoMarket({
    id: 'market-mothers-day',
    name: '五月感謝生活節',
    dateLabel: '4/25（六）',
    location: '台中・勤美草悟道',
    status: 'ended',
    scenarioLabel: '節慶高客單',
    revenue: 14200,
    deals: 19,
    interactions: 32,
    grossMargin: 0.76,
    note: '送禮需求帶動耳環與包袋組合，高客單商品轉換良好，節慶檔期值得提前備貨。',
    dates: ['2026-04-25'],
    boothCost: 1600,
    tableRental: 200,
    tableFree: false,
  }),
  defineDemoMarket({
    id: 'market-pet',
    name: '毛孩同樂日',
    dateLabel: '4/12（日）',
    location: '新北・板橋435藝文特區',
    status: 'ended',
    scenarioLabel: '客群與商品不匹配',
    revenue: 2900,
    deals: 6,
    interactions: 48,
    grossMargin: 0.61,
    note: '活動人很多，但主力客群以寵物用品為目標，品牌商品關聯較弱，詢問多但成交少。',
    dates: ['2026-04-12'],
    boothCost: 1500,
  }),
  defineDemoMarket({
    id: 'market-seaside',
    name: '海風慢生活市集',
    dateLabel: '3/29（日）',
    location: '基隆・正濱漁港',
    status: 'ended',
    scenarioLabel: '長工時中等回報',
    revenue: 7800,
    deals: 16,
    interactions: 44,
    grossMargin: 0.62,
    note: '觀光客帶來穩定成交，但營運時間長、交通與防風設備成本高，需要看每小時利潤。',
    dates: ['2026-03-29'],
    checkInTime: '08:30',
    operatingStartTime: '10:00',
    operatingEndTime: '20:00',
    boothCost: 1400,
    tableRental: 200,
    umbrellaRental: 300,
    tableFree: false,
    umbrellaFree: false,
  }),
  defineDemoMarket({
    id: 'market-lunar',
    name: '新春手感年貨集',
    dateLabel: '2/15（日）',
    location: '台北・四四南村',
    status: 'ended',
    scenarioLabel: '季節限定熱賣',
    revenue: 19800,
    deals: 36,
    interactions: 72,
    grossMargin: 0.69,
    note: '年節送禮組與限定包裝熱賣，營收與轉換都突出，但季節性高，不宜直接當作平日基準。',
    dates: ['2026-02-15'],
    boothCost: 2200,
    commissionRate: 5,
    tableRental: 200,
    chairRental: 100,
    tableFree: false,
    chairFree: false,
  }),
  defineDemoMarket({
    id: 'market-first',
    name: '品牌第一次出攤',
    dateLabel: '1/25（日）',
    location: '桃園・中原文創園區',
    status: 'ended',
    scenarioLabel: '新品牌基準場',
    revenue: 3600,
    deals: 8,
    interactions: 31,
    grossMargin: 0.55,
    note: '第一次出攤以建立流程與觀察客群為主，陳列、話術與備貨都有明確的改善方向。',
    dates: ['2026-01-25'],
    boothCost: 900,
    tableRental: 100,
    chairRental: 100,
    tableFree: false,
    chairFree: false,
  }),
];

export const INITIAL_DEMO_PRODUCTS: readonly DemoProduct[] = [
  { id: 'product-flower-bag', name: '帆布小花袋', category: '手作', price: 480, stock: 8, sold: 42, cost: 180, unlimitedStock: false, isActive: true, description: '厚磅帆布搭配手繡小花，每一只都有些微不同。', tone: 'pink' },
  { id: 'product-lemon-tart', name: '檸檬奶油塔', category: '食品', price: 180, stock: 12, sold: 68, cost: 65, unlimitedStock: false, isActive: true, description: '手工檸檬凝乳搭配酥香杏仁塔皮。', tone: 'yellow' },
  { id: 'product-glass-earring', name: '晨霧玻璃耳環', category: '飾品', price: 620, stock: 5, sold: 31, cost: 230, unlimitedStock: false, isActive: true, description: '霧面玻璃與天然淡水珠組成的輕盈耳飾。', tone: 'blue' },
  { id: 'product-leaf-note', name: '森日便箋組', category: '文具', price: 160, stock: 16, sold: 54, cost: 45, unlimitedStock: false, isActive: true, description: '四款植物線稿，適合手帳、禮物與日常小卡。', tone: 'green' },
  { id: 'product-wool-pin', name: '羊毛氈野花胸針', category: '手作', price: 360, stock: 7, sold: 27, cost: 110, unlimitedStock: false, isActive: true, description: '以台灣常見野花配色製作的手工羊毛氈胸針。', tone: 'green' },
  { id: 'product-cold-brew', name: '柑橘冷萃咖啡', category: '食品', price: 150, stock: 18, sold: 46, cost: 52, unlimitedStock: false, isActive: true, description: '帶有淡淡柑橘香氣的清爽冷萃咖啡。', tone: 'blue' },
  { id: 'product-brass-necklace', name: '黃銅月光項鍊', category: '飾品', price: 980, stock: 4, sold: 18, cost: 340, unlimitedStock: false, isActive: true, description: '手工敲紋黃銅墜飾，適合送禮與日常搭配。', tone: 'yellow' },
  { id: 'product-linen-apron', name: '日常亞麻工作圍裙', category: '服飾', price: 1280, stock: 3, sold: 9, cost: 520, unlimitedStock: false, isActive: true, description: '可調節肩帶與雙口袋設計，適合工作與料理。', tone: 'green' },
  { id: 'product-city-postcard', name: '散步城市明信片', category: '藝術', price: 80, stock: 30, sold: 73, cost: 18, unlimitedStock: false, isActive: true, description: '收錄市集所在城市街景的原創水彩插畫。', tone: 'pink' },
  { id: 'product-market-sticker', name: '出攤日常貼紙包', category: '文具', price: 120, stock: 24, sold: 61, cost: 28, unlimitedStock: false, isActive: true, description: '適合手帳紀錄的市集、天氣與營運小圖示。', tone: 'yellow' },
  { id: 'product-gift-wrap', name: '品牌禮物包裝服務', category: '其他', price: 60, stock: 0, sold: 38, cost: 16, unlimitedStock: true, isActive: true, description: '緞帶、品牌小卡與再生紙材的現場包裝服務。', tone: 'blue' },
  { id: 'product-holiday-box', name: '冬季限定禮物盒', category: '其他', price: 880, stock: 0, sold: 22, cost: 310, unlimitedStock: false, isActive: false, description: '已下架的季節限定組合，保留歷史銷售紀錄供比較。', tone: 'pink' },
];

export const INITIAL_DEMO_ACTIVITIES: readonly DemoActivity[] = [
  { id: 'activity-1', type: 'sale', label: '售出 帆布小花袋', detail: 'NT$ 480・現金', time: '15:42' },
  { id: 'activity-2', type: 'interaction', label: '顧客追蹤 Instagram', detail: '對晨霧玻璃耳環有興趣', time: '15:35' },
  { id: 'activity-3', type: 'sale', label: '售出 檸檬奶油塔 x2', detail: 'NT$ 360・行動支付', time: '15:18' },
  { id: 'activity-4', type: 'sale', label: '售出 黃銅月光項鍊', detail: 'NT$ 980・信用卡', time: '14:56' },
  { id: 'activity-5', type: 'interaction', label: '試戴與尺寸詢問', detail: '比較兩款耳環與項鍊', time: '14:41' },
  { id: 'activity-6', type: 'sale', label: '售出 森日便箋組', detail: 'NT$ 160・現金', time: '14:23' },
  { id: 'activity-7', type: 'interaction', label: '詢問品牌故事', detail: '掃描品牌 QR Code', time: '14:08' },
  { id: 'activity-8', type: 'sale', label: '售出 柑橘冷萃咖啡 x3', detail: 'NT$ 450・行動支付', time: '13:52' },
  { id: 'activity-9', type: 'interaction', label: '詢問企業送禮', detail: '希望取得 20 份禮物報價', time: '13:31' },
  { id: 'activity-10', type: 'sale', label: '售出 散步城市明信片 x4', detail: 'NT$ 320・現金', time: '13:16' },
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
