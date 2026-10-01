export type DemoMarket = {
  id: string;
  name: string;
  location: string;
  date: string;
  city: string;
  weather: string;
  boothFee: number;
  transportCost: number;
  note: string;
};

export type DemoProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  unitCost: number;
  stock: number;
};

export type DemoSale = {
  id: string;
  marketId: string;
  productId: string;
  quantity: number;
  soldAt: string;
};

export type DemoExpense = {
  id: string;
  marketId: string;
  type: '攤位費' | '交通' | '包材' | '材料耗損' | '餐飲' | '其他';
  amount: number;
  note: string;
};

export type DemoTabKey = 'overview' | 'markets' | 'products' | 'sales' | 'expenses' | 'review';
