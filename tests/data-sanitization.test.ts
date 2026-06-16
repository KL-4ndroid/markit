import assert from 'node:assert/strict';
import {
  canViewSensitiveData,
  sanitizeObject,
  sanitizeArray,
  sanitizeEvents,
  isSensitiveField,
  sanitizeStats,
} from '../lib/data-sanitization';
import type { UserRole } from '../hooks/useUserRole';

const ownerRole: UserRole = { isStaff: false };
const staffRole: UserRole = { isStaff: true, ownerId: 'owner-1' };

// ==================== canViewSensitiveData ====================

assert.equal(
  canViewSensitiveData(ownerRole),
  true,
  'owner should view sensitive data'
);
assert.equal(
  canViewSensitiveData(staffRole),
  false,
  'staff should not view sensitive data'
);

// ==================== sanitizeObject – product snake_case ====================

const snakeProduct = {
  id: 'p-1',
  name: '手工餅乾',
  price: 150,
  cost: 60,
  profit_margin: 0.4,
  supplier_info: '台北供應商',
};

const sanitizedSnakeProduct = sanitizeObject(snakeProduct, 'product', staffRole);
assert.equal(
  sanitizedSnakeProduct.cost,
  undefined,
  'snake product: cost must be removed'
);
assert.equal(
  sanitizedSnakeProduct.profit_margin,
  undefined,
  'snake product: profit_margin must be removed'
);
assert.equal(
  sanitizedSnakeProduct.supplier_info,
  undefined,
  'snake product: supplier_info must be removed'
);
assert.equal(
  sanitizedSnakeProduct.price,
  150,
  'snake product: price must be preserved'
);
assert.equal(
  sanitizedSnakeProduct.name,
  '手工餅乾',
  'snake product: name must be preserved'
);

// ==================== sanitizeObject – product camelCase ====================

const camelProduct = {
  id: 'p-2',
  name: '香氛蠟燭',
  price: 300,
  cost: 120,
  profitMargin: 0.6,
  supplierInfo: '高雄供應商',
};

const sanitizedCamelProduct = sanitizeObject(camelProduct, 'product', staffRole);
assert.equal(
  sanitizedCamelProduct.cost,
  undefined,
  'camel product: cost must be removed'
);
assert.equal(
  sanitizedCamelProduct.profitMargin,
  undefined,
  'camel product: profitMargin must be removed'
);
assert.equal(
  sanitizedCamelProduct.supplierInfo,
  undefined,
  'camel product: supplierInfo must be removed'
);
assert.equal(
  sanitizedCamelProduct.price,
  300,
  'camel product: price must be preserved'
);
assert.equal(
  sanitizedCamelProduct.name,
  '香氛蠟燭',
  'camel product: name must be preserved'
);

// ==================== sanitizeObject – market snake_case ====================

const snakeMarket = {
  id: 'm-1',
  name: '週六文創市集',
  booth_cost: 2000,
  registration_fee: 500,
  total_profit: 15000,
  commission_rate: 0.15,
  total_revenue: 30000,
  deposit: 1000,
  table_rental: 300,
  chair_rental: 100,
  umbrella_rental: 200,
  tablecloth_rental: 50,
};

const sanitizedSnakeMarket = sanitizeObject(snakeMarket, 'market', staffRole);
assert.equal(
  sanitizedSnakeMarket.booth_cost,
  undefined,
  'snake market: booth_cost must be removed'
);
assert.equal(
  sanitizedSnakeMarket.registration_fee,
  undefined,
  'snake market: registration_fee must be removed'
);
assert.equal(
  sanitizedSnakeMarket.total_profit,
  undefined,
  'snake market: total_profit must be removed'
);
assert.equal(
  sanitizedSnakeMarket.commission_rate,
  undefined,
  'snake market: commission_rate must be removed'
);
assert.equal(
  sanitizedSnakeMarket.deposit,
  undefined,
  'snake market: deposit must be removed'
);
assert.equal(
  sanitizedSnakeMarket.table_rental,
  300,
  'snake market: table_rental should be preserved for staff (設備狀態非成本)'
);
assert.equal(
  sanitizedSnakeMarket.chair_rental,
  100,
  'snake market: chair_rental should be preserved for staff (設備狀態非成本)'
);
assert.equal(
  sanitizedSnakeMarket.umbrella_rental,
  200,
  'snake market: umbrella_rental should be preserved for staff (設備狀態非成本)'
);
assert.equal(
  sanitizedSnakeMarket.tablecloth_rental,
  50,
  'snake market: tablecloth_rental should be preserved for staff (設備狀態非成本)'
);
assert.equal(
  sanitizedSnakeMarket.total_revenue,
  30000,
  'snake market: total_revenue must be preserved'
);
assert.equal(
  sanitizedSnakeMarket.name,
  '週六文創市集',
  'snake market: name must be preserved'
);

// ==================== sanitizeObject – market camelCase ====================

const camelMarket = {
  id: 'm-2',
  name: '週末市集',
  boothCost: 2000,
  registrationFee: 500,
  totalProfit: 15000,
  commissionRate: 0.15,
  totalRevenue: 30000,
  deposit: 1000,
  tableRental: 300,
  chairRental: 100,
  umbrellaRental: 200,
  tableclothRental: 50,
};

const sanitizedCamelMarket = sanitizeObject(camelMarket, 'market', staffRole);
assert.equal(
  sanitizedCamelMarket.boothCost,
  undefined,
  'camel market: boothCost must be removed'
);
assert.equal(
  sanitizedCamelMarket.registrationFee,
  undefined,
  'camel market: registrationFee must be removed'
);
assert.equal(
  sanitizedCamelMarket.totalProfit,
  undefined,
  'camel market: totalProfit must be removed'
);
assert.equal(
  sanitizedCamelMarket.commissionRate,
  undefined,
  'camel market: commissionRate must be removed'
);
assert.equal(
  sanitizedCamelMarket.deposit,
  undefined,
  'camel market: deposit must be removed'
);
assert.equal(
  sanitizedCamelMarket.tableRental,
  300,
  'camel market: tableRental should be preserved for staff (設備狀態非成本)'
);
assert.equal(
  sanitizedCamelMarket.chairRental,
  100,
  'camel market: chairRental should be preserved for staff (設備狀態非成本)'
);
assert.equal(
  sanitizedCamelMarket.umbrellaRental,
  200,
  'camel market: umbrellaRental should be preserved for staff (設備狀態非成本)'
);
assert.equal(
  sanitizedCamelMarket.tableclothRental,
  50,
  'camel market: tableclothRental should be preserved for staff (設備狀態非成本)'
);
assert.equal(
  sanitizedCamelMarket.totalRevenue,
  30000,
  'camel market: totalRevenue must be preserved'
);

// ==================== sanitizeObject – stats ====================

const snakeStats = {
  total_revenue: 50000,
  total_cost: 20000,
  net_profit: 30000,
  profit_margin: 0.6,
  cost_breakdown: { venue: 10000, materials: 10000 },
  average_cost: 80,
  cost_per_item: 40,
  items_sold: 250,
};

const sanitizedSnakeStats = sanitizeStats(snakeStats, staffRole);
assert.equal(
  sanitizedSnakeStats.total_cost,
  undefined,
  'snake stats: total_cost must be removed'
);
assert.equal(
  sanitizedSnakeStats.net_profit,
  undefined,
  'snake stats: net_profit must be removed'
);
assert.equal(
  sanitizedSnakeStats.profit_margin,
  undefined,
  'snake stats: profit_margin must be removed'
);
assert.equal(
  sanitizedSnakeStats.cost_breakdown,
  undefined,
  'snake stats: cost_breakdown must be removed'
);
assert.equal(
  sanitizedSnakeStats.average_cost,
  undefined,
  'snake stats: average_cost must be removed'
);
assert.equal(
  sanitizedSnakeStats.cost_per_item,
  undefined,
  'snake stats: cost_per_item must be removed'
);
assert.equal(
  sanitizedSnakeStats.total_revenue,
  50000,
  'snake stats: total_revenue must be preserved'
);
assert.equal(
  sanitizedSnakeStats.items_sold,
  250,
  'snake stats: items_sold must be preserved'
);

// ==================== sanitizeObject – stats camelCase ====================

const camelStats = {
  totalRevenue: 50000,
  totalCost: 20000,
  netProfit: 30000,
  profitMargin: 0.6,
  costBreakdown: { venue: 10000, materials: 10000 },
  averageCost: 80,
  costPerItem: 40,
  itemsSold: 250,
};

const sanitizedCamelStats = sanitizeStats(camelStats, staffRole);
assert.equal(
  sanitizedCamelStats.totalCost,
  undefined,
  'camel stats: totalCost must be removed'
);
assert.equal(
  sanitizedCamelStats.netProfit,
  undefined,
  'camel stats: netProfit must be removed'
);
assert.equal(
  sanitizedCamelStats.profitMargin,
  undefined,
  'camel stats: profitMargin must be removed'
);
assert.equal(
  sanitizedCamelStats.costBreakdown,
  undefined,
  'camel stats: costBreakdown must be removed'
);
assert.equal(
  sanitizedCamelStats.averageCost,
  undefined,
  'camel stats: averageCost must be removed'
);
assert.equal(
  sanitizedCamelStats.costPerItem,
  undefined,
  'camel stats: costPerItem must be removed'
);
assert.equal(
  sanitizedCamelStats.totalRevenue,
  50000,
  'camel stats: totalRevenue must be preserved'
);
assert.equal(
  sanitizedCamelStats.itemsSold,
  250,
  'camel stats: itemsSold must be preserved'
);

// ==================== sanitizeEvents – deal_closed payload ====================

const dealClosedEvents = [
  {
    id: 'e-1',
    type: 'deal_closed',
    payload: {
      market_id: 'm-1',
      dealDate: '2025-06-01',
      isManualEntry: false,
      items: [
        {
          productId: 'p-1',
          quantity: 2,
          price: 150,
          price_at_time_of_sale: 150,
          cost_at_time_of_sale: 60,
        },
        {
          productId: 'p-2',
          quantity: 1,
          price: 300,
          price_at_time_of_sale: 300,
          cost_at_time_of_sale: 120,
        },
      ],
      totalAmount: 600,
      totalCost: 240,
      paymentMethod: 'cash',
    },
  },
  {
    id: 'e-2',
    type: 'deal_closed',
    payload: {
      market_id: 'm-1',
      isManualEntry: true,
      manualRevenue: 2000,
      manualCost: 800,
      manualDealCount: 5,
    },
  },
];

const sanitizedDealEvents = sanitizeEvents(dealClosedEvents, staffRole);

const sanitizedDealPayload = sanitizedDealEvents[0].payload as any;
assert.equal(
  sanitizedDealPayload.totalCost,
  undefined,
  'deal_closed: totalCost must be removed'
);
assert.equal(
  sanitizedDealPayload.items[0].cost_at_time_of_sale,
  undefined,
  'deal_closed: items[0].cost_at_time_of_sale must be removed'
);
assert.equal(
  sanitizedDealPayload.items[1].cost_at_time_of_sale,
  undefined,
  'deal_closed: items[1].cost_at_time_of_sale must be removed'
);
assert.equal(
  sanitizedDealPayload.items[0].price_at_time_of_sale,
  150,
  'deal_closed: items[].price_at_time_of_sale must be preserved'
);
assert.equal(
  sanitizedDealPayload.totalAmount,
  600,
  'deal_closed: totalAmount must be preserved'
);

const sanitizedManualPayload = sanitizedDealEvents[1].payload as any;
assert.equal(
  sanitizedManualPayload.manualCost,
  undefined,
  'deal_closed manual: manualCost must be removed'
);
assert.equal(
  sanitizedManualPayload.manualRevenue,
  2000,
  'deal_closed manual: manualRevenue must be preserved'
);
assert.equal(
  sanitizedManualPayload.manualDealCount,
  5,
  'deal_closed manual: manualDealCount must be preserved'
);

// ==================== sanitizeEvents – tombstone replay fields ====================

const tombstoneEvents = [
  {
    id: 'delete-deal-camel',
    type: 'deal_deleted',
    payload: {
      eventId: 'deal-1',
      marketId: 'market-1',
      market_id: 'market-1',
      dealDate: '2026-06-12',
      totalAmount: 1200,
      totalCost: 500,
      dealCount: 3,
      reason: 'manual_delete',
    },
  },
  {
    id: 'delete-deal-snake',
    type: 'deal_deleted',
    payload: {
      event_id: 'deal-2',
      market_id: 'market-1',
      deal_date: '2026-06-13',
      total_amount: 800,
      total_cost: 300,
      deal_count: 2,
      reason: 'manual_delete',
    },
  },
  {
    id: 'delete-interaction',
    type: 'interaction_deleted',
    payload: {
      eventId: 'interaction-1',
      event_id: 'interaction-1',
      marketId: 'market-1',
      market_id: 'market-1',
      interactionType: 'touch',
    },
  },
];

const sanitizedTombstones = sanitizeEvents(tombstoneEvents, staffRole);

const sanitizedDealDeletedCamel = sanitizedTombstones[0].payload as any;
assert.equal(
  sanitizedDealDeletedCamel.eventId,
  'deal-1',
  'deal_deleted camel: eventId must be preserved for tombstone replay'
);
assert.equal(
  sanitizedDealDeletedCamel.marketId,
  'market-1',
  'deal_deleted camel: marketId must be preserved for tombstone replay'
);
assert.equal(
  sanitizedDealDeletedCamel.market_id,
  'market-1',
  'deal_deleted camel: market_id must be preserved for tombstone replay'
);
assert.equal(
  sanitizedDealDeletedCamel.dealDate,
  '2026-06-12',
  'deal_deleted camel: dealDate must be preserved for tombstone replay'
);
assert.equal(
  sanitizedDealDeletedCamel.totalAmount,
  1200,
  'deal_deleted camel: totalAmount must be preserved for tombstone replay'
);
assert.equal(
  sanitizedDealDeletedCamel.dealCount,
  3,
  'deal_deleted camel: dealCount must be preserved for tombstone replay'
);
assert.equal(
  sanitizedDealDeletedCamel.totalCost,
  undefined,
  'deal_deleted camel: totalCost must be removed for staff'
);

const sanitizedDealDeletedSnake = sanitizedTombstones[1].payload as any;
assert.equal(
  sanitizedDealDeletedSnake.event_id,
  'deal-2',
  'deal_deleted snake: event_id must be preserved for tombstone replay'
);
assert.equal(
  sanitizedDealDeletedSnake.market_id,
  'market-1',
  'deal_deleted snake: market_id must be preserved for tombstone replay'
);
assert.equal(
  sanitizedDealDeletedSnake.deal_date,
  '2026-06-13',
  'deal_deleted snake: deal_date must be preserved for tombstone replay'
);
assert.equal(
  sanitizedDealDeletedSnake.total_amount,
  800,
  'deal_deleted snake: total_amount must be preserved for tombstone replay'
);
assert.equal(
  sanitizedDealDeletedSnake.deal_count,
  2,
  'deal_deleted snake: deal_count must be preserved for tombstone replay'
);
assert.equal(
  sanitizedDealDeletedSnake.total_cost,
  undefined,
  'deal_deleted snake: total_cost must be removed for staff'
);

const sanitizedInteractionDeleted = sanitizedTombstones[2].payload as any;
assert.equal(
  sanitizedInteractionDeleted.eventId,
  'interaction-1',
  'interaction_deleted: eventId must be preserved for tombstone replay'
);
assert.equal(
  sanitizedInteractionDeleted.event_id,
  'interaction-1',
  'interaction_deleted: event_id must be preserved for tombstone replay'
);
assert.equal(
  sanitizedInteractionDeleted.marketId,
  'market-1',
  'interaction_deleted: marketId must be preserved for tombstone replay'
);
assert.equal(
  sanitizedInteractionDeleted.market_id,
  'market-1',
  'interaction_deleted: market_id must be preserved for tombstone replay'
);

// ==================== sanitizeEvents – cost events must be filtered ====================

const costEvents = [
  { id: 'e-3', type: 'cost_added', payload: { cost: 500, description: '設備租金' } },
  { id: 'e-4', type: 'cost_updated', payload: { cost: 600 } },
  { id: 'e-5', type: 'cost_deleted', payload: { cost: 500 } },
  { id: 'e-6', type: 'inventory_cost_updated', payload: { cost: 50 } },
  { id: 'e-7', type: 'interaction_recorded', payload: { market_id: 'm-1', type: 'button_1' } },
];

const sanitizedCostEvents = sanitizeEvents(costEvents, staffRole);
assert.equal(
  sanitizedCostEvents.length,
  1,
  'cost_added/cost_updated/cost_deleted/inventory_cost_updated must be filtered out'
);
assert.equal(
  sanitizedCostEvents[0].type,
  'interaction_recorded',
  'interaction_recorded must be preserved'
);

// ==================== sanitizeEvents – product_updated payload ====================

const productUpdatedEvents = [
  {
    id: 'e-8',
    type: 'product_updated',
    payload: {
      productId: 'p-1',
      updates: {
        price: 180,
        cost: 70,
        stock: 50,
        profitMargin: 0.61,
      },
    },
  },
];

const sanitizedProductEvents = sanitizeEvents(productUpdatedEvents, staffRole);
const productUpdates = (sanitizedProductEvents[0].payload as any).updates;
assert.equal(
  productUpdates.cost,
  undefined,
  'product_updated: updates.cost must be removed'
);
assert.equal(
  productUpdates.profitMargin,
  undefined,
  'product_updated: updates.profitMargin must be removed'
);
assert.equal(
  productUpdates.price,
  180,
  'product_updated: updates.price must be preserved'
);
assert.equal(
  productUpdates.stock,
  50,
  'product_updated: updates.stock must be preserved'
);

// ==================== sanitizeEvents must NOT mutate original events ====================

const originalDealEvents = [
  {
    id: 'e-orig',
    type: 'deal_closed',
    payload: {
      market_id: 'm-1',
      isManualEntry: true,
      manualRevenue: 9999,
      manualCost: 5555,
    },
  },
];
const originalPayload = originalDealEvents[0].payload;
sanitizeEvents(originalDealEvents, staffRole);
assert.equal(
  (originalPayload as any).manualCost,
  5555,
  'original event payload must NOT be mutated'
);
assert.equal(
  (originalPayload as any).manualRevenue,
  9999,
  'original event payload must NOT be mutated'
);

// ==================== sanitizeObject must NOT mutate original object ====================

const originalProduct = {
  id: 'p-orig',
  name: '原味司康',
  price: 100,
  cost: 40,
};
sanitizeObject(originalProduct, 'product', staffRole);
assert.equal(
  originalProduct.cost,
  40,
  'original object must NOT be mutated'
);
assert.equal(
  originalProduct.price,
  100,
  'original object must NOT be mutated'
);

// ==================== sanitizeArray must NOT mutate original items ====================

const originalProducts = [
  { id: 'p-a', name: '商品A', price: 200, cost: 80 },
  { id: 'p-b', name: '商品B', price: 300, cost: 150 },
];
sanitizeArray(originalProducts, 'product', staffRole);
assert.equal(
  originalProducts[0].cost,
  80,
  'original array items must NOT be mutated'
);
assert.equal(
  originalProducts[1].cost,
  150,
  'original array items must NOT be mutated'
);

// ==================== owner role: data must remain unchanged ====================

const ownerProduct = { id: 'p-owner', name: '老闆商品', price: 500, cost: 200 };
const ownerSanitized = sanitizeObject(ownerProduct, 'product', ownerRole);
assert.equal(
  ownerSanitized.cost,
  200,
  'owner: cost must be preserved'
);
assert.equal(
  ownerSanitized.price,
  500,
  'owner: price must be preserved'
);

// ==================== isSensitiveField ====================

assert.equal(
  isSensitiveField('cost', 'product'),
  true,
  'cost is sensitive for product'
);
assert.equal(
  isSensitiveField('cost', 'market'),
  false,
  'cost is not listed as sensitive for market type (covered under different keys)'
);
assert.equal(
  isSensitiveField('profitMargin', 'product'),
  true,
  'profitMargin is sensitive for product'
);
assert.equal(
  isSensitiveField('boothCost', 'market'),
  true,
  'boothCost is sensitive for market'
);

// ==================== Phase 9E: fake-0 regression ====================

// Mapper 可能補出 cost: 0 / boothCost: 0 等假 0，sanitize 後 key 必須消失（不等於 0，是要消失）
const fakeZeroProduct = {
  id: 'p-zero',
  name: '零成本商品',
  price: 50,
  cost: 0,
  profitMargin: 0,
  supplierInfo: 0,
};
const sanitizedFakeZeroProduct = sanitizeObject(fakeZeroProduct, 'product', staffRole);
assert.equal(
  sanitizedFakeZeroProduct.cost,
  undefined,
  'fake-0 product: cost key must be removed (not just set to 0)'
);
assert.equal(
  sanitizedFakeZeroProduct.profitMargin,
  undefined,
  'fake-0 product: profitMargin key must be removed'
);
assert.equal(
  sanitizedFakeZeroProduct.supplierInfo,
  undefined,
  'fake-0 product: supplierInfo key must be removed'
);
assert.equal(
  sanitizedFakeZeroProduct.price,
  50,
  'fake-0 product: price must be preserved'
);

const fakeZeroMarket = {
  id: 'm-zero',
  name: '零成本市集',
  boothCost: 0,
  registrationFee: 0,
  totalProfit: 0,
  commissionRate: 0,
  deposit: 0,
  totalRevenue: 10000,
};
const sanitizedFakeZeroMarket = sanitizeObject(fakeZeroMarket, 'market', staffRole);
assert.equal(
  sanitizedFakeZeroMarket.boothCost,
  undefined,
  'fake-0 market: boothCost key must be removed'
);
assert.equal(
  sanitizedFakeZeroMarket.registrationFee,
  undefined,
  'fake-0 market: registrationFee key must be removed'
);
assert.equal(
  sanitizedFakeZeroMarket.totalProfit,
  undefined,
  'fake-0 market: totalProfit key must be removed'
);
assert.equal(
  sanitizedFakeZeroMarket.commissionRate,
  undefined,
  'fake-0 market: commissionRate key must be removed'
);
assert.equal(
  sanitizedFakeZeroMarket.deposit,
  undefined,
  'fake-0 market: deposit key must be removed'
);
assert.equal(
  sanitizedFakeZeroMarket.totalRevenue,
  10000,
  'fake-0 market: totalRevenue must be preserved'
);

// sanitizeStats 也必須移除 cost: 0 / profit: 0
const fakeZeroStats = {
  total_revenue: 8000,
  total_cost: 0,
  net_profit: 0,
  profit_margin: 0,
  cost_breakdown: undefined,
  average_cost: 0,
  cost_per_item: 0,
  items_sold: 100,
};
const sanitizedFakeZeroStats = sanitizeStats(fakeZeroStats, staffRole);
assert.equal(
  sanitizedFakeZeroStats.total_cost,
  undefined,
  'fake-0 stats: total_cost key must be removed'
);
assert.equal(
  sanitizedFakeZeroStats.net_profit,
  undefined,
  'fake-0 stats: net_profit key must be removed'
);
assert.equal(
  sanitizedFakeZeroStats.profit_margin,
  undefined,
  'fake-0 stats: profit_margin key must be removed'
);
assert.equal(
  sanitizedFakeZeroStats.average_cost,
  undefined,
  'fake-0 stats: average_cost key must be removed'
);
assert.equal(
  sanitizedFakeZeroStats.cost_per_item,
  undefined,
  'fake-0 stats: cost_per_item key must be removed'
);
assert.equal(
  sanitizedFakeZeroStats.total_revenue,
  8000,
  'fake-0 stats: total_revenue must be preserved'
);
assert.equal(
  sanitizedFakeZeroStats.items_sold,
  100,
  'fake-0 stats: items_sold must be preserved'
);

// ==================== Phase 9E: sanitizeEvents does NOT mutate original ====================

const phase9eEvents = [
  {
    id: 'e-immut-test',
    type: 'deal_closed',
    payload: {
      market_id: 'm-immut',
      totalCost: 999,
      manualCost: 888,
      items: [{ price_at_time_of_sale: 100, cost_at_time_of_sale: 50 }],
    },
  },
];
const phase9eOriginalPayload = phase9eEvents[0].payload;
sanitizeEvents(phase9eEvents, staffRole);
assert.equal(
  (phase9eOriginalPayload as any).totalCost,
  999,
  'sanitizeEvents must not mutate original payload.totalCost'
);
assert.equal(
  (phase9eOriginalPayload as any).manualCost,
  888,
  'sanitizeEvents must not mutate original payload.manualCost'
);
assert.equal(
  (phase9eOriginalPayload as any).items[0].cost_at_time_of_sale,
  50,
  'sanitizeEvents must not mutate original payload.items[0].cost_at_time_of_sale'
);

console.log('✅ All data-sanitization assertions passed');
