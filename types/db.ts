/**
 * Féria - 資料庫類型定義
 * 
 * 本檔案定義所有資料庫相關的 TypeScript 介面
 * 遵循事件溯源 (Event Sourcing) 架構
 */

// ==================== 事件系統 ====================

/**
 * 事件類型枚舉
 * 所有可能的事件類型都在此定義
 */
export type EventType =
  // 市集相關事件
  | 'market_created'           // 市集建立
  | 'market_updated'           // 市集更新
  | 'market_status_changed'    // 市集狀態變更
  | 'market_started'           // 市集開始營業
  | 'market_ended'             // 市集結束營業
  | 'market_deleted'           // 市集刪除（軟刪除）
  // 商品相關事件
  | 'product_created'          // 商品建立
  | 'product_updated'          // 商品更新
  | 'product_deleted'          // 商品刪除
  // 互動相關事件
  | 'interaction_recorded'     // 記錄互動（摸摸、詢問）
  | 'interaction_deleted'      // 刪除互動記錄
  | 'deal_closed'              // 成交
  | 'deal_deleted'             // 刪除成交記錄
  // 現場交接相關事件
  | 'field_note_created'       // 建立場次備註
  | 'field_note_updated'       // 更新場次備註
  | 'field_note_deleted'       // 刪除場次備註
  | 'checklist_item_created'   // 建立場次待辦
  | 'checklist_item_updated'   // 更新場次待辦
  | 'checklist_item_deleted'   // 刪除場次待辦
  // 設定相關事件
  | 'settings_updated';        // 設定更新

/**
 * 基礎事件介面
 * 所有事件都必須包含這些欄位
 */
export interface Event<T = any> {
  id?: string;                 // UUID（由前端生成或 Dexie 生成）
  type: EventType;             // 事件類型
  payload: T;                  // 事件資料（根據類型不同而不同）
  timestamp: number;           // 事件發生時間戳（毫秒）
  actor_id?: string;           // 新增：操作者 UUID（用於多人協作）
  market_id?: string;          // 新增：關聯市集 UUID
  sync_status?: 'local_only' | 'pending' | 'synced' | 'conflict' | 'error'; // 新增：同步狀態
  metadata?: {                 // 可選的元數據
    userId?: string;           // 未來可能的用戶 ID
    deviceId?: string;         // 裝置 ID
    version?: string;          // 應用版本
  };
}

// ==================== 市集相關類型 ====================

/**
 * 市集狀態枚舉
 * 對應 PROJECT_CONTEXT.md 中的狀態流轉
 */
export type MarketStatus =
  | 'registered'    // 已報名
  | 'accepted'      // 已錄取
  | 'paid'          // 已繳費
  | 'ongoing'       // 如期舉行（營業中）
  | 'completed'     // 已完成
  | 'postponed'     // 已延期
  | 'cancelled';    // 已取消

/**
 * 營業階段枚舉
 * 用於時間軸管理
 */
export type OperationPhase =
  | 'preparation'   // 準備中
  | 'operating'     // 營業中
  | 'closing';      // 收攤中

/**
 * 市集快照介面
 * 存儲在 markets 表中的當前狀態
 */
export interface Market {
  id?: string;                 // UUID（由前端生成）
  name: string;                // 市集名稱
  location: string;            // 地點
  dates?: string[];            // ✅ 新增：日期陣列（支持多選日期，可選以保持向後兼容）
  startDate: string;           // 開始日期（ISO 8601 格式）- 保留作為最早日期
  endDate: string;             // 結束日期（ISO 8601 格式）- 保留作為最晚日期
  startTime?: string;          // 開始時間（HH:mm）
  endTime?: string;            // 結束時間（HH:mm）
  status: MarketStatus;        // 當前狀態
  operationPhase?: OperationPhase; // 營業階段
  
  // 新增：多人協作欄位
  owner_id?: string;           // 擁有者 UUID
  is_collaborative?: boolean;  // 是否為協作市集
  sync_status?: 'local_only' | 'synced' | 'conflict'; // 同步狀態
  
  // ✅ 新增：員工權限欄位（可選，向後兼容）
  access_type?: 'owner' | 'staff';  // 訪問類型
  permissions?: {                    // 權限設定
    can_view: boolean;
    can_edit: boolean;
  };
  relationship_owner_id?: string;    // 關係中的老闆 ID
  
  // 軟刪除標記
  isDeleted?: boolean;         // 是否已刪除（軟刪除，不顯示在列表中）
  
  // 時間軸資訊
  earlyEntryEnabled?: boolean; // 是否提前進場
  earlyEntryTime?: string;     // 提前進場時間（HH:mm）
  checkInTime?: string;        // 報到時間（HH:mm）
  operatingStartTime?: string; // 營業開始時間（HH:mm）
  operatingEndTime?: string;   // 營業結束時間（HH:mm）
  
  // 財務資訊
  registrationFee: number;     // 報名費用
  boothCost: number;           // 攤位成本
  deposit?: number;            // 保證金
  tableRental?: number;        // 桌子租金
  chairRental?: number;        // 椅子租金
  umbrellaRental?: number;     // 傘租金
  tableclothRental?: number;   // 桌巾租金
  commissionRate?: number;     // 抽成比例（%）
  
  // 免費提供標記
  tableFree?: boolean;         // 桌子免費提供
  chairFree?: boolean;         // 椅子免費提供
  umbrellaFree?: boolean;      // 傘免費提供
  tableclothFree?: boolean;    // 桌巾免費提供
  
  // 統計資訊（從事件計算得出）
  totalRevenue?: number;       // 總收入
  totalProfit?: number;        // 總利潤
  totalInteractions?: number;  // 總互動數
  totalDeals?: number;         // 總成交數
  
  // 備註
  notes?: string;              // 備註
  
  // 時間戳
  createdAt: number;           // 建立時間
  updatedAt: number;           // 最後更新時間
}

/**
 * 市集建立事件的 Payload
 */
export interface MarketCreatedPayload {
  name: string;
  location: string;
  dates?: string[];            // ✅ 新增：日期陣列（多選日期）
  startDate: string;           // 保留：最早日期（向後兼容）
  endDate: string;             // 保留：最晚日期（向後兼容）
  startTime?: string;
  endTime?: string;
  
  // 時間軸資訊
  earlyEntryEnabled?: boolean;
  earlyEntryTime?: string;
  checkInTime?: string;
  operatingStartTime?: string;
  operatingEndTime?: string;
  
  // 財務資訊
  registrationFee: number;
  boothCost: number;
  deposit?: number;
  tableRental?: number;
  chairRental?: number;
  umbrellaRental?: number;
  tableclothRental?: number;
  commissionRate?: number;
  
  // 免費提供標記
  tableFree?: boolean;
  chairFree?: boolean;
  umbrellaFree?: boolean;
  tableclothFree?: boolean;
  
  notes?: string;
}

/**
 * 市集更新事件的 Payload
 */
export interface MarketUpdatedPayload {
  market_id: string;           // 市集 UUID
  updates: Partial<Omit<Market, 'id' | 'createdAt' | 'updatedAt'>>;
}

/**
 * 市集狀態變更事件的 Payload
 */
export interface MarketStatusChangedPayload {
  market_id: string;            // 市集 UUID
  oldStatus: MarketStatus;
  newStatus: MarketStatus;
  reason?: string;             // 變更原因
}

/**
 * 市集刪除事件的 Payload
 */
export interface MarketDeletedPayload {
  market_id: string;            // 市集 UUID
  reason?: string;             // 刪除原因
}

// ==================== 商品相關類型 ====================

/**
 * 商品分類枚舉
 * 可根據實際需求擴充
 */
export type ProductCategory =
  | 'handmade'      // 手作
  | 'food'          // 食品
  | 'accessory'     // 飾品
  | 'clothing'      // 服飾
  | 'art'           // 藝術品
  | 'stationery'    // 文具
  | 'other';        // 其他

/**
 * 商品快照介面
 * ⚠️ 嚴格禁止包含圖片欄位
 */
export interface Product {
  id?: string;                 // UUID（由前端生成）
  owner_id?: string;           // ✅ 新增：商品所有者 UUID
  market_id?: string;          // ✅ 可選：首次創建的市集 UUID（不強制綁定）
  name: string;                // 商品名稱
  category: ProductCategory;   // 商品分類
  price: number;               // 售價
  cost?: number;               // 成本（可選）
  
  // 視覺識別（使用 Lucide Icon 名稱或顏色）
  iconName?: string;           // Lucide Icon 名稱（例如：'Package', 'Heart'）
  colorCode?: string;          // 顏色代碼（例如：'#7B9FA6'）
  
  // 庫存管理
  stock?: number;              // 庫存數量（可選）
  unlimitedStock?: boolean;    // 不限庫存（販售服務或接單訂製，預設 false）
  isActive: boolean;           // 是否啟用
  isShared?: boolean;          // ✅ 新增：是否為共享商品（團隊可見）
  
  // ✅ 新增：員工權限欄位（可選，向後兼容）
  access_type?: 'owner' | 'staff';  // 訪問類型
  permissions?: {                    // 權限設定
    can_view: boolean;
    can_edit: boolean;
  };
  relationship_owner_id?: string;    // 關係中的老闆 ID
  
  // 統計資訊
  totalSold?: number;          // 總銷售數量
  
  // 備註
  description?: string;        // 商品描述
  
  // 時間戳
  createdAt: number;           // 建立時間
  updatedAt: number;           // 最後更新時間
}

/**
 * 商品建立事件的 Payload
 */
export interface ProductCreatedPayload {
  name: string;
  category: ProductCategory;
  price: number;
  cost?: number;
  iconName?: string;
  colorCode?: string;
  stock?: number;
  unlimitedStock?: boolean;    // 不限庫存
  isShared?: boolean;          // ✅ 新增：是否為共享商品
  description?: string;
}

/**
 * 商品更新事件的 Payload
 */
export interface ProductUpdatedPayload {
  productId: string;           // 改為 UUID
  updates: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>;
}

// ==================== 互動相關類型 ====================

/**
 * 互動類型
 * 使用字串類型，支援自訂互動按鈕
 * 預設類型：'button_1', 'button_2', 'button_3'
 * 特殊類型：'deal' (成交)
 */
export type InteractionType = string;

/**
 * 互動記錄事件的 Payload
 */
export interface InteractionRecordedPayload {
  market_id: string;            // 所屬市集 UUID
  type: InteractionType;       // 互動類型（使用按鈕 ID）
  productIds?: string[];       // 相關商品 ID（UUID）
  notes?: string;              // 備註
}

/**
 * 刪除互動記錄事件的 Payload
 */
export interface InteractionDeletedPayload {
  eventId: string;             // 要刪除的互動事件 ID
  market_id: string;            // 所屬市集 ID
  interactionType?: string;    // ✅ 互動類型（用於扣除統計）
}

/**
 * 刪除成交記錄事件的 Payload
 */
export interface DealDeletedPayload {
  eventId: string;             // 要刪除的成交事件 ID
  market_id: string;            // 所屬市集 ID
  dealDate: string;            // 成交日期（用於更新每日統計）
  totalAmount: number;         // 要扣除的金額
  totalCost: number;           // 要扣除的成本
  dealCount: number;           // 要扣除的成交次數
  productsSold?: DailyStats['productsSold']; // 要扣除的商品銷售統計
}

/**
 * 成交事件的 Payload
 */
export interface DealClosedPayload {
  market_id: string;            // 所屬市集 UUID
  dealDate?: string;           // 成交日期（YYYY-MM-DD），用於多天市集區分每日收入
  isBackfill?: boolean;        // 補登標記（補登時不扣庫存）
  isManualEntry?: boolean;     // 手動輸入標記（簡化模式）
  
  // 簡化模式專用（當 isManualEntry = true）
  manualRevenue?: number;      // 手動輸入的收入
  manualCost?: number;         // 手動輸入的成本
  manualDealCount?: number;    // 手動輸入的成交次數
  
  // 完整模式（當 isManualEntry = false 或未設置）
  items: {
    productId: string;         // 商品 ID（UUID）
    quantity: number;          // 數量
    price: number;             // 實際售價（可能有折扣）
    price_at_time_of_sale?: number;  // 成交時的售價
    cost_at_time_of_sale?: number;   // 成交時的成本
    product_name?: string;           // 成交時的商品名稱
  }[];
  totalAmount: number;         // 總金額
  paymentMethod: 'cash' | 'card' | 'mobile' | 'other'; // 支付方式
  notes?: string;              // 備註
}

// ==================== 每日統計類型 ====================

/**
 * 每日統計快照介面
 * 用於快速查詢每日數據
 */
export interface DailyStats {
  id?: number;                 // 自動遞增 ID（Dexie 生成）
  date: string;                // 日期（YYYY-MM-DD）
  marketId?: string;           // 關聯的市集 ID（改為 UUID）

  // 互動統計（預設類型）
  touchCount: number;          // 摸摸次數
  inquiryCount: number;        // 詢問次數
  dealCount: number;           // 成交次數

  // ✅ 靈活互動統計：用於存儲自定義按鈕的互動次數
  // key: 互動按鈕 ID（如 'interest', 'engage', 'button_1' 等）
  // value: 該類型的互動次數
  extraInteractions?: Record<string, number>;

  // 財務統計
  revenue: number;             // 收入
  cost: number;                // 成本
  profit: number;              // 利潤

  // 商品統計
  productsSold: {
    productId: string;         // 改為 UUID
    quantity: number;
    revenue: number;
  }[];

  // 時間戳
  updatedAt: number;           // 最後更新時間
}

// ==================== 設定相關類型 ====================

/**
 * 用戶設定介面
 */
export interface Settings {
  id?: number;                 // 固定為 1（單一設定記錄）
  
  // 顯示設定
  theme: 'light' | 'dark' | 'auto'; // 主題
  language: 'zh-TW' | 'zh-CN' | 'en'; // 語言
  
  // 業務設定
  defaultCurrency: string;     // 預設貨幣（例如：'TWD'）
  taxRate?: number;            // 稅率（可選）
  
  // 通知設定
  enableNotifications: boolean; // 是否啟用通知
  
  // 資料設定
  autoBackup: boolean;         // 自動備份
  lastBackupAt?: number;       // 最後備份時間
  lastSyncAt?: number;         // 最後同步時間（用於多人協作）
  
  // 時間戳
  updatedAt: number;           // 最後更新時間
}

// ==================== 輔助類型 ====================

/**
 * 事件處理器函數類型
 * 用於處理特定類型的事件並更新快照
 */
export type MarketIdPayload = {
  market_id: string;            // 統一使用 market_id (snake_case)
};

export type MarketStatusChangedEventPayload = MarketIdPayload & {
  oldStatus: MarketStatus;
  newStatus: MarketStatus;
  reason?: string;
};

export type ProductCreatedEventPayload = ProductCreatedPayload & {
  productId?: string;
  product_id?: string;
  market_id?: string;
};

export type InteractionRecordedEventPayload = InteractionRecordedPayload & {};

export type DealClosedEventPayload = DealClosedPayload & {};

export type FieldNoteEventPayload = MarketIdPayload & {
  noteId: string;
  text?: string;
};

export type ChecklistItemEventPayload = MarketIdPayload & {
  itemId: string;
  text?: string;
  completed?: boolean;
};

export type EventPayloadMap = {
  market_created: MarketCreatedPayload & {
    market_id?: string;
  };
  market_updated: MarketUpdatedPayload;
  market_status_changed: MarketStatusChangedEventPayload;
  market_started: MarketIdPayload;
  market_ended: MarketIdPayload;
  market_deleted: MarketDeletedPayload & {
    market_id?: string;
  };
  product_created: ProductCreatedEventPayload;
  product_updated: ProductUpdatedPayload;
  product_deleted: {
    productId: string;
  };
  interaction_recorded: InteractionRecordedEventPayload;
  interaction_deleted: InteractionDeletedPayload;
  deal_closed: DealClosedEventPayload;
  deal_deleted: DealDeletedPayload;
  field_note_created: FieldNoteEventPayload & {
    text: string;
  };
  field_note_updated: FieldNoteEventPayload & {
    text: string;
  };
  field_note_deleted: FieldNoteEventPayload;
  checklist_item_created: ChecklistItemEventPayload & {
    text: string;
  };
  checklist_item_updated: ChecklistItemEventPayload;
  checklist_item_deleted: ChecklistItemEventPayload;
  settings_updated: Partial<Settings>;
};

export type EventHandler<T = any> = (
  event: Event<T>,
  db: any // Dexie 資料庫實例
) => Promise<void>;

/**
 * 查詢選項介面
 */
export interface QueryOptions {
  limit?: number;              // 限制數量
  offset?: number;             // 偏移量
  orderBy?: string;            // 排序欄位
  order?: 'asc' | 'desc';      // 排序方向
}
