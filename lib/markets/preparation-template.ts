/** Shared preparation-template rules. No browser or device APIs. */
export interface PreparationTemplateItem { id: string; text: string }
export interface PreparationTemplate {
  id: string; ownerId: string; name: string; items: PreparationTemplateItem[];
  revision: number; mutationId: string; archived: boolean; updatedAt: string;
}
export interface PreparationTemplateDraft {
  id: string; ownerId: string; name: string; items: PreparationTemplateItem[];
  baseRevision: number; mutationId: string; archived: boolean;
}
export const TEMPLATE_MAX_ITEMS = 50;
export function preparationTemplatesEnabled() {
  return process.env.NEXT_PUBLIC_PREPARATION_TEMPLATES_ENABLED === 'true';
}
// Match the server's ASCII whitespace normalization exactly; preserve display text.
export function checklistTextKey(text: string) {
  return text.replace(/[ \t\r\n]+/g, ' ').replace(/^ | $/g, '');
}
export function validatePreparationTemplate(name: string, items: PreparationTemplateItem[]) {
  const title = name.trim();
  if (!title || [...title].length > 60) throw new Error('模板名稱請填寫 1～60 字。');
  if (!items.length || items.length > TEMPLATE_MAX_ITEMS) throw new Error('每份模板請填寫 1～50 個項目。');
  const ids = new Set<string>(); const texts = new Set<string>();
  const normalized = items.map(item => {
    const text = item.text.trim(); const key = checklistTextKey(text);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
      || ids.has(item.id.toLowerCase()) || !key || [...text].length > 200 || /[\r\n]/.test(text)) {
      throw new Error('每個項目請填寫 1～200 字，每行一項。');
    }
    if (texts.has(key)) throw new Error('模板內有重複項目，請合併後再儲存。');
    ids.add(item.id.toLowerCase()); texts.add(key);
    return { id: item.id, text };
  });
  return { name: title, items: normalized };
}
export function templateItemsFromLines(lines: string, previous: PreparationTemplateItem[], newId: () => string) {
  const byText = new Map(previous.map(item => [checklistTextKey(item.text), item.id]));
  return lines.split(/\r?\n/).map(text => text.trim()).filter(Boolean)
    .map(text => ({ id: byText.get(checklistTextKey(text)) ?? newId(), text }));
}
export function preparationTemplateError(error: unknown) {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (message.includes('TEMPLATE_CONFLICT')) return '模板已在其他地方更新。請重新載入；目前輸入仍保留，可複製後整合。';
  if (message.includes('TEMPLATE_PENDING')) return '這場市集還有待辦尚未同步，請待同步完成後再套用模板。';
  if (message.includes('TEMPLATE_SCOPE')) return '目前沒有這個品牌或場次的模板管理權限，請重新確認登入與角色。';
  if (message.includes('TEMPLATE_OFFLINE')) return '模板需要連線才能儲存或套用；請連線後重試。';
  if (message.includes('TEMPLATE_') || message.includes('TIMEOUT')) return '尚未確認結果。請保留目前內容並重試，同一次操作不會重複加入待辦。';
  return message || '暫時無法完成，請保留目前內容並重試。';
}
