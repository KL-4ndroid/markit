'use client';

import { useState } from 'react';
import { CheckSquare, Plus, Save, Trash2, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import {
  createChecklistItem,
  deleteChecklistItem,
  getActiveChecklistItemsForMarket,
  toggleChecklistItem,
  updateChecklistItem,
  type ChecklistItem,
} from '@/lib/markets/checklist';

interface ChecklistPanelProps {
  marketId: string;
  canManage: boolean;
}

export function ChecklistPanel({ marketId, canManage }: ChecklistPanelProps) {
  const [text, setText] = useState('');
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const items = useLiveQuery(
    () => getActiveChecklistItemsForMarket(marketId),
    [marketId],
    []
  );

  const remaining = items.filter(item => !item.completed).length;

  const handleCreate = async () => {
    if (!canManage || isSaving) return;
    setIsSaving(true);
    try {
      await createChecklistItem(marketId, text);
      setText('');
      toast.success('Checklist 已新增');
    } catch (error) {
      console.error('create checklist item failed:', error);
      toast.error('新增 checklist 失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (item: ChecklistItem) => {
    if (!canManage || isSaving) return;
    setIsSaving(true);
    try {
      await toggleChecklistItem(marketId, item.id, !item.completed);
    } catch (error) {
      console.error('toggle checklist item failed:', error);
      toast.error('更新 checklist 失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (item: ChecklistItem) => {
    setEditingItem(item);
    setEditingText(item.text);
  };

  const handleUpdate = async () => {
    if (!editingItem || !canManage || isSaving) return;
    setIsSaving(true);
    try {
      await updateChecklistItem(marketId, editingItem.id, { text: editingText });
      setEditingItem(null);
      setEditingText('');
      toast.success('Checklist 已更新');
    } catch (error) {
      console.error('update checklist item failed:', error);
      toast.error('更新 checklist 失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: ChecklistItem) => {
    if (!canManage || isSaving) return;
    setIsSaving(true);
    try {
      await deleteChecklistItem(marketId, item.id);
      toast.success('Checklist 已刪除');
    } catch (error) {
      console.error('delete checklist item failed:', error);
      toast.error('刪除 checklist 失敗');
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManage && items.length === 0) return null;

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm shadow-primary/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          <h2 className="text-base font-medium text-foreground">Checklist</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {remaining} 待處理
        </span>
      </div>

      {canManage && (
        <div className="mb-4 flex gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            placeholder="新增待辦事項"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving || text.trim().length === 0}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="新增 checklist item"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg bg-background px-3 py-4 text-center text-sm text-muted-foreground">
            尚無 checklist
          </p>
        ) : (
          items.map((item) => {
            const isEditing = editingItem?.id === item.id;

            return (
              <article
                key={item.id}
                className="rounded-lg border border-primary/10 p-3"
              >
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      value={editingText}
                      onChange={(event) => setEditingText(event.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleUpdate}
                      disabled={isSaving || editingText.trim().length === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50"
                      aria-label="儲存 checklist item"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-background text-foreground"
                      aria-label="取消編輯 checklist item"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(item)}
                      disabled={!canManage || isSaving}
                      className={`mt-0.5 h-5 w-5 shrink-0 rounded border transition-colors ${
                        item.completed
                          ? 'border-primary bg-primary text-white'
                          : 'border-primary/30 bg-white'
                      }`}
                      aria-label={item.completed ? '標記未完成' : '標記完成'}
                    >
                      {item.completed && <span className="block text-[13px] leading-5">✓</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => canManage && startEditing(item)}
                      disabled={!canManage}
                      className={`min-w-0 flex-1 text-left text-sm leading-relaxed ${
                        item.completed
                          ? 'text-muted-foreground line-through'
                          : 'text-foreground'
                      }`}
                    >
                      {item.text}
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={isSaving}
                        className="rounded-md p-1.5 text-danger hover:bg-soft-pink disabled:opacity-50"
                        aria-label="刪除 checklist item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
