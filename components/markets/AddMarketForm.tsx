'use client';

import { Clock, DollarSign, FileText, Package } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  MarketBasicFields,
  MarketCostFields,
  MarketEquipmentFields,
  MarketNotesField,
  MarketTimelineFields,
  type MarketEquipmentField,
  type MarketEquipmentFreeField,
  type MarketTimelineField,
} from '@/components/markets/MarketFormFields';
import { AppDialog } from '@/components/ui/AppDialog';
import { Button } from '@/components/ui/Button';
import { FormSectionDisclosure } from '@/components/ui/FormSectionDisclosure';
import { FullScreenForm } from '@/components/ui/FullScreenForm';
import { createMarket } from '@/lib/db/hooks';
import { clearFormData, loadFormData, saveFormData } from '@/lib/form-autosave';
import {
  calculateMarketDurationLabel,
  calculateMarketFixedCost,
  deriveMarketDateBounds,
  getFirstMarketCoreError,
  validateMarketCoreForm,
  type MarketCoreFormErrors,
} from '@/lib/markets/market-form';
import { loadDefaultSalesPhotoEvidenceRequired } from '@/lib/sales/photo-evidence-settings';
import { useAuth } from '@/lib/supabase/auth-context';
import type { MarketCreatedPayload } from '@/types/db';

interface AddMarketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_NO_EARLY_ENTRY = true;
const DEFAULT_TABLE_FREE = false;
const DEFAULT_CHAIR_FREE = false;
const DEFAULT_UMBRELLA_FREE = false;
const FORM_ID = 'add-market-form';
const FIELD_PREFIX = 'add-market';

function createDefaultMarketFormData(): MarketCreatedPayload {
  return {
    name: '',
    location: '',
    dates: [],
    startDate: '',
    endDate: '',
    earlyEntryEnabled: false,
    earlyEntryTime: '11:00',
    checkInTime: '12:00',
    operatingStartTime: '13:00',
    operatingEndTime: '19:00',
    registrationFee: 0,
    boothCost: 0,
    deposit: 0,
    tableRental: 0,
    chairRental: 0,
    umbrellaRental: 0,
    commissionRate: 0,
    tableFree: false,
    chairFree: false,
    umbrellaFree: false,
    salesPhotoEvidenceRequired: false,
    notes: '',
  };
}

interface AddMarketDraft {
  formData: MarketCreatedPayload;
  noEarlyEntry: boolean;
  tableFree: boolean;
  chairFree: boolean;
  umbrellaFree: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAddMarketDraft(value: unknown): value is AddMarketDraft {
  if (!isRecord(value) || !isRecord(value.formData)) return false;
  return typeof value.noEarlyEntry === 'boolean'
    && typeof value.tableFree === 'boolean'
    && typeof value.chairFree === 'boolean'
    && typeof value.umbrellaFree === 'boolean';
}

function hasMeaningfulMarketDraft(draft: AddMarketDraft): boolean {
  const defaults = createDefaultMarketFormData();
  const data = draft.formData;
  const hasText = [data.name, data.location, data.notes]
    .some(value => String(value || '').trim() !== '');
  const hasDates = Array.isArray(data.dates) && data.dates.length > 0;
  const hasCosts = [
    data.registrationFee,
    data.boothCost,
    data.deposit,
    data.tableRental,
    data.chairRental,
    data.umbrellaRental,
    data.commissionRate,
  ].some(value => Number(value || 0) > 0);
  const hasTimeChanges = data.earlyEntryTime !== defaults.earlyEntryTime
    || data.checkInTime !== defaults.checkInTime
    || data.operatingStartTime !== defaults.operatingStartTime
    || data.operatingEndTime !== defaults.operatingEndTime;
  const hasBooleanChanges = draft.noEarlyEntry !== DEFAULT_NO_EARLY_ENTRY
    || draft.tableFree !== DEFAULT_TABLE_FREE
    || draft.chairFree !== DEFAULT_CHAIR_FREE
    || draft.umbrellaFree !== DEFAULT_UMBRELLA_FREE;

  return hasText || hasDates || hasCosts || hasTimeChanges || hasBooleanChanges;
}

function addMinutes(value: string, minutesToAdd: number): string {
  const [hours, minutes] = value.split(':').map(Number);
  const next = new Date(2000, 0, 1, hours, minutes + minutesToAdd);
  return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
}

export function AddMarketForm({ isOpen, onClose, onSuccess }: AddMarketFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noEarlyEntry, setNoEarlyEntry] = useState(DEFAULT_NO_EARLY_ENTRY);
  const [tableFree, setTableFree] = useState(DEFAULT_TABLE_FREE);
  const [chairFree, setChairFree] = useState(DEFAULT_CHAIR_FREE);
  const [umbrellaFree, setUmbrellaFree] = useState(DEFAULT_UMBRELLA_FREE);
  const [formData, setFormData] = useState<MarketCreatedPayload>(createDefaultMarketFormData);
  const [errors, setErrors] = useState<MarketCoreFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [showDraftCloseConfirm, setShowDraftCloseConfirm] = useState(false);

  const draftId = useMemo(() => (user?.id ? `add-market:${user.id}` : null), [user?.id]);
  const currentDraft = useMemo<AddMarketDraft>(() => ({
    formData,
    noEarlyEntry,
    tableFree,
    chairFree,
    umbrellaFree,
  }), [chairFree, formData, noEarlyEntry, tableFree, umbrellaFree]);
  const hasDirtyDraft = draftReady && hasMeaningfulMarketDraft(currentDraft);

  useEffect(() => {
    if (!isOpen || !draftId) {
      setDraftReady(false);
      return;
    }

    setDraftReady(false);
    const savedDraft = loadFormData(draftId);
    if (isAddMarketDraft(savedDraft?.data)) {
      setFormData({ ...createDefaultMarketFormData(), ...savedDraft.data.formData });
      setNoEarlyEntry(savedDraft.data.noEarlyEntry);
      setTableFree(savedDraft.data.tableFree);
      setChairFree(savedDraft.data.chairFree);
      setUmbrellaFree(savedDraft.data.umbrellaFree);
    }
    setErrors({});
    setSubmitError(null);
    setDraftReady(true);
  }, [draftId, isOpen]);

  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !user?.id || !draftReady || hasMeaningfulMarketDraft(currentDraft)) return;

    loadDefaultSalesPhotoEvidenceRequired(user.id)
      .then(required => {
        if (cancelled) return;
        setFormData(prev => {
          if (prev.salesPhotoEvidenceRequired === required) return prev;
          return { ...prev, salesPhotoEvidenceRequired: required };
        });
      })
      .catch(error => console.error('load default sales photo evidence setting failed:', error));

    return () => {
      cancelled = true;
    };
  }, [currentDraft, draftReady, isOpen, user?.id]);

  useEffect(() => {
    if (!isOpen || !draftId || !draftReady) return;
    if (!hasMeaningfulMarketDraft(currentDraft)) return;

    const timeout = window.setTimeout(() => {
      saveFormData(draftId, currentDraft);
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [currentDraft, draftId, draftReady, isOpen]);

  useEffect(() => {
    if (!isOpen || !hasDirtyDraft) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasDirtyDraft, isOpen]);

  const resetFormState = () => {
    setFormData(createDefaultMarketFormData());
    setNoEarlyEntry(DEFAULT_NO_EARLY_ENTRY);
    setTableFree(DEFAULT_TABLE_FREE);
    setChairFree(DEFAULT_CHAIR_FREE);
    setUmbrellaFree(DEFAULT_UMBRELLA_FREE);
    setErrors({});
    setSubmitError(null);
  };

  const handleRequestClose = () => {
    if (isSubmitting) return;
    if (hasDirtyDraft) {
      setShowDraftCloseConfirm(true);
      return;
    }
    onClose();
  };

  const handleKeepDraftAndClose = () => {
    if (draftId && hasMeaningfulMarketDraft(currentDraft)) {
      saveFormData(draftId, currentDraft);
    }
    setShowDraftCloseConfirm(false);
    onClose();
  };

  const handleDiscardDraftAndClose = () => {
    if (draftId) clearFormData(draftId);
    resetFormState();
    setShowDraftCloseConfirm(false);
    onClose();
  };

  const handleChange = (
    field: keyof MarketCreatedPayload,
    value: string | number | boolean | string[],
  ) => {
    setFormData(previous => {
      const updated = { ...previous, [field]: value };
      if (field === 'dates' && Array.isArray(value)) {
        Object.assign(updated, deriveMarketDateBounds(value));
      }
      if (field === 'checkInTime' && typeof value === 'string') {
        updated.operatingStartTime = addMinutes(value, 60);
        updated.operatingEndTime = addMinutes(value, 420);
      }
      return updated;
    });
    if (field === 'name' || field === 'location' || field === 'dates') {
      setErrors(previous => {
        const next = { ...previous };
        delete next[field];
        return next;
      });
    }
    setSubmitError(null);
  };

  const handleEquipmentFreeChange = (field: MarketEquipmentFreeField, value: boolean) => {
    const rentalField: Record<MarketEquipmentFreeField, MarketEquipmentField> = {
      tableFree: 'tableRental',
      chairFree: 'chairRental',
      umbrellaFree: 'umbrellaRental',
    };
    if (field === 'tableFree') setTableFree(value);
    if (field === 'chairFree') setChairFree(value);
    if (field === 'umbrellaFree') setUmbrellaFree(value);
    if (value) handleChange(rentalField[field], 0);
  };

  const focusFirstError = (nextErrors: MarketCoreFormErrors) => {
    const firstError = getFirstMarketCoreError(nextErrors);
    if (!firstError) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`${FIELD_PREFIX}-${firstError}`)?.focus();
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateMarketCoreForm(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        location: formData.location.trim(),
        earlyEntryEnabled: !noEarlyEntry,
        tableFree,
        chairFree,
        umbrellaFree,
        tableRental: tableFree ? 0 : formData.tableRental,
        chairRental: chairFree ? 0 : formData.chairRental,
        umbrellaRental: umbrellaFree ? 0 : formData.umbrellaRental,
      };
      await createMarket(payload);
      if (draftId) clearFormData(draftId);
      resetFormState();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('建立市集失敗：', error);
      setSubmitError('市集尚未建立，請確認連線後再試一次。草稿已保留在此裝置。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const operatingStartTime = formData.operatingStartTime || '13:00';
  const operatingEndTime = formData.operatingEndTime || '19:00';
  const totalStartTime = noEarlyEntry
    ? (formData.checkInTime || '12:00')
    : (formData.earlyEntryTime || '11:00');
  const fixedCostTotal = calculateMarketFixedCost({
    boothCost: formData.boothCost,
    tableRental: formData.tableRental,
    chairRental: formData.chairRental,
    umbrellaRental: formData.umbrellaRental,
    tableFree,
    chairFree,
    umbrellaFree,
  });

  return (
    <>
      <FullScreenForm
        open={isOpen}
        onClose={handleRequestClose}
        eyebrow="市集管理"
        title="新增市集"
        description="先完成基本資料；其他設定可依主辦資訊逐項補充。"
        dismissible={!isSubmitting}
        footer={(
          <>
            <Button variant="secondary" onClick={handleRequestClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" form={FORM_ID} isLoading={isSubmitting}>
              建立市集
            </Button>
          </>
        )}
      >
        <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
          <div className="japanese-surface-card p-5 sm:p-6">
            <MarketBasicFields
              idPrefix={FIELD_PREFIX}
              name={formData.name}
              location={formData.location}
              dates={formData.dates || []}
              errors={errors}
              disabled={isSubmitting}
              onNameChange={value => handleChange('name', value)}
              onLocationChange={value => handleChange('location', value)}
              onDatesChange={value => handleChange('dates', value)}
            />
          </div>

          <div className="mt-6">
            <div className="mb-3 px-1">
              <p className="text-sm font-semibold text-foreground">細節設定</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">需要時再展開，建立後也能回來補充。</p>
            </div>

            <div className="space-y-3">

            <FormSectionDisclosure
              title="成本與抽成"
              description="攤位費、保證金與營業額抽成"
              icon={DollarSign}
              tone="yellow"
            >
              <MarketCostFields
                idPrefix={FIELD_PREFIX}
                boothCost={Number(formData.boothCost || 0)}
                deposit={Number(formData.deposit || 0)}
                commissionRate={Number(formData.commissionRate || 0)}
                fixedCostTotal={fixedCostTotal}
                disabled={isSubmitting}
                onChange={(field, value) => handleChange(field, value)}
              />
            </FormSectionDisclosure>

            <FormSectionDisclosure
              title="設備"
              description="桌椅與傘具租金或免費提供狀態"
              icon={Package}
              tone="green"
            >
              <MarketEquipmentFields
                idPrefix={FIELD_PREFIX}
                rentals={{
                  tableRental: Number(formData.tableRental || 0),
                  chairRental: Number(formData.chairRental || 0),
                  umbrellaRental: Number(formData.umbrellaRental || 0),
                }}
                free={{ tableFree, chairFree, umbrellaFree }}
                disabled={isSubmitting}
                onRentalChange={(field, value) => handleChange(field, value)}
                onFreeChange={handleEquipmentFreeChange}
              />
            </FormSectionDisclosure>

            <FormSectionDisclosure
              title="時間軸"
              description="進場、報到與營業起訖時間"
              icon={Clock}
              tone="blue"
            >
              <MarketTimelineFields
                idPrefix={FIELD_PREFIX}
                noEarlyEntry={noEarlyEntry}
                earlyEntryTime={formData.earlyEntryTime || '11:00'}
                checkInTime={formData.checkInTime || '12:00'}
                operatingStartTime={operatingStartTime}
                operatingEndTime={operatingEndTime}
                operatingDuration={calculateMarketDurationLabel(operatingStartTime, operatingEndTime)}
                totalDuration={calculateMarketDurationLabel(totalStartTime, operatingEndTime)}
                disabled={isSubmitting}
                onNoEarlyEntryChange={setNoEarlyEntry}
                onChange={(field: MarketTimelineField, value) => handleChange(field, value)}
                onUseDefaults={() => {
                  handleChange('checkInTime', '12:00');
                }}
              />
            </FormSectionDisclosure>

            <FormSectionDisclosure
              title="主辦／場地備註"
              description="整場市集共用的固定資訊"
              icon={FileText}
              tone="pink"
            >
              <MarketNotesField
                idPrefix={FIELD_PREFIX}
                value={formData.notes || ''}
                disabled={isSubmitting}
                onChange={value => handleChange('notes', value)}
              />
            </FormSectionDisclosure>
            </div>
          </div>

          {submitError && (
            <p className="mt-5 rounded-control border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-text" role="alert">
              {submitError}
            </p>
          )}
        </form>
      </FullScreenForm>

      <AppDialog
        open={showDraftCloseConfirm}
        onClose={() => setShowDraftCloseConfirm(false)}
        title="保留尚未完成的市集草稿？"
        description="可先離開，稍後再次新增市集時會接續目前內容。"
        size="sm"
        layer="critical"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setShowDraftCloseConfirm(false)}>
              繼續編輯
            </Button>
            <Button variant="secondary" onClick={handleKeepDraftAndClose}>
              保留草稿
            </Button>
            <Button variant="danger" onClick={handleDiscardDraftAndClose}>
              捨棄草稿
            </Button>
          </>
        )}
      >
        <p className="text-sm leading-6 text-muted-foreground">
          捨棄後會清除此裝置上的內容；已同步的其他資料不受影響。
        </p>
      </AppDialog>
    </>
  );
}
