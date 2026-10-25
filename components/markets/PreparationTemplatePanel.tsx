'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { generateUUID } from '@/lib/db';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRoleContext } from '@/lib/role-context';
import { preparationTemplateCloud } from '@/lib/supabase/preparation-templates';
import { PreparationTemplateRepository, type TemplateApplication } from '@/lib/markets/preparation-template-repository';
import { checklistTextKey, preparationTemplateError, preparationTemplatesEnabled, templateItemsFromLines, validatePreparationTemplate,
  type PreparationTemplate, type PreparationTemplateDraft } from '@/lib/markets/preparation-template';
import type { ChecklistItem } from '@/lib/markets/checklist';

const buttonClass = 'min-h-11 rounded-lg border border-primary/20 px-3 py-2 text-sm text-primary disabled:opacity-50';

export function PreparationTemplatePanel({marketId,items,disabled}: {marketId:string;items:ChecklistItem[];disabled:boolean}) {
  const {user} = useAuth();
  const {userRole,roleRefreshState} = useRoleContext();
  if (!preparationTemplatesEnabled() || !user || !roleRefreshState.shouldMountProtectedChildren
    || (userRole.isStaff && userRole.staffRole !== 'manager')) return null;
  const ownerId = userRole.isStaff ? userRole.ownerId : user.id;
  if (!ownerId) return null;
  // Keep in-progress text during a foreground role refresh; pause actions until it is fresh.
  return <TemplateWorkspace key={`${user.id}:${ownerId}:${marketId}`} actorId={user.id} ownerId={ownerId} marketId={marketId} items={items} disabled={disabled || !roleRefreshState.isAuthorizationFresh} />;
}

function TemplateWorkspace({actorId,ownerId,marketId,items,disabled}: {actorId:string;ownerId:string;marketId:string;items:ChecklistItem[];disabled:boolean}) {
  const repository = useMemo(() => new PreparationTemplateRepository(actorId,ownerId,preparationTemplateCloud),[actorId,ownerId]);
  const [open,setOpen] = useState(false);
  const [templates,setTemplates] = useState<PreparationTemplate[]>([]);
  const [loaded,setLoaded] = useState(false);
  const [selectedId,setSelectedId] = useState('');
  const [selectedItems,setSelectedItems] = useState<string[]>([]);
  const [editor,setEditor] = useState<{template?:PreparationTemplate;id:string;name:string;lines:string} | null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const alive = useRef(true);
  const inFlight = useRef(false);
  const saveAttempt = useRef<{key:string;draft:PreparationTemplateDraft} | null>(null);
  const applyAttempt = useRef<{key:string;application:TemplateApplication} | null>(null);
  const inputId = useId();
  useEffect(() => { alive.current=true; return () => {alive.current=false;}; },[]);
  const selected = templates.find(t => t.id===selectedId);
  const existing = new Set(items.map(item => checklistTextKey(item.text)));
  const selectedCount = selected?.items.filter(item => selectedItems.includes(item.id) && !existing.has(checklistTextKey(item.text))).length ?? 0;

  async function run(work:()=>Promise<void>) {
    if (inFlight.current || disabled) return;
    inFlight.current=true; setBusy(true); setError(''); setNotice('');
    try { await work(); }
    catch (caught) { if(alive.current) setError(preparationTemplateError(caught)); }
    finally { inFlight.current=false; if(alive.current) setBusy(false); }
  }
  async function load() {
    await run(async () => {
      const rows = await repository.list();
      if(alive.current) {
        setTemplates(rows);
        setLoaded(true);
        // A refreshed revision always needs a fresh selection/confirmation.
        setSelectedId(''); setSelectedItems([]); applyAttempt.current=null;
      }
    });
  }
  function choose(id:string) {
    setSelectedId(id); applyAttempt.current=null; setError(''); setNotice('');
    setSelectedItems(templates.find(t => t.id===id)?.items.filter(i => !existing.has(checklistTextKey(i.text))).map(i => i.id) ?? []);
  }
  async function save(archived?:boolean, row?:PreparationTemplate) {
    await run(async () => {
      const source = row ?? editor?.template;
      const id = row?.id ?? editor?.id;
      if (!id || (!row && !editor)) return;
      const name = row?.name ?? editor!.name;
      const lines = row ? row.items.map(i => i.text).join('\n') : editor!.lines;
      const isArchived = archived ?? source?.archived ?? false;
      const key = JSON.stringify([id,name,lines,source?.revision ?? 0,isArchived]);
      if (saveAttempt.current?.key !== key) {
        const valid = validatePreparationTemplate(name,templateItemsFromLines(lines,source?.items ?? [],generateUUID));
        saveAttempt.current = {key,draft:{id,ownerId,...valid,baseRevision:source?.revision ?? 0,mutationId:generateUUID(),archived:isArchived}};
      }
      const saved = await repository.save(saveAttempt.current!.draft);
      if(alive.current) {
        setTemplates(current => [...current.filter(t => t.id!==saved.id),saved]);
        setEditor(null); setSelectedId(''); setSelectedItems([]);
        setNotice(saved.archived ? '模板已封存，過去場次的待辦不受影響。' : '模板已保存到雲端，可在其他裝置使用。');
      }
    });
  }
  async function apply() {
    if (!selected) return;
    await run(async () => {
      // Keep the identical request after an uncertain response, even if a partial local refresh arrives.
      if (!applyAttempt.current) {
        const itemIds = selected.items.filter(item => selectedItems.includes(item.id) && !existing.has(checklistTextKey(item.text))).map(item => item.id);
        if (!itemIds.length) return;
        const application = {id:generateUUID(),marketId,templateId:selected.id,revision:selected.revision,itemIds};
        applyAttempt.current = {key:JSON.stringify(application),application};
      }
      const result = await repository.apply(applyAttempt.current.application);
      if(alive.current) {
        setNotice(`已新增 ${result.appliedCount} 項待辦${result.skippedCount ? `，略過 ${result.skippedCount} 項重複內容` : ''}。原有勾選狀態已保留。`);
        setSelectedItems([]); applyAttempt.current=null;
      }
    });
  }

  if (!open) return <button type="button" className={`${buttonClass} mb-3 w-full`} disabled={disabled} onClick={() => {setOpen(true); void load();}}>從準備模板加入</button>;
  return <div className="mb-4 space-y-3 rounded-xl border border-primary/15 bg-background p-3" aria-label="準備模板" aria-busy={busy}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-medium">準備模板</h3>
      {!editor && <button type="button" className={buttonClass} disabled={busy} onClick={() => setOpen(false)}>收起</button>}
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground">品牌共用模板；連線後可管理與套用。新增的待辦屬於這場市集，之後修改模板不影響這裡。</p>
    {error && <p role="alert" className="break-words text-sm text-danger">{error}</p>}
    {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    {editor ? <div className="space-y-3">
      <label className="block text-sm" htmlFor={`${inputId}-name`}>模板名稱</label>
      <input id={`${inputId}-name`} value={editor.name} disabled={busy || disabled} onChange={e => setEditor({...editor,name:e.target.value})}
        className="min-h-11 w-full rounded-lg border border-primary/20 bg-white px-3 text-sm" placeholder="例如：戶外市集基本裝備" />
      <label className="block text-sm" htmlFor={`${inputId}-items`}>準備項目（每行一項，最多 50 項）</label>
      <textarea id={`${inputId}-items`} rows={6} value={editor.lines} disabled={busy || disabled} onChange={e => setEditor({...editor,lines:e.target.value})}
        className="w-full rounded-lg border border-primary/20 bg-white p-3 text-sm" placeholder={'桌布與招牌\n行動電源\n雨具'} />
      <p className="text-xs text-muted-foreground">尚未儲存的編輯只保留在目前畫面，請先儲存再離開。</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={busy || disabled} onClick={() => void save()}>儲存模板</button>
        <button type="button" className={buttonClass} disabled={busy} onClick={() => {setEditor(null);setError('');}}>放棄此次編輯</button>
        <button type="button" className={buttonClass} disabled={busy || disabled} onClick={() => void load()}>重新載入雲端</button>
      </div>
    </div> : <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={busy || disabled} onClick={() => {setEditor({id:generateUUID(),name:'',lines:''});setError('');setNotice('');}}>建立模板</button>
        <button type="button" className={buttonClass} disabled={busy || disabled} onClick={() => void load()}>重新載入</button>
      </div>
      <label className="block text-sm" htmlFor={`${inputId}-select`}>選擇模板</label>
      <select id={`${inputId}-select`} value={selectedId} disabled={busy || disabled} onChange={e => choose(e.target.value)} className="min-h-11 w-full rounded-lg border border-primary/20 bg-white px-2 text-sm">
        <option value="">{busy ? '載入中…' : '請選擇準備模板'}</option>
        {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.archived ? '（已封存）' : ''}</option>)}
      </select>
      {loaded && !busy && templates.length===0 && <p className="text-sm text-muted-foreground">尚無模板，可以先建立常用的準備清單。</p>}
      {selected && <>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} disabled={busy || disabled} onClick={() => {setEditor({template:selected,id:selected.id,name:selected.name,lines:selected.items.map(i => i.text).join('\n')});setError('');}}>編輯模板</button>
          <button type="button" className={buttonClass} disabled={busy || disabled} onClick={() => void save(!selected.archived,selected)}>{selected.archived ? '恢復模板' : '封存模板'}</button>
        </div>
        {!selected.archived && <>
          <p className="text-xs text-muted-foreground">勾選這場需要的項目。相同文字的待辦會略過，包括已完成項目。</p>
          <div className="space-y-1">
            {selected.items.map(item => {
              const duplicate = existing.has(checklistTextKey(item.text));
              return <label key={item.id} className="flex min-h-11 items-start gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={!duplicate && selectedItems.includes(item.id)} disabled={busy || disabled || duplicate}
                  onChange={e => {applyAttempt.current=null;setSelectedItems(current => e.target.checked ? [...current,item.id] : current.filter(id => id!==item.id));}} />
                <span className="min-w-0 break-words">{item.text}{duplicate && <span className="block text-xs text-muted-foreground">場次已有此項目，將略過</span>}</span>
              </label>;
            })}
          </div>
          <button type="button" className={`${buttonClass} w-full bg-primary text-white`} disabled={busy || disabled || (selectedCount===0 && !applyAttempt.current)} onClick={() => void apply()}>
            {busy ? '處理中…' : applyAttempt.current ? '重試確認套用結果' : `確認加入 ${selectedCount} 項待辦`}
          </button>
        </>}
      </>}
    </>}
  </div>;
}
