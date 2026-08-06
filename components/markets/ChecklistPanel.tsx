'use client';

import { useState } from 'react';
import { Check, CheckSquare, Plus, Save, Trash2, X } from 'lucide-react';
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
  canToggle: boolean;
}

export function ChecklistPanel({ marketId, canManage, canToggle }: ChecklistPanelProps) {
  const [text, setText] = useState('');
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const items = useLiveQuery(
    () => getActiveChecklistItemsForMarket(marketId),
    [marketId]
  );

  const visibleItems = items ?? [];
  const isLoading = items === undefined;
  const canToggleItems = canManage || canToggle;
  const remaining = visibleItems.filter(item => !item.completed).length;

  const resetEditing = () => {
    setEditingItem(null);
    setEditingText('');
  };

  const handleCreate = async () => {
    const trimmedText = text.trim();
    if (!canManage || isSaving || trimmedText.length === 0) return;

    setIsSaving(true);
    try {
      await createChecklistItem(marketId, trimmedText);
      setText('');
      toast.success('現場待辦已新增');
    } catch (error) {
      console.error('create checklist item failed:', error);
      toast.error('新增現場待辦失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (item: ChecklistItem) => {
    if (!canToggleItems || isSaving) return;

    setIsSaving(true);
    try {
      await toggleChecklistItem(marketId, item.id, !item.completed);
    } catch (error) {
      console.error('toggle checklist item failed:', error);
      toast.error('更新現場待辦失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (item: ChecklistItem) => {
    if (isSaving) return;
    setEditingItem(item);
    setEditingText(item.text);
  };

  const handleUpdate = async () => {
    const trimmedText = editingText.trim();
    if (!editingItem || !canManage || isSaving || trimmedText.length === 0) return;

    setIsSaving(true);
    try {
      await updateChecklistItem(marketId, editingItem.id, { text: trimmedText });
      resetEditing();
      toast.success('現場待辦已更新');
    } catch (error) {
      console.error('update checklist item failed:', error);
      toast.error('更新現場待辦失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: ChecklistItem) => {
    if (!canManage || isSaving) return;

    setIsSaving(true);
    try {
      await deleteChecklistItem(marketId, item.id);
      if (editingItem?.id === item.id) {
        resetEditing();
      }
      toast.success('現場待辦已刪除');
    } catch (error) {
      console.error('delete checklist item failed:', error);
      toast.error('刪除現場待辦失敗');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm shadow-primary/10" aria-busy={isSaving}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          <h2 className="text-base font-medium text-foreground">現場待辦</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {remaining} 待完成
        </span>
      </div>

      {canManage && (
        <div className="mb-4 flex gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={isSaving}
            className="min-w-0 flex-1 rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="新增待辦事項"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving || text.trim().length === 0}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="新增現場待辦"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <p className="rounded-lg bg-background px-3 py-4 text-center text-sm text-muted-foreground">
            載入現場待辦中...
          </p>
        ) : visibleItems.length === 0 ? (
          <p className="rounded-lg bg-background px-3 py-4 text-center text-sm text-muted-foreground">
            尚無現場待辦
          </p>
        ) : (
          visibleItems.map((item) => {
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
                      disabled={isSaving}
                      className="min-w-0 flex-1 rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleUpdate}
                      disabled={isSaving || editingText.trim().length === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="儲存現場待辦"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={resetEditing}
                      disabled={isSaving}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-background text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="取消編輯現場待辦"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(item)}
                      disabled={!canToggleItems || isSaving}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        item.completed
                          ? 'border-primary bg-primary text-white'
                          : 'border-primary/30 bg-white'
                      }`}
                      aria-label={item.completed ? '取消完成現場待辦' : '完成現場待辦'}
                    >
                      {item.completed && <Check className="h-3.5 w-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => canManage && startEditing(item)}
                      disabled={!canManage || isSaving}
                      className={`min-w-0 flex-1 text-left text-sm leading-relaxed disabled:cursor-default ${
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
                        className="rounded-md p-1.5 text-danger hover:bg-soft-pink disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="刪除現場待辦"
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
