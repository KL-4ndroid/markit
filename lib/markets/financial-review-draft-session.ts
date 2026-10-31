import { generateUUID } from '@/lib/db/uuid';
import { financialReviewError, reviewAmount } from './financial-reviews';
import { financialDraftId, financialDraftSourceChanged, type FinancialReviewDraft, type FinancialReviewEditor } from './financial-review-drafts';
import type { FinancialReviewRepository } from './financial-review-repository';

type State = {
  draft: FinancialReviewDraft | null;
  busy: boolean;
  error: string;
  status: string;
  conflict: boolean;
  pending: number;
  localError: boolean;
  latestAmount: string | null;
};

/** A device-independent editor. All writes are explicit, serialized and scoped. */
export class FinancialReviewDraftSession {
  private state: State = { draft: null, busy: false, error: '', status: '', conflict: false, pending: 0, localError: false, latestAmount: null };
  private listeners = new Set<() => void>();
  private queue: Promise<void> = Promise.resolve();
  private persisted: FinancialReviewDraft | null = null;
  private latest: FinancialReviewEditor | null = null;
  constructor(readonly repository: FinancialReviewRepository, readonly marketId: string) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private patch(change: Partial<State>) { this.state = { ...this.state, ...change }; this.listeners.forEach(listener => listener()); }
  private run(work: () => Promise<void>) {
    this.patch({ busy: true });
    const task = this.queue.then(work).catch(error => { this.patch({ error: financialReviewError(error), status: '' }); });
    this.queue = task;
    return task.finally(() => { if (this.queue === task) this.patch({ busy: false }); });
  }
  private async persist(draft: FinancialReviewDraft) {
    let next: FinancialReviewDraft;
    try { next = await this.repository.stageDraft({ ...draft, localRevision: this.persisted?.localRevision ?? draft.localRevision }); }
    catch (error) { this.patch({ localError: true }); throw error; }
    this.persisted = next;
    this.patch({ draft: next, localError: false });
  }
  open(key: string, mode: FinancialReviewEditor['base']['mode']) {
    return this.run(async () => {
      this.patch({ error: '', status: '', conflict: false, localError: false, latestAmount: null });
      if ((await this.repository.listDrafts(this.marketId)).some(draft => draft.key === key)) throw new Error('FINANCE_DRAFT_EXISTS');
      const { editor } = await this.repository.prepareEditor(this.marketId, key, mode);
      this.persisted = null; this.latest = null;
      await this.persist({ id: financialDraftId(this.repository.ownerId, this.marketId, key), ownerId: this.repository.ownerId,
        marketId: this.marketId, key, localRevision: 0, generation: generateUUID(), editor, attempt: null, updatedAt: Date.now() });
    });
  }
  changeAmount(amount: string) {
    if (!this.state.draft || this.state.busy || this.state.draft.attempt) return Promise.resolve();
    const draft = { ...this.state.draft, editor: { ...this.state.draft.editor, amount } };
    this.patch({ draft, error: '', pending: this.state.pending + 1 });
    const task = this.queue.then(async () => {
      const next = await this.repository.stageDraft({ ...draft, localRevision: this.persisted?.localRevision ?? draft.localRevision });
      this.persisted = next;
      // A slower local write must never paint an older keystroke over new input.
      this.patch({ draft: this.state.draft ? { ...this.state.draft, localRevision: next.localRevision } : null, localError: false });
    }).catch(error => { this.patch({ localError: true, error: financialReviewError(error), status: '' }); });
    this.queue = task;
    return task.finally(() => { this.patch({ pending: this.state.pending - 1 }); });
  }
  restore(draft: FinancialReviewDraft) {
    return this.run(async () => {
      if (draft.ownerId !== this.repository.ownerId || draft.marketId !== this.marketId) throw new Error('FINANCE_SCOPE');
      const current = (await this.repository.listDrafts(this.marketId)).find(row => row.id === draft.id);
      if (!current || current.localRevision !== draft.localRevision || current.generation !== draft.generation) throw new Error('FINANCE_DRAFT_CONFLICT');
      this.persisted = current;
      this.patch({ draft: current, error: '', status: '', conflict: false, localError: false });
      await this.checkLatest();
    });
  }
  recheck() { return this.run(async () => { this.patch({ error: '' }); await this.checkLatest(); }); }
  retryLocal() { return this.run(async () => { if (this.state.draft) { await this.persist(this.state.draft); this.patch({ error: '' }); } }); }
  private async checkLatest() {
    const draft = this.state.draft;
    if (!draft) return;
    const { editor, snapshot } = await this.repository.prepareEditor(this.marketId, draft.key, draft.editor.base.mode);
    const row = snapshot.reviews.find(item => item.review_key === draft.key);
    if (draft.attempt && row?.mutation_id === draft.attempt.mutationId && (row.valid || row.mode === 'cleared')) {
      await this.repository.discardDraft(this.persisted!); this.persisted = null;
      this.patch({ draft: null, conflict: false, error: '', status: '已確認先前的核對已保存，沒有重複送出。' }); return;
    }
    this.latest = editor;
    if (financialDraftSourceChanged(draft, editor)) {
      this.patch({ conflict: true, status: '', latestAmount: editor.base.mode === 'cost' ? editor.amount : null,
        error: '雲端來源或核對已被更新。草稿仍保留，請先比較最新紀錄。' }); return;
    }
    // No receipt on the current row and no source/revision change: the exact
    // prior mutation may be retried by the user, never automatically.
    this.patch({ conflict: false, status: '已重新核對雲端來源；請確認內容後再手動保存。' });
  }
  acceptLatest() {
    return this.run(async () => {
      if (!this.state.draft || !this.latest || !this.state.conflict) return;
      await this.persist({ ...this.state.draft, editor: { ...this.latest, amount: this.state.draft.editor.amount }, attempt: null });
      this.patch({ conflict: false, error: '', status: '已採用最新來源，保留你的輸入；請重新確認金額後保存。' });
    });
  }
  save() {
    return this.run(async () => {
      const draft = this.state.draft;
      if (!draft || this.state.conflict || this.state.error || this.state.localError) return;
      const request = draft.attempt ?? { ...draft.editor.base, amount: draft.editor.base.mode === 'cost' ? reviewAmount(draft.editor.amount) : null, mutationId: generateUUID() };
      // Persist delivery identity BEFORE issuing the only cloud mutation.
      await this.persist({ ...draft, attempt: request });
      await this.repository.save(request);
      await this.repository.discardDraft(this.persisted!); this.persisted = null;
      this.patch({ draft: null, error: '', status: '已保存核對紀錄，收入、成交數與商品庫存維持原值。' });
    });
  }
  close() {
    if (this.state.busy || this.state.pending) return;
    if (this.state.localError) { this.patch({ error: '本次輸入尚未保存到這台裝置，請先重試保存草稿。' }); return; }
    this.patch({ draft: null, conflict: false, error: '', status: this.state.draft?.attempt
      ? '草稿已留在這台裝置，下次繼續時會確認雲端保存結果。' : '草稿已留在這台裝置，尚未送出雲端。' });
  }
  discard(draft: FinancialReviewDraft) {
    return this.run(async () => {
      if (draft.ownerId !== this.repository.ownerId || draft.marketId !== this.marketId) throw new Error('FINANCE_SCOPE');
      await this.repository.discardDraft(draft);
      this.persisted = null;
      this.patch({ draft: null, conflict: false, error: '', status: '已捨棄本機草稿，雲端紀錄維持原值。' });
    });
  }
}
