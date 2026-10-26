import type { Market } from '@/types/db';

/** Presentation only: a later operating status does not prove an earlier payment. */
export function marketRegistrationPresentation(status: Market['status']) {
  switch (status) {
    case 'registered': return { label: '等待錄取', note: '收到主辦通知後，再更新錄取結果。', nextStatus: 'accepted' as const, action: '標記已錄取' };
    case 'accepted': return { label: '待繳費', note: '尚未記錄已繳費。完成繳費後，再更新紀錄。', nextStatus: 'paid' as const, action: '標記已繳費' };
    case 'paid': return { label: '已繳費', note: '繳費已記錄，可依營業安排準備出攤。' };
    case 'ongoing': return { label: '如期舉行', note: '這是舉行狀態；繳費情況請依實際紀錄確認。' };
    case 'completed': return { label: '整場已結束', note: '這是結束狀態；不代表已確認繳費。' };
    case 'postponed': return { label: '已延期', note: '確認新的安排後，可更正目前狀態。' };
    case 'cancelled': return { label: '已取消', note: '若取消紀錄有誤，可從其他狀態更正。' };
  }
}
