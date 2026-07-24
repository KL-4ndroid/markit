'use client';

import { useState } from 'react';
import { Edit3, FileText, Save, Trash2, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import {
  createFieldNote,
  deleteFieldNote,
  getActiveFieldNotesForMarket,
  updateFieldNote,
  type FieldNote,
} from '@/lib/markets/field-notes';

interface FieldNotesPanelProps {
  marketId: string;
  canManage: boolean;
}

export function FieldNotesPanel({
  marketId,
  canManage,
}: FieldNotesPanelProps) {
  const [text, setText] = useState('');
  const [editingNote, setEditingNote] = useState<FieldNote | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const notes = useLiveQuery(
    () => getActiveFieldNotesForMarket(marketId),
    [marketId]
  );

  const visibleNotes = notes ?? [];
  const isLoading = notes === undefined;

  const resetEditing = () => {
    setEditingNote(null);
    setEditingText('');
  };

  const handleCreate = async () => {
    const trimmedText = text.trim();
    if (!canManage || isSaving || trimmedText.length === 0) return;

    setIsSaving(true);
    try {
      await createFieldNote(marketId, trimmedText);
      setText('');
      toast.success('交接筆記已新增');
    } catch (error) {
      console.error('create field note failed:', error);
      toast.error('新增交接筆記失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (note: FieldNote) => {
    if (isSaving) return;
    setEditingNote(note);
    setEditingText(note.text);
  };

  const handleUpdate = async () => {
    const trimmedText = editingText.trim();
    if (!editingNote || !canManage || isSaving || trimmedText.length === 0) return;

    setIsSaving(true);
    try {
      await updateFieldNote(marketId, editingNote.id, trimmedText);
      resetEditing();
      toast.success('交接筆記已更新');
    } catch (error) {
      console.error('update field note failed:', error);
      toast.error('更新交接筆記失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (note: FieldNote) => {
    if (!canManage || isSaving) return;

    setIsSaving(true);
    try {
      await deleteFieldNote(marketId, note.id);
      if (editingNote?.id === note.id) {
        resetEditing();
      }
      toast.success('交接筆記已刪除');
    } catch (error) {
      console.error('delete field note failed:', error);
      toast.error('刪除交接筆記失敗');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm shadow-primary/10" aria-busy={isSaving}>
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-medium text-foreground">現場交接筆記</h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              動態紀錄
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            依時間記錄現場變動與班次交接，不會修改主辦／場地備註。
          </p>
        </div>
      </div>

      {canManage && (
        <div className="mb-4 space-y-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            disabled={isSaving}
            className="w-full resize-none rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="例如：入口改到東側；下午班請補紙袋並確認剩餘庫存。"
            aria-label="新增現場交接筆記"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving || text.trim().length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            新增交接筆記
          </button>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <p className="rounded-lg bg-background px-3 py-4 text-center text-sm text-muted-foreground">
            載入交接筆記中...
          </p>
        ) : visibleNotes.length === 0 ? (
          <p className="rounded-lg bg-background px-3 py-4 text-center text-sm text-muted-foreground">
            尚無現場交接筆記
          </p>
        ) : (
          visibleNotes.map((note) => {
            const isEditing = editingNote?.id === note.id;
            const activityLabel = note.updatedAt === note.createdAt ? '新增' : '更新';

            return (
              <article key={note.id} className="rounded-lg border border-primary/10 p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingText}
                      onChange={(event) => setEditingText(event.target.value)}
                      rows={3}
                      disabled={isSaving}
                      aria-label="編輯現場交接筆記內容"
                      className="w-full resize-none rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUpdate}
                        disabled={isSaving || editingText.trim().length === 0}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        儲存
                      </button>
                      <button
                        type="button"
                        onClick={resetEditing}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1 rounded-lg bg-background px-3 py-2 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {note.text}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {activityLabel}{' '}
                        {new Date(note.updatedAt).toLocaleString('zh-TW', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {canManage && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEditing(note)}
                            disabled={isSaving}
                            className="rounded-md p-1.5 text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="編輯現場交接筆記"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(note)}
                            disabled={isSaving}
                            className="rounded-md p-1.5 text-danger hover:bg-soft-pink disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="刪除現場交接筆記"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
