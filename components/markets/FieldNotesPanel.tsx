'use client';

import { useState } from 'react';
import { Edit3, FileText, Save, Trash2, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  createFieldNote,
  deleteFieldNote,
  getActiveFieldNotesForMarket,
  updateFieldNote,
  type FieldNote,
} from '@/lib/markets/field-notes';

interface FieldNotesPanelProps {
  marketId: string;
  canCreate: boolean;
  canEditOwn: boolean;
  canDeleteOwn: boolean;
}

export function FieldNotesPanel({
  marketId,
  canCreate,
  canEditOwn,
  canDeleteOwn,
}: FieldNotesPanelProps) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [editingNote, setEditingNote] = useState<FieldNote | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const notes = useLiveQuery(
    () => getActiveFieldNotesForMarket(marketId),
    [marketId],
    []
  );

  const handleCreate = async () => {
    if (!canCreate || isSaving) return;
    setIsSaving(true);
    try {
      await createFieldNote(marketId, text);
      setText('');
      toast.success('Field note 已建立');
    } catch (error) {
      console.error('create field note failed:', error);
      toast.error('建立 field note 失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (note: FieldNote) => {
    setEditingNote(note);
    setEditingText(note.text);
  };

  const handleUpdate = async () => {
    if (!editingNote || !canEditOwn || isSaving) return;
    setIsSaving(true);
    try {
      await updateFieldNote(marketId, editingNote.id, editingText, { userId: user?.id });
      setEditingNote(null);
      setEditingText('');
      toast.success('Field note 已更新');
    } catch (error) {
      console.error('update field note failed:', error);
      toast.error('更新 field note 失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (note: FieldNote) => {
    if (!canDeleteOwn || isSaving) return;
    setIsSaving(true);
    try {
      await deleteFieldNote(marketId, note.id, { userId: user?.id });
      toast.success('Field note 已刪除');
    } catch (error) {
      console.error('delete field note failed:', error);
      toast.error('刪除 field note 失敗');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm shadow-primary/10">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-base font-medium text-foreground">Field notes</h2>
      </div>

      {canCreate && (
        <div className="mb-4 space-y-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            placeholder="記錄現場狀況、待辦提醒或交接事項"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving || text.trim().length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            新增 note
          </button>
        </div>
      )}

      <div className="space-y-2">
        {notes.length === 0 ? (
          <p className="rounded-lg bg-background px-3 py-4 text-center text-sm text-muted-foreground">
            尚無 field note
          </p>
        ) : (
          notes.map((note) => {
            const isOwn = user?.id === note.actorId;
            const canEditThis = isOwn && canEditOwn;
            const canDeleteThis = isOwn && canDeleteOwn;
            const isEditing = editingNote?.id === note.id;

            return (
              <article key={note.id} className="rounded-lg border border-primary/10 p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingText}
                      onChange={(event) => setEditingText(event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUpdate}
                        disabled={isSaving || editingText.trim().length === 0}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        儲存
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNote(null)}
                        className="inline-flex items-center gap-1 rounded-lg bg-background px-3 py-2 text-xs font-medium text-foreground"
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
                        {new Date(note.updatedAt).toLocaleString('zh-TW', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <div className="flex gap-1">
                        {canEditThis && (
                          <button
                            type="button"
                            onClick={() => startEditing(note)}
                            className="rounded-md p-1.5 text-primary hover:bg-primary/10"
                            aria-label="編輯 field note"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                        {canDeleteThis && (
                          <button
                            type="button"
                            onClick={() => handleDelete(note)}
                            className="rounded-md p-1.5 text-danger hover:bg-soft-pink"
                            aria-label="刪除 field note"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
