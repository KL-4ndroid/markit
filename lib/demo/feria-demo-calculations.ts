import type { DemoExpense, DemoProduct, DemoSale } from './feria-demo-types';

export function getSaleRevenue(sale: DemoSale, products: DemoProduct[]) {
  const product = products.find((item) => item.id === sale.productId);
  return product ? product.price * sale.quantity : 0;
}

export function getSaleCost(sale: DemoSale, products: DemoProduct[]) {
  const product = products.find((item) => item.id === sale.productId);
  return product ? product.unitCost * sale.quantity : 0;
}

export function getMarketRevenue(marketId: string, sales: DemoSale[], products: DemoProduct[]) {
  return sales
    .filter((sale) => sale.marketId === marketId)
    .reduce((total, sale) => total + getSaleRevenue(sale, products), 0);
}

export function getMarketProductCost(marketId: string, sales: DemoSale[], products: DemoProduct[]) {
  return sales
    .filter((sale) => sale.marketId === marketId)
    .reduce((total, sale) => total + getSaleCost(sale, products), 0);
}

export function getMarketExpenses(marketId: string, expenses: DemoExpense[]) {
  return expenses
    .filter((expense) => expense.marketId === marketId)
    .reduce((total, expense) => total + expense.amount, 0);
}

export function getMarketProfit(
  marketId: string,
  sales: DemoSale[],
  products: DemoProduct[],
  expenses: DemoExpense[]
) {
  const revenue = getMarketRevenue(marketId, sales, products);
  const productCost = getMarketProductCost(marketId, sales, products);
  const otherExpenses = getMarketExpenses(marketId, expenses);
  return revenue - productCost - otherExpenses;
}

export function getTopProducts(sales: DemoSale[], products: DemoProduct[]) {
  const totals = new Map<string, { product: DemoProduct; quantity: number; revenue: number; profit: number }>();

  for (const sale of sales) {
    const product = products.find((item) => item.id === sale.productId);
    if (!product) continue;

    const current = totals.get(product.id) ?? {
      product,
      quantity: 0,
      revenue: 0,
      profit: 0,
    };

    current.quantity += sale.quantity;
    current.revenue += product.price * sale.quantity;
    current.profit += (product.price - product.unitCost) * sale.quantity;
    totals.set(product.id, current);
  }

  return Array.from(totals.values()).sort((a, b) => b.revenue - a.revenue);
}

export function getExpenseBreakdown(expenses: DemoExpense[]) {
  const totals = new Map<DemoExpense['type'], number>();

  for (const expense of expenses) {
    totals.set(expense.type, (totals.get(expense.type) ?? 0) + expense.amount);
  }

  return Array.from(totals.entries())
    .map(([type, amount]) => ({ type, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function getTotalRevenue(sales: DemoSale[], products: DemoProduct[]) {
  return sales.reduce((total, sale) => total + getSaleRevenue(sale, products), 0);
}

export function getTotalProductCost(sales: DemoSale[], products: DemoProduct[]) {
  return sales.reduce((total, sale) => total + getSaleCost(sale, products), 0);
}

export function getTotalExpenses(expenses: DemoExpense[]) {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

export function getTotalProfit(sales: DemoSale[], products: DemoProduct[], expenses: DemoExpense[]) {
  return getTotalRevenue(sales, products) - getTotalProductCost(sales, products) - getTotalExpenses(expenses);
}

export function getProductSalesQuantity(productId: string, sales: DemoSale[]) {
  return sales
    .filter((sale) => sale.productId === productId)
    .reduce((total, sale) => total + sale.quantity, 0);
}
